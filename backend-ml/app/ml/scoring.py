import os
import json
import numpy as np
import pandas as pd
import xgboost as xgb
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import timedelta
from app.database import redis_client

MODEL_PATH = "/app/ml-models/xgboost_score_model.json"

def train_and_save_default_model():
    """
    Simulates a synthetic credit scoring dataset for PMEs to train and save
    a default XGBoost model on CPU aligned with specification weights.
    """
    np.random.seed(42)
    # 6 features: [liquidity_ratio, supplier_payment_regularity, ca_evolution_12m, client_diversification, seniority_stability, fiscal_compliance]
    X = np.random.rand(100, 6)
    
    # Target score: 0 to 100 based on weighted components
    y = X[:, 0]*25 + X[:, 1]*20 + X[:, 2]*20 + X[:, 3]*15 + X[:, 4]*10 + X[:, 5]*10
    y = np.clip(y * 100 / y.max() if y.max() > 0 else 50, 0, 100)
    
    model = xgb.XGBRegressor(
        n_estimators=50,
        max_depth=3,
        learning_rate=0.1,
        objective="reg:squarederror",
        tree_method="hist"
    )
    model.fit(X, y)
    
    model_dir = os.path.dirname(MODEL_PATH)
    if model_dir:
        os.makedirs(model_dir, exist_ok=True)
        
    model.save_model(MODEL_PATH)
    return model

_loaded_xgb_model = None

def get_xgb_model():
    """
    Lazy loads the XGBoost credit risk scoring model in memory to prevent redundant disk read operations.
    """
    global _loaded_xgb_model
    if _loaded_xgb_model is None:
        if not os.path.exists(MODEL_PATH):
            _loaded_xgb_model = train_and_save_default_model()
        else:
            model = xgb.XGBRegressor()
            model.load_model(MODEL_PATH)
            _loaded_xgb_model = model
    return _loaded_xgb_model


async def calculate_pme_score(db: AsyncSession, pme_id: int):
    """
    Queries transaction history for a PME, computes key financial features,
    and runs the XGBoost credit risk model to output a score from 0-100.
    """
    cache_key = f"pme:score:{pme_id}"
    try:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
    except Exception as e:
        print(f"Redis get error: {e}")

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
    
    if not rows or len(rows) < 5:
        return {
            "status": "insufficient_data",
            "message": "Historique de transactions insuffisant pour calculer le score crédit (minimum 5 requis)",
            "score": 50,
            "risk_segment": "Moyen",
            "features": {}
        }
        
    df = pd.DataFrame([{"date": r.date, "type": r.type, "amount": float(r.montant), "categorie": str(r.categorie or '')} for r in rows])
    df['date'] = pd.to_datetime(df['date'])
    
    # 1. Ratio de liquidité immédiate (25%)
    credits = df[df['type'] == 'credit']['amount'].sum()
    debits = df[df['type'] == 'debit']['amount'].sum()
    current_cash = credits - debits
    avg_monthly_expenses = debits / 12.0 if debits > 0 else 100000.0
    raw_liquidity_ratio = current_cash / avg_monthly_expenses
    liquidity_ratio = min(max(raw_liquidity_ratio, 0.0), 5.0) / 5.0
    
    # 2. Régularité des paiements fournisseurs (20%)
    supplier_keywords = ['fournisseur', 'achat', 'prestataire', 'matière', 'stock', 'service']
    supplier_txs = df[(df['type'] == 'debit') & df['categorie'].str.lower().str.contains('|'.join(supplier_keywords))]
    supplier_payment_regularity = min(len(supplier_txs), 10) / 10.0
    
    # 3. Évolution du CA sur 12 mois (20%)
    cutoff_date = df['date'].max() - timedelta(days=180)
    credits_recent = df[(df['type'] == 'credit') & (df['date'] >= cutoff_date)]['amount'].sum()
    credits_older = df[(df['type'] == 'credit') & (df['date'] < cutoff_date)]['amount'].sum()
    ca_growth = (credits_recent - credits_older) / credits_older if credits_older > 0 else 0.0
    ca_growth = min(max(ca_growth, -1.0), 1.0)
    ca_growth_norm = (ca_growth + 1.0) / 2.0
    
    # 4. Diversification des clients (15%)
    client_categories = df[df['type'] == 'credit']['categorie'].nunique()
    client_diversification = min(client_categories, 5) / 5.0
    
    # 5. Ancienneté et stabilité (10%)
    span_days = (df['date'].max() - df['date'].min()).days
    seniority_stability = min(span_days / 30.0, 24.0) / 24.0
    
    # 6. Conformité fiscale déclarée (10%)
    tax_keywords = ['taxe', 'impôt', 'dgi', 'tva', 'fiscal']
    tax_txs = df[(df['type'] == 'debit') & df['categorie'].str.lower().str.contains('|'.join(tax_keywords))]
    fiscal_compliance = min(len(tax_txs), 4) / 4.0
    
    features = np.array([[
        liquidity_ratio, 
        supplier_payment_regularity, 
        ca_growth_norm, 
        client_diversification, 
        seniority_stability, 
        fiscal_compliance
    ]])
    
    try:
        model = get_xgb_model()
        prediction = model.predict(features)[0]
        final_score = int(np.clip(prediction, 0, 100))
    except Exception as e:
        final_score = int(
            liquidity_ratio * 25 + 
            supplier_payment_regularity * 20 + 
            ca_growth_norm * 20 + 
            client_diversification * 15 + 
            seniority_stability * 10 + 
            fiscal_compliance * 10
        )
    
    if final_score >= 80:
        segment = "Faible"
    elif final_score >= 55:
        segment = "Moyen"
    elif final_score >= 35:
        segment = "Élevé"
    else:
        segment = "Critique"
        
    res = {
        "status": "success",
        "pme_id": pme_id,
        "score": final_score,
        "risk_segment": segment,
        "features": {
            "liquidity_ratio": round(raw_liquidity_ratio, 2),
            "supplier_payment_regularity": round(supplier_payment_regularity * 100, 1),
            "ca_growth_rate": round(ca_growth, 2),
            "client_diversification": round(client_diversification * 100, 1),
            "stability_index": round(seniority_stability, 2),
            "fiscal_compliance": round(fiscal_compliance * 100, 1)
        }
    }
    try:
        redis_client.setex(cache_key, 300, json.dumps(res))
    except Exception as e:
        print(f"Redis set error: {e}")
    return res
