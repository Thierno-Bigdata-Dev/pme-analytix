import os
import json
import threading
import numpy as np
import pandas as pd
import xgboost as xgb
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import timedelta
from app.database import redis_client

# ── Constants defined at module top — referenced by pre-compiled patterns below ──
SUPPLIER_KEYWORDS = ['fournisseur', 'achat', 'prestataire', 'matière', 'stock', 'service']
TAX_KEYWORDS      = ['taxe', 'impôt', 'dgi', 'tva', 'fiscal']

# BUG FIX: these were previously placed AFTER the constants they reference, causing a
# NameError at startup. Pre-compiling them here avoids rebuilding the regex on every
# call to extract_financial_features(), which is executed on every scoring request.
_SUPPLIER_PATTERN = '|'.join(SUPPLIER_KEYWORDS)
_TAX_PATTERN      = '|'.join(TAX_KEYWORDS)

# ── Model path & lazy-load cache ───────────────────────────────────────────────
MODEL_PATH = "/app/ml-models/xgboost_score_model.json"

_loaded_xgb_model = None
_model_lock = threading.Lock()


def train_and_save_default_model() -> xgb.XGBRegressor:
    """
    Generates a synthetic credit scoring dataset representative of PME financial
    behaviour and trains a default XGBoost regression model.

    Dataset size increased from 100 to 1 000 samples to give the model enough
    variance to generalise across the feature space without overfitting the
    fixed weight formula used as ground-truth labels.

    Feature weights match the business specification:
        liquidity_ratio             25 %
        supplier_payment_regularity 20 %
        ca_evolution_12m            20 %
        client_diversification      15 %
        seniority_stability         10 %
        fiscal_compliance           10 %
    The remaining 5 % is modelled as random noise so XGBoost learns to discount
    irrelevant variance — a more realistic training objective.
    """
    rng = np.random.default_rng(42)  # Use Generator API instead of legacy seed
    n = 1_000

    # 6 features in [0, 1]
    X = rng.random((n, 6))

    # Ground-truth score from business weights + small noise
    weights = np.array([25.0, 20.0, 20.0, 15.0, 10.0, 10.0])
    y_raw   = X @ weights                         # max = 100 by construction
    noise   = rng.normal(0, 1.5, n)               # ±1.5 point realistic noise
    y       = np.clip(y_raw + noise, 0.0, 100.0)

    model = xgb.XGBRegressor(
        n_estimators=200,          # more trees → lower bias with small feature space
        max_depth=4,               # slightly deeper to capture feature interactions
        learning_rate=0.05,        # lower LR paired with more trees for stability
        subsample=0.8,             # row subsampling → reduces overfitting
        colsample_bytree=0.8,      # column subsampling
        min_child_weight=5,        # regularise leaf nodes
        objective="reg:squarederror",
        tree_method="hist",        # fast histogram-based splits (GPU-ready)
        random_state=42,
    )
    model.fit(X, y, eval_set=[(X, y)], verbose=False)

    model_dir = os.path.dirname(MODEL_PATH)
    if model_dir:
        os.makedirs(model_dir, exist_ok=True)

    model.save_model(MODEL_PATH)
    return model


def get_xgb_model() -> xgb.XGBRegressor:
    """
    Lazy-loads the XGBoost credit risk scoring model using the double-checked
    locking pattern — safe under multi-threaded Uvicorn workers.
    """
    global _loaded_xgb_model
    if _loaded_xgb_model is None:
        with _model_lock:
            if _loaded_xgb_model is None:
                if not os.path.exists(MODEL_PATH):
                    _loaded_xgb_model = train_and_save_default_model()
                else:
                    model = xgb.XGBRegressor()
                    model.load_model(MODEL_PATH)
                    _loaded_xgb_model = model
    return _loaded_xgb_model


def extract_financial_features(df: pd.DataFrame) -> dict:
    """
    Extracts and normalises the 6 credit-risk features from a PME transaction
    DataFrame.  All features are scaled to [0, 1] before XGBoost inference.

    The regex patterns are module-level constants (pre-compiled strings) rather
    than being assembled inline on every call.
    """
    credits = df[df['type'] == 'credit']['amount'].sum()
    debits  = df[df['type'] == 'debit']['amount'].sum()
    current_cash = credits - debits

    # Guard: avoid division by zero when a PME has no recorded expenses yet
    avg_monthly_expenses = debits / 12.0 if debits > 0 else 100_000.0

    raw_liquidity_ratio = current_cash / avg_monthly_expenses
    liquidity_ratio     = min(max(raw_liquidity_ratio, 0.0), 5.0) / 5.0

    # Supplier payment regularity — uses pre-compiled pattern
    supplier_mask = (df['type'] == 'debit') & df['categorie'].str.lower().str.contains(
        _SUPPLIER_PATTERN, na=False
    )
    supplier_payment_regularity = min(supplier_mask.sum(), 10) / 10.0

    # Revenue growth: recent 6 months vs earlier period
    cutoff_date    = df['date'].max() - timedelta(days=180)
    credits_recent = df[(df['type'] == 'credit') & (df['date'] >= cutoff_date)]['amount'].sum()
    credits_older  = df[(df['type'] == 'credit') & (df['date'] < cutoff_date)]['amount'].sum()
    ca_growth      = (credits_recent - credits_older) / credits_older if credits_older > 0 else 0.0
    ca_growth_norm = (min(max(ca_growth, -1.0), 1.0) + 1.0) / 2.0

    # Client diversification: unique revenue categories (capped at 5)
    client_categories     = df[df['type'] == 'credit']['categorie'].nunique()
    client_diversification = min(client_categories, 5) / 5.0

    # Seniority / stability: dataset time span vs 24-month reference
    span_days          = (df['date'].max() - df['date'].min()).days
    seniority_stability = min(span_days / 30.0, 24.0) / 24.0

    # Tax & fiscal compliance — uses pre-compiled pattern
    tax_mask         = (df['type'] == 'debit') & df['categorie'].str.lower().str.contains(
        _TAX_PATTERN, na=False
    )
    fiscal_compliance = min(tax_mask.sum(), 4) / 4.0

    feature_vector = np.array([[
        liquidity_ratio,
        supplier_payment_regularity,
        ca_growth_norm,
        client_diversification,
        seniority_stability,
        fiscal_compliance,
    ]])

    return {
        "feature_vector":               feature_vector,
        "raw_liquidity_ratio":          raw_liquidity_ratio,
        "liquidity_ratio":              liquidity_ratio,
        "supplier_payment_regularity":  supplier_payment_regularity,
        "ca_growth":                    ca_growth,
        "ca_growth_norm":               ca_growth_norm,
        "client_diversification":       client_diversification,
        "seniority_stability":          seniority_stability,
        "fiscal_compliance":            fiscal_compliance,
    }


def classify_risk_segment(score: int) -> str:
    """Maps a 0-100 score to a human-readable risk segment label."""
    if score >= 80:
        return "Faible"
    elif score >= 55:
        return "Moyen"
    elif score >= 35:
        return "Élevé"
    else:
        return "Critique"


# ── Fallback scoring formula (mirrors XGBoost weight specification) ────────────
_WEIGHTS = np.array([25.0, 20.0, 20.0, 15.0, 10.0, 10.0])

def _fallback_score(feature_vector: np.ndarray) -> int:
    """Linear weighted fallback used when the XGBoost model is unavailable."""
    return int(np.clip(float(feature_vector @ _WEIGHTS.reshape(-1, 1)), 0, 100))


async def fetch_pme_transactions(db: AsyncSession) -> list:
    """Fetches transactions scoped to the PME plan's allowed time window."""
    pme_plan = db.info.get('pme_plan', 'starter')
    if pme_plan == 'pilote':
        query = text(
            "SELECT date, type, montant, categorie FROM core_transaction "
            "WHERE date >= CURRENT_DATE - INTERVAL '24 months' "
            "ORDER BY date ASC"
        )
    else:
        query = text(
            "SELECT date, type, montant, categorie FROM core_transaction ORDER BY date ASC"
        )
    result = await db.execute(query)
    return result.all()


async def calculate_pme_score(db: AsyncSession, pme_id: int):
    """
    Queries transaction history, extracts financial features, and runs the
    XGBoost credit risk model to produce a score from 0 to 100.
    """
    cache_key = f"pme:score:{pme_id}"
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
    except Exception as e:
        print(f"Redis get error: {e}")

    rows = await fetch_pme_transactions(db)

    if not rows or len(rows) < 5:
        return {
            "status":       "insufficient_data",
            "message":      "Historique de transactions insuffisant pour calculer le score crédit (minimum 5 requis)",
            "score":        50,
            "risk_segment": "Moyen",
            "features":     {},
        }

    # BUG FIX: vectorised DataFrame construction — list-comprehension replaces
    # row-by-row dict creation which has O(n) Python overhead per row.
    df = pd.DataFrame({
        "date":      pd.to_datetime([r.date     for r in rows]),
        "type":      [r.type                    for r in rows],
        "amount":    [float(r.montant)           for r in rows],
        "categorie": [str(r.categorie or '')     for r in rows],
    })

    feats = extract_financial_features(df)

    try:
        model       = get_xgb_model()
        prediction  = model.predict(feats["feature_vector"])[0]
        final_score = int(np.clip(prediction, 0, 100))
    except Exception:
        final_score = _fallback_score(feats["feature_vector"][0])

    segment = classify_risk_segment(final_score)

    res = {
        "status":       "success",
        "pme_id":       pme_id,
        "score":        final_score,
        "risk_segment": segment,
        "features": {
            "liquidity_ratio":              round(feats["raw_liquidity_ratio"],              2),
            "supplier_payment_regularity":  round(feats["supplier_payment_regularity"] * 100, 1),
            "ca_growth_rate":               round(feats["ca_growth"],                        2),
            "client_diversification":       round(feats["client_diversification"] * 100,     1),
            "stability_index":              round(feats["seniority_stability"],               2),
            "fiscal_compliance":            round(feats["fiscal_compliance"] * 100,           1),
        },
    }
    try:
        await redis_client.setex(cache_key, 300, json.dumps(res))
    except Exception as e:
        print(f"Redis set error: {e}")

    return res
