import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock
from app.main import app, get_tenant_db
from app.auth import get_current_user

# Create standard TestClient
client = TestClient(app)

# 1. Test Health and Root endpoints
def test_root_endpoint():
    response = client.get("/api/ml/")
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert "FastAPI" in response.json()["service"]

def test_health_check_endpoint():
    response = client.get("/api/ml/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

# 2. Test pricing plan verification logic
def test_starter_plan_blocked_from_forecast():
    # Setup dependency overrides for authentication
    app.dependency_overrides[get_current_user] = lambda: {
        "email": "dirigeant_starter@pme.sn",
        "pme_id": 1,
        "role": "dirigeant"
    }
    
    # Mock tenant database session to return plan = 'starter'
    mock_db = AsyncMock()
    mock_db.info = {"pme_plan": "starter"}
    
    app.dependency_overrides[get_tenant_db] = lambda: mock_db
    
    # Call predictions endpoint
    response = client.get("/api/ml/previsions/1/")
    assert response.status_code == 403
    assert "Votre plan actuel (Starter) ne vous permet pas d'accéder aux fonctionnalités d'intelligence artificielle" in response.json()["detail"]
    
    # Clean overrides
    app.dependency_overrides.clear()

def test_croissance_plan_allowed_for_forecast():
    # Setup dependency overrides for authentication
    app.dependency_overrides[get_current_user] = lambda: {
        "email": "dirigeant_croissance@pme.sn",
        "pme_id": 1,
        "role": "dirigeant"
    }
    
    # Mock tenant database session to return plan = 'croissance' and mock query results
    mock_db = AsyncMock()
    mock_db.info = {"pme_plan": "croissance"}
    
    # Mock transaction records returned from query
    mock_row_1 = MagicMock()
    mock_row_1.date = "2026-06-01"
    mock_row_1.type = "credit"
    mock_row_1.montant = "500000.00"
    
    mock_row_2 = MagicMock()
    mock_row_2.date = "2026-06-02"
    mock_row_2.type = "debit"
    mock_row_2.montant = "100000.00"
    
    mock_result = MagicMock()
    mock_result.all.return_type = [mock_row_1, mock_row_2]
    mock_db.execute.return_value = mock_result
    
    app.dependency_overrides[get_tenant_db] = lambda: mock_db
    
    # Mock forecast function to avoid full Prophet calculation in test
    import app.main as app_main
    original_predict = app_main.predict_treasury
    
    async def mock_predict(db_sess, pme_id):
        return {
            "status": "success",
            "current_balance": 400000.0,
            "forecast_days": 90,
            "forecast": []
        }
    
    app_main.predict_treasury = mock_predict
    
    try:
        # Call predictions endpoint
        response = client.get("/api/ml/previsions/1/")
        assert response.status_code == 200
        assert response.json()["status"] == "success"
        assert response.json()["current_balance"] == 400000.0
    finally:
        # Restore and clean overrides
        app_main.predict_treasury = original_predict
        app.dependency_overrides.clear()

def test_eda_endpoint():
    # Setup dependency overrides for authentication
    app.dependency_overrides[get_current_user] = lambda: {
        "email": "dirigeant@pme.sn",
        "pme_id": 1,
        "role": "dirigeant"
    }
    
    # Create sample CSV content
    csv_content = (
        "date,montant,type,categorie,description\n"
        "2026-06-01,150000,credit,Ventes,Vente produit A\n"
        "2026-06-02,50000,debit,Loyer,Loyer bureau\n"
        "2026-06-03,100000,credit,Ventes,Vente produit B\n"
    )
    
    files = {"file": ("test.csv", csv_content, "text/csv")}
    
    response = client.post("/api/ml/eda/", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["rows"] == 3
    assert data["columns"] == 5
    assert len(data["columns_stats"]) == 5
    assert data["preview"][0]["date"] == "2026-06-01"
    
    # Clean overrides
    app.dependency_overrides.clear()

def test_eda_dashboard_endpoint():
    # Setup dependency overrides for authentication
    app.dependency_overrides[get_current_user] = lambda: {
        "email": "dirigeant@pme.sn",
        "pme_id": 1,
        "role": "dirigeant"
    }
    
    # Create sample CSV content
    csv_content = (
        "date,montant,type,categorie,description\n"
        "2026-06-01,150000,credit,Ventes,Vente produit A\n"
        "2026-06-02,50000,debit,Loyer,Loyer bureau\n"
        "2026-06-03,100000,credit,Ventes,Vente produit B\n"
    )
    
    files = {"file": ("test.csv", csv_content, "text/csv")}
    data = {
        "metric": "montant",
        "dimension": "categorie",
        "secondary_dimension": "type",
        "date_col": "date",
        "aggregation": "sum"
    }
    
    response = client.post("/api/ml/eda/dashboard/", files=files, data=data)
    assert response.status_code == 200
    res_data = response.json()
    assert "kpis" in res_data
    assert res_data["kpis"]["count"] == 3
    assert len(res_data["dimension_breakdown"]) == 2
    assert len(res_data["secondary_breakdown"]) == 2
    assert len(res_data["trend"]) == 3
    assert len(res_data["leaderboard"]) == 3
    
    # Clean overrides
    app.dependency_overrides.clear()

def test_prediction_training_and_inference():
    # Setup dependency overrides for authentication
    app.dependency_overrides[get_current_user] = lambda: {
        "email": "dirigeant@pme.sn",
        "pme_id": 1,
        "role": "dirigeant"
    }
    
    # Create sample CSV content (needs at least 10 lines to pass validation!)
    rows = ["date,montant,type,categorie,description\n"]
    for i in range(12):
        rows.append(f"2026-06-{i+1:02d},{100000 + i*10000},credit,Ventes,Vente produit {i}\n")
    csv_content = "".join(rows)
    
    # 1. Test Training
    files = {"file": ("test.csv", csv_content, "text/csv")}
    data = {
        "target": "montant",
        "features": "type,categorie",
        "algo": "forest"
    }
    
    response = client.post("/api/ml/eda/predict/train/", files=files, data=data)
    assert response.status_code == 200
    res_data = response.json()
    assert "model_id" in res_data
    assert "metrics" in res_data
    assert "importances" in res_data
    assert "feature_specs" in res_data
    
    model_id = res_data["model_id"]
    
    # 2. Test Inference
    inference_payload = {
        "model_id": model_id,
        "inputs": {
            "type": "credit",
            "categorie": "Ventes"
        }
    }
    inf_response = client.post("/api/ml/eda/predict/run/", json=inference_payload)
    assert inf_response.status_code == 200
    inf_data = inf_response.json()
    assert "prediction" in inf_data
    assert isinstance(inf_data["prediction"], float)
    
    # Clean overrides
    app.dependency_overrides.clear()


def test_parse_invoice_ocr_simulated():
    # Setup dependency overrides for authentication
    app.dependency_overrides[get_current_user] = lambda: {
        "email": "billing@dakarbusiness.sn",
        "pme_id": 1,
        "role": "dirigeant"
    }
    
    invoice_text = (
        "FACTURE N° FAC-2026-X88\n"
        "Date: 2026-07-05\n"
        "Client: Senegal Retailers SARL\n\n"
        "Total Montant TTC: 850 000 FCFA\n"
        "Veuillez payer avant le 2026-08-05.\n"
    )
    
    response = client.post(
        "/api/ml/ocr/parse/",
        data={"text_content": invoice_text}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["extracted_data"]["numero"] == "FAC-2026-X88"
    assert data["extracted_data"]["client_nom"] == "Senegal Retailers SARL"
    assert data["extracted_data"]["montant"] == 850000.0
    assert data["extracted_data"]["date_emission"] == "2026-07-05"
    assert data["extracted_data"]["date_echeance"] == "2026-08-04"
    assert data["confidence"] > 90.0
    
    # Clean overrides
    app.dependency_overrides.clear()

