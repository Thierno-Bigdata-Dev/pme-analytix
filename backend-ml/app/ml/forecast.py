import json
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from prophet import Prophet
from datetime import datetime
from app.database import redis_client

async def predict_treasury(db: AsyncSession, pme_id: int):
    """
    Fetches the running balance history of the PME, fits a Prophet time-series
    forecasting model, and returns a 90-day cash flow projection with confidence bounds.
    """
    cache_key = f"pme:forecast:{pme_id}"
    try:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
    except Exception as e:
        print(f"Redis get error: {e}")

    # 1. Fetch transaction history from PostgreSQL (tenant schema is pre-configured on session)
    pme_plan = db.info.get('pme_plan', 'starter')
    if pme_plan == 'pilote':
        result = await db.execute(text(
            "SELECT date, type, montant FROM core_transaction "
            "WHERE date >= CURRENT_DATE - INTERVAL '24 months' "
            "ORDER BY date ASC"
        ))
    else:
        result = await db.execute(text("SELECT date, type, montant FROM core_transaction ORDER BY date ASC"))
    rows = result.all()
    
    if not rows or len(rows) < 10:
        return {
            "status": "insufficient_data",
            "message": "Historique de transactions insuffisant pour entraîner le modèle prédictif (minimum 10 transactions requises)",
            "forecast": []
        }
        
    # 2. Structure data into pandas DataFrame
    data = []
    for r in rows:
        amount = float(r.montant) if r.type == 'credit' else -float(r.montant)
        data.append({"date": r.date, "amount": amount})
        
    df = pd.DataFrame(data)
    
    # 3. Calculate running daily balance
    # Group by date to aggregate multiple transactions on the same day
    df_daily = df.groupby('date')['amount'].sum().reset_index()
    df_daily = df_daily.sort_values('date')
    
    # Cumulative sum to calculate daily treasury level
    df_daily['balance'] = df_daily['amount'].cumsum()
    
    # Format columns specifically for Prophet: 'ds' (datestamp) and 'y' (target variable)
    df_prophet = df_daily.rename(columns={'date': 'ds', 'balance': 'y'})
    df_prophet['ds'] = pd.to_datetime(df_prophet['ds'])
    
    # Current cash balance
    current_balance = float(df_prophet['y'].iloc[-1])
    
    # 4. Train Prophet model
    model = Prophet(
        daily_seasonality=False,
        weekly_seasonality=True,
        yearly_seasonality=True,
        interval_width=0.95  # Predict 95% confidence interval
    )
    # Fit the model
    model.fit(df_prophet[['ds', 'y']])
    
    # 5. Make predictions for the next 90 days
    future = model.make_future_dataframe(periods=90, include_history=False)
    forecast = model.predict(future)
    
    # 6. Format the forecast series into clean JSON-serializable structures
    forecast_results = []
    for idx, row in forecast.iterrows():
        yhat = float(row['yhat'])
        yhat_lower_95 = float(row['yhat_lower'])
        yhat_upper_95 = float(row['yhat_upper'])
        
        # Scale 95% confidence interval width to 80% width using Z-score ratio: 1.282 / 1.960
        scale_factor = 1.282 / 1.960
        half_width_95 = (yhat_upper_95 - yhat_lower_95) / 2.0
        half_width_80 = half_width_95 * scale_factor
        
        yhat_lower_80 = yhat - half_width_80
        yhat_upper_80 = yhat + half_width_80
        
        forecast_results.append({
            "date": row['ds'].strftime("%Y-%m-%d"),
            "value": round(yhat, 2),
            "lower_80": round(yhat_lower_80, 2),
            "upper_80": round(yhat_upper_80, 2),
            "lower_95": round(yhat_lower_95, 2),
            "upper_95": round(yhat_upper_95, 2),
        })
        
    res = {
        "status": "success",
        "pme_id": pme_id,
        "current_balance": round(current_balance, 2),
        "forecast_days": 90,
        "forecast": forecast_results
    }
    try:
        redis_client.setex(cache_key, 300, json.dumps(res))
    except Exception as e:
        print(f"Redis set error: {e}")
    return res
