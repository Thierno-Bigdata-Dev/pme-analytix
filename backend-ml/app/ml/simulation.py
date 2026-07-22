# pyright: reportMissingImports=false
import numpy as np
import pandas as pd
import xgboost as xgb
from prophet import Prophet
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import timedelta
from app.ml.scoring import (
    get_xgb_model,
    extract_financial_features,
    classify_risk_segment,
    _fallback_score,
    _SUPPLIER_PATTERN,
    _TAX_PATTERN,
    SUPPLIER_KEYWORDS,
    TAX_KEYWORDS,
)
from app.ml.forecast import predict_treasury

# Pre-computed constant reused from forecast.py
_CI_SCALE_FACTOR = 1.282 / 1.960


async def run_strategic_simulation(
    db: AsyncSession,
    pme_id: int,
    marketing_budget: float,
    recruitment_cost: float,
    new_markets: bool,
    revenue_growth_rate: float,
    expense_inflation_rate: float,
):
    """
    Simulates the impact of strategic business decisions on:
      1. The PME's XGBoost credit score (base vs simulated)
      2. The PME's 90-day Prophet treasury forecast (base vs simulated)

    Returns a structured dict comparing current vs projected metrics.
    """
    # 1. Fetch base transaction history (scoped to plan)
    pme_plan = db.info.get('pme_plan', 'starter')
    if pme_plan == 'pilote':
        result = await db.execute(text(
            "SELECT date, type, montant, categorie FROM core_transaction "
            "WHERE date >= CURRENT_DATE - INTERVAL '24 months' "
            "ORDER BY date ASC"
        ))
    else:
        result = await db.execute(text(
            "SELECT date, type, montant, categorie FROM core_transaction ORDER BY date ASC"
        ))
    rows = result.all()

    if not rows or len(rows) < 10:
        return {
            "status":           "insufficient_data",
            "message":          "Historique insuffisant pour la simulation (minimum 10 transactions).",
            "base_score":       50,
            "simulated_score":  50,
            "base_forecast":    [],
            "simulated_forecast": [],
        }

    # BUG FIX: vectorised DataFrame build instead of per-row dict list-comprehension
    df_raw = pd.DataFrame({
        "date":      pd.to_datetime([r.date              for r in rows]),
        "type":      [r.type                             for r in rows],
        "amount":    [float(r.montant)                   for r in rows],
        "categorie": [str(r.categorie or '')             for r in rows],
    })

    # ── 2. Base metrics ──────────────────────────────────────────────────────
    base_credits = df_raw[df_raw['type'] == 'credit']['amount'].sum()
    base_debits  = df_raw[df_raw['type'] == 'debit']['amount'].sum()
    base_cash    = base_credits - base_debits
    base_span_days   = (df_raw['date'].max() - df_raw['date'].min()).days
    base_monthly_ca  = base_credits / (base_span_days / 30.0) if base_span_days > 30 else base_credits

    # Base Prophet forecast (reads from Redis cache when available)
    base_forecast_res  = await predict_treasury(db, pme_id)
    base_forecast_list = base_forecast_res.get("forecast", [])

    # Extract base features using the shared, tested function
    base_feats = extract_financial_features(df_raw)

    # ── 3. Apply strategic adjustments to a copy of the history ─────────────
    df_sim = df_raw.copy()
    df_sim.loc[df_sim['type'] == 'credit', 'amount'] *= (1.0 + revenue_growth_rate)
    df_sim.loc[df_sim['type'] == 'debit',  'amount'] *= (1.0 + expense_inflation_rate)

    # Cumulative daily balance for Prophet
    df_daily  = df_sim.groupby('date', sort=True)['amount'].sum()
    df_prophet = pd.DataFrame({
        'ds': pd.to_datetime(df_daily.index),
        'y':  df_daily.cumsum().values,
    })
    sim_current_balance = float(df_prophet['y'].iloc[-1])

    # Fit Prophet on simulated history
    sim_model = Prophet(
        daily_seasonality=False,
        weekly_seasonality=True,
        yearly_seasonality=True,
        interval_width=0.95,
    )
    sim_model.fit(df_prophet)
    future   = sim_model.make_future_dataframe(periods=90, include_history=False)
    forecast = sim_model.predict(future)

    # ── 4. Apply investment cash flows to the 90-day simulated forecast ──────
    total_invest = marketing_budget + recruitment_cost + (3_000_000.0 if new_markets else 0.0)

    # Expected monthly revenue increments from each initiative
    mkt_incr_monthly     = (marketing_budget  * 3.5) / 12.0
    recruit_incr_monthly = (recruitment_cost  * 1.8) / 12.0
    new_mkt_incr_monthly = base_monthly_ca * 0.30 if new_markets else 0.0

    # BUG FIX: replaced iterrows() (very slow O(n) Python loop) with vectorised
    # NumPy operations.  The ramp-up logic uses integer day arrays.
    n_days    = len(forecast)
    day_index = np.arange(1, n_days + 1)           # 1 … 90
    month_idx = np.where(day_index <= 30, 1, np.where(day_index <= 60, 2, 3))

    outflow_per_day = total_invest / 90.0           # constant daily outflow

    mkt_factor     = np.minimum(1.0, month_idx / 4.0)
    recruit_factor = np.where(month_idx <= 2, 0.0, np.minimum(1.0, (month_idx - 2.0) / 3.0))
    mkt_exp_factor = np.minimum(1.0, month_idx / 6.0) if new_markets else np.zeros(n_days)

    inflow_per_day = (
        (mkt_incr_monthly     * mkt_factor     / 30.0) +
        (recruit_incr_monthly * recruit_factor / 30.0) +
        (new_mkt_incr_monthly * mkt_exp_factor / 30.0)
    )

    net_daily         = inflow_per_day - outflow_per_day
    cumulative_adjust = np.cumsum(net_daily)           # shape (90,)

    # Extract forecast columns as NumPy arrays (avoids iterrows overhead)
    yhat_base  = forecast['yhat'].to_numpy()
    yhat_lower = forecast['yhat_lower'].to_numpy()
    yhat_upper = forecast['yhat_upper'].to_numpy()
    ds         = forecast['ds']

    yhat_sim       = yhat_base  + cumulative_adjust
    yhat_lower_sim = yhat_lower + cumulative_adjust
    yhat_upper_sim = yhat_upper + cumulative_adjust

    sim_forecast_results = [
        {
            "date":     ds.iat[i].strftime("%Y-%m-%d"),
            "value":    round(float(yhat_sim[i]),       2),
            "lower_95": round(float(yhat_lower_sim[i]), 2),
            "upper_95": round(float(yhat_upper_sim[i]), 2),
        }
        for i in range(n_days)
    ]

    # ── 5. Simulated credit score features ───────────────────────────────────
    sim_final_cash         = sim_current_balance + float(cumulative_adjust[-1])
    sim_credits            = df_sim[df_sim['type'] == 'credit']['amount'].sum()
    sim_debits             = df_sim[df_sim['type'] == 'debit']['amount'].sum()
    sim_avg_monthly_exp    = (sim_debits / 12.0) + (recruitment_cost / 12.0) + (marketing_budget / 12.0)
    sim_liquidity_ratio    = min(max(sim_final_cash / (sim_avg_monthly_exp if sim_avg_monthly_exp > 0 else 1.0), 0.0), 5.0) / 5.0

    cutoff_date        = df_sim['date'].max() - timedelta(days=180)
    sim_credits_recent = df_sim[(df_sim['type'] == 'credit') & (df_sim['date'] >= cutoff_date)]['amount'].sum()
    sim_credits_older  = df_sim[(df_sim['type'] == 'credit') & (df_sim['date'] < cutoff_date)]['amount'].sum()
    # Add incremental B2B revenue from all three initiatives over 3 months
    sim_credits_recent += (mkt_incr_monthly + recruit_incr_monthly + new_mkt_incr_monthly) * 3
    sim_ca_growth      = (sim_credits_recent - sim_credits_older) / sim_credits_older if sim_credits_older > 0 else 0.0
    sim_ca_growth_norm = (min(max(sim_ca_growth, -1.0), 1.0) + 1.0) / 2.0

    # Strategic Levers feature adjustments:
    # 1. New markets expansion improves client portfolio diversification (+0.25)
    sim_client_div = min(1.0, max(0.0, base_feats["client_diversification"] + (0.25 if new_markets else 0.0)))
    
    # 2. Liquidity level impacts supplier payment regularity
    sim_supplier_reg = min(1.0, max(0.0, base_feats["supplier_payment_regularity"] + (0.10 if sim_liquidity_ratio >= 0.5 else (-0.10 if sim_liquidity_ratio < 0.2 else 0.0))))

    sim_feature_vector = np.array([[
        sim_liquidity_ratio,
        sim_supplier_reg,
        sim_ca_growth_norm,
        sim_client_div,
        base_feats["seniority_stability"],
        base_feats["fiscal_compliance"],
    ]])

    # ── 6. Score both base and simulated with shared XGBoost model ───────────
    try:
        xgb_model      = get_xgb_model()
        base_score     = int(np.clip(xgb_model.predict(base_feats["feature_vector"])[0], 0, 100))
        sim_score      = int(np.clip(xgb_model.predict(sim_feature_vector)[0],            0, 100))
    except Exception:
        # Fallback: use the same linear weight formula as training labels
        base_score = _fallback_score(base_feats["feature_vector"][0])
        sim_score  = _fallback_score(sim_feature_vector[0])

    return {
        "status":   "success",
        "pme_id":   pme_id,
        "total_invest": total_invest,
        "payback_period": base_forecast_res.get("payback_period", "Plus de 12 mois"),
        "base": {
            "score":           base_score,
            "risk_segment":    classify_risk_segment(base_score),
            "current_balance": round(base_cash, 2),
            "forecast":        base_forecast_list,
        },
        "simulated": {
            "score":           sim_score,
            "risk_segment":    classify_risk_segment(sim_score),
            "current_balance": round(sim_final_cash, 2),
            "forecast":        sim_forecast_results,
        },
    }
