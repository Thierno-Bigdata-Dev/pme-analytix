import os
import numpy as np
import pandas as pd
import xgboost as xgb
from prophet import Prophet
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import timedelta, datetime
from app.ml.scoring import get_xgb_model, MODEL_PATH
from app.ml.forecast import predict_treasury

async def run_strategic_simulation(
    db: AsyncSession,
    pme_id: int,
    marketing_budget: float,
    recruitment_cost: float,
    new_markets: bool,
    revenue_growth_rate: float,
    expense_inflation_rate: float
):
    """
    Simulates the impact of business decisions and economic factors on:
    1. The PME's credit score (XGBoost)
    2. The PME's 90-day treasury forecast (Prophet)
    
    Returns a dictionary comparing base metrics against simulated metrics.
    """
    # 1. Fetch base PME transaction history
    pme_plan = db.info.get('pme_plan', 'starter')
    if pme_plan == 'pilote':
        result = await db.execute(text(
            "SELECT date, type, montant, categorie FROM core_transaction "
            "WHERE date >= CURRENT_DATE - INTERVAL '24 months' "
            "ORDER BY date ASC"
        ))
    else:
        result = await db.execute(text("SELECT date, type, montant, categorie FROM core_transaction ORDER BY date ASC"))
    rows = result.all()
    
    if not rows or len(rows) < 10:
        return {
            "status": "insufficient_data",
            "message": "Historique de transactions insuffisant pour lancer la simulation (minimum 10 transactions requises)",
            "base_score": 50,
            "simulated_score": 50,
            "base_forecast": [],
            "simulated_forecast": []
        }
        
    df_raw = pd.DataFrame([{"date": r.date, "type": r.type, "amount": float(r.montant), "categorie": str(r.categorie or '')} for r in rows])
    df_raw['date'] = pd.to_datetime(df_raw['date'])
    
    # 2. Get baseline metrics
    # Base score
    base_credits = df_raw[df_raw['type'] == 'credit']['amount'].sum()
    base_debits = df_raw[df_raw['type'] == 'debit']['amount'].sum()
    base_cash = base_credits - base_debits
    base_span_days = (df_raw['date'].max() - df_raw['date'].min()).days
    base_monthly_ca = base_credits / (base_span_days / 30.0) if base_span_days > 30 else base_credits
    
    # Run base forecast (via Prophet)
    base_forecast_res = await predict_treasury(db, pme_id)
    base_forecast_list = base_forecast_res.get("forecast", [])
    
    # Fit base score
    base_avg_monthly_expenses = base_debits / 12.0 if base_debits > 0 else 100000.0
    base_liquidity_ratio = min(max(base_cash / base_avg_monthly_expenses, 0.0), 5.0) / 5.0
    
    supplier_keywords = ['fournisseur', 'achat', 'prestataire', 'matière', 'stock', 'service']
    supplier_txs = df_raw[(df_raw['type'] == 'debit') & df_raw['categorie'].str.lower().str.contains('|'.join(supplier_keywords))]
    base_supplier_payment_regularity = min(len(supplier_txs), 10) / 10.0
    
    cutoff_date = df_raw['date'].max() - timedelta(days=180)
    credits_recent = df_raw[(df_raw['type'] == 'credit') & (df_raw['date'] >= cutoff_date)]['amount'].sum()
    credits_older = df_raw[(df_raw['type'] == 'credit') & (df_raw['date'] < cutoff_date)]['amount'].sum()
    ca_growth = (credits_recent - credits_older) / credits_older if credits_older > 0 else 0.0
    base_ca_growth_norm = (min(max(ca_growth, -1.0), 1.0) + 1.0) / 2.0
    
    client_categories = df_raw[df_raw['type'] == 'credit']['categorie'].nunique()
    base_client_diversification = min(client_categories, 5) / 5.0
    
    base_seniority_stability = min(base_span_days / 30.0, 24.0) / 24.0
    
    tax_keywords = ['taxe', 'impôt', 'dgi', 'tva', 'fiscal']
    tax_txs = df_raw[(df_raw['type'] == 'debit') & df_raw['categorie'].str.lower().str.contains('|'.join(tax_keywords))]
    base_fiscal_compliance = min(len(tax_txs), 4) / 4.0
    
    base_features = np.array([[
        base_liquidity_ratio, 
        base_supplier_payment_regularity, 
        base_ca_growth_norm, 
        base_client_diversification, 
        base_seniority_stability, 
        base_fiscal_compliance
    ]])
    
    # 3. Simulate adjustments on historical dataframe
    df_sim = df_raw.copy()
    df_sim.loc[df_sim['type'] == 'credit', 'amount'] = df_sim.loc[df_sim['type'] == 'credit', 'amount'] * (1.0 + revenue_growth_rate)
    df_sim.loc[df_sim['type'] == 'debit', 'amount'] = df_sim.loc[df_sim['type'] == 'debit', 'amount'] * (1.0 + expense_inflation_rate)
    
    # Cumulative daily balance for Prophet
    df_daily = df_sim.groupby('date')['amount'].sum().reset_index().sort_values('date')
    df_daily['balance'] = df_daily['amount'].cumsum()
    df_prophet = df_daily.rename(columns={'date': 'ds', 'balance': 'y'})
    
    sim_current_balance = float(df_prophet['y'].iloc[-1])
    
    # Fit Prophet on simulated history
    model = Prophet(daily_seasonality=False, weekly_seasonality=True, yearly_seasonality=True, interval_width=0.95)
        
    model.fit(df_prophet[['ds', 'y']])
    future = model.make_future_dataframe(periods=90, include_history=False)
    forecast = model.predict(future)
    
    # Apply investment outflows and dynamic revenue inflows to 90 days forecast
    total_invest = marketing_budget + recruitment_cost + (3000000.0 if new_markets else 0.0)
    
    # Monthly increments
    mkt_incr_ca_monthly = (marketing_budget * 3.5) / 12.0
    recruit_incr_ca_monthly = (recruitment_cost * 1.8) / 12.0
    new_mkt_incr_ca_monthly = base_monthly_ca * 0.30 if new_markets else 0.0
    
    sim_forecast_results = []
    cumulative_strategic_adjustment = 0.0
    
    for idx, row in forecast.iterrows():
        day_index = idx + 1  # 1 to 90
        # Determine month (1, 2, 3)
        m = 1 if day_index <= 30 else (2 if day_index <= 60 else 3)
        
        # Outflow per day (investments amortized over 90 days)
        outflow_day = total_invest / 90.0
        
        # Inflow per day (depends on training factors)
        mkt_factor = min(1.0, m / 4.0)
        recruit_factor = 0.0 if m <= 2 else min(1.0, (m - 2.0) / 3.0)
        mkt_exp_factor = min(1.0, m / 6.0) if new_markets else 0.0
        
        inflow_day = (
            (mkt_incr_ca_monthly * mkt_factor / 30.0) +
            (recruit_incr_ca_monthly * recruit_factor / 30.0) +
            (new_mkt_incr_ca_monthly * mkt_exp_factor / 30.0)
        )
        
        cumulative_strategic_adjustment += (inflow_day - outflow_day)
        
        yhat = float(row['yhat']) + cumulative_strategic_adjustment
        yhat_lower = float(row['yhat_lower']) + cumulative_strategic_adjustment
        yhat_upper = float(row['yhat_upper']) + cumulative_strategic_adjustment
        
        sim_forecast_results.append({
            "date": row['ds'].strftime("%Y-%m-%d"),
            "value": round(yhat, 2),
            "lower_95": round(yhat_lower, 2),
            "upper_95": round(yhat_upper, 2),
        })
        
    # Calculate simulated credit score features at day 90
    sim_final_cash = sim_current_balance + cumulative_strategic_adjustment
    sim_credits = df_sim[df_sim['type'] == 'credit']['amount'].sum()
    sim_debits = df_sim[df_sim['type'] == 'debit']['amount'].sum()
    
    # We include simulated recruitment salary/costs inside simulated avg monthly expenses
    sim_avg_monthly_expenses = (sim_debits / 12.0) * (1.0 + expense_inflation_rate) + (recruitment_cost / 12.0)
    sim_liquidity_ratio = min(max(sim_final_cash / sim_avg_monthly_expenses, 0.0), 5.0) / 5.0
    
    # CA growth with simulated rate & final additions
    cutoff_date = df_sim['date'].max() - timedelta(days=180)
    sim_credits_recent = df_sim[(df_sim['type'] == 'credit') & (df_sim['date'] >= cutoff_date)]['amount'].sum()
    sim_credits_older = df_sim[(df_sim['type'] == 'credit') & (df_sim['date'] < cutoff_date)]['amount'].sum()
    # Add simulated B2B growth
    sim_credits_recent += (mkt_incr_ca_monthly * 3) + (recruit_incr_ca_monthly * 3) + (new_mkt_incr_ca_monthly * 3)
    sim_ca_growth = (sim_credits_recent - sim_credits_older) / sim_credits_older if sim_credits_older > 0 else 0.0
    sim_ca_growth_norm = (min(max(sim_ca_growth, -1.0), 1.0) + 1.0) / 2.0
    
    sim_features = np.array([[
        sim_liquidity_ratio,
        base_supplier_payment_regularity,
        sim_ca_growth_norm,
        base_client_diversification,
        base_seniority_stability,
        base_fiscal_compliance
    ]])
    
    # 4. Load scoring model and evaluate both base and simulated
    try:
        model = get_xgb_model()
        base_score_pred = model.predict(base_features)[0]
        sim_score_pred = model.predict(sim_features)[0]
        
        base_score = int(np.clip(base_score_pred, 0, 100))
        sim_score = int(np.clip(sim_score_pred, 0, 100))
    except Exception:
        # Fallback to linear weights if XGBoost fails
        base_score = int(
            base_liquidity_ratio * 25 + 
            base_supplier_payment_regularity * 20 + 
            base_ca_growth_norm * 20 + 
            base_client_diversification * 15 + 
            base_seniority_stability * 10 + 
            base_fiscal_compliance * 10
        )
        sim_score = int(
            sim_liquidity_ratio * 25 + 
            base_supplier_payment_regularity * 20 + 
            sim_ca_growth_norm * 20 + 
            base_client_diversification * 15 + 
            base_seniority_stability * 10 + 
            base_fiscal_compliance * 10
        )
        
    def get_segment(score_val):
        if score_val >= 80:
            return "Faible"
        elif score_val >= 55:
            return "Moyen"
        elif score_val >= 35:
            return "Élevé"
        else:
            return "Critique"
            
    base_segment = get_segment(base_score)
    sim_segment = get_segment(sim_score)
    
    return {
        "status": "success",
        "pme_id": pme_id,
        "total_invest": total_invest,
        "payback_period": base_forecast_res.get("payback_period", "Plus de 12 mois"),
        "base": {
            "score": base_score,
            "risk_segment": base_segment,
            "current_balance": round(base_cash, 2),
            "forecast": base_forecast_list
        },
        "simulated": {
            "score": sim_score,
            "risk_segment": sim_segment,
            "current_balance": round(sim_final_cash, 2),
            "forecast": sim_forecast_results
        }
    }
