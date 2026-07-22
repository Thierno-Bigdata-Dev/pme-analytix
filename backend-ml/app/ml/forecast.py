import json
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from prophet import Prophet
from app.database import redis_client

# Pre-computed constant: Z-score scale factor 80% CI from 95% CI
_CI_SCALE_FACTOR = 1.282 / 1.960


async def predict_treasury(db: AsyncSession, pme_id: int):
    """
    Fetches the running balance history of the PME, fits a Prophet time-series
    forecasting model, and returns a 90-day cash flow projection with confidence bounds.
    """
    cache_key = f"pme:forecast:{pme_id}"

    # PERF FIX: redis_client is now async — await the call instead of blocking the event loop.
    try:
        cached_data = await redis_client.get(cache_key)
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
        result = await db.execute(text(
            "SELECT date, type, montant FROM core_transaction ORDER BY date ASC"
        ))
    rows = result.all()

    if not rows or len(rows) < 10:
        return {
            "status": "insufficient_data",
            "message": "Historique de transactions insuffisant pour entraîner le modèle prédictif (minimum 10 transactions requises)",
            "forecast": []
        }

    # 2. Build DataFrame with vectorised sign application.
    # PERF FIX: list-comprehension is significantly faster than a Python for-loop
    # with repeated dict creation and list.append() calls (avoids repeated
    # attribute lookups and function call overhead per row).
    amounts = [float(r.montant) if r.type == 'credit' else -float(r.montant) for r in rows]
    dates   = [r.date for r in rows]

    df = pd.DataFrame({"date": dates, "amount": amounts})

    # 3. Running daily balance
    df_daily = df.groupby('date', sort=True)['amount'].sum()
    df_prophet = pd.DataFrame({
        'ds': pd.to_datetime(df_daily.index),
        'y':  df_daily.cumsum().values
    })

    current_balance = float(df_prophet['y'].iloc[-1])

    # 4. Fit Prophet
    model = Prophet(
        daily_seasonality=False,
        weekly_seasonality=True,
        yearly_seasonality=True,
        interval_width=0.95
    )
    model.fit(df_prophet)

    # 5. Predict 90 days
    future   = model.make_future_dataframe(periods=90, include_history=False)
    forecast = model.predict(future)

    # 6. PERF FIX: replace iterrows() (very slow — O(n) Python overhead per row)
    # with direct vectorised column access. Builds the entire result with
    # NumPy array operations; only a single pass through Python for the final
    # dict assembly, which is unavoidable for JSON serialisation.
    yhat       = forecast['yhat'].to_numpy()
    yhat_lower = forecast['yhat_lower'].to_numpy()
    yhat_upper = forecast['yhat_upper'].to_numpy()
    ds         = forecast['ds']

    half_width_95 = (yhat_upper - yhat_lower) / 2.0
    half_width_80 = half_width_95 * _CI_SCALE_FACTOR
    lower_80 = yhat - half_width_80
    upper_80 = yhat + half_width_80

    forecast_results = [
        {
            "date":      ds.iat[i].strftime("%Y-%m-%d"),
            "value":     round(float(yhat[i]),       2),
            "lower_80":  round(float(lower_80[i]),   2),
            "upper_80":  round(float(upper_80[i]),   2),
            "lower_95":  round(float(yhat_lower[i]), 2),
            "upper_95":  round(float(yhat_upper[i]), 2),
        }
        for i in range(len(yhat))
    ]

    res = {
        "status":        "success",
        "pme_id":        pme_id,
        "current_balance": round(current_balance, 2),
        "forecast_days": 90,
        "forecast":      forecast_results,
    }

    # PERF FIX: async Redis write — does not block event loop.
    try:
        await redis_client.setex(cache_key, 300, json.dumps(res))
    except Exception as e:
        print(f"Redis set error: {e}")

    return res
