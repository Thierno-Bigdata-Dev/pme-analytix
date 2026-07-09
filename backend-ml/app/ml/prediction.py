import io
import os
import uuid
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

from app.ml.eda import clean_json_value

# Ensure models directory exists
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

def train_custom_predictor(file_bytes: bytes, target_col: str, feature_cols: List[str], algo: str) -> Dict[str, Any]:
    """
    Trains a regression model on the uploaded CSV file based on user specifications.
    """
    # 1. Parse CSV
    try:
        sample = file_bytes[:10240]
        sample_str = sample.decode('utf-8-sig')
    except Exception:
        try:
            sample_str = file_bytes[:10240].decode('latin-1', errors='ignore')
        except Exception:
            sample_str = ''
            
    delimiter = ';' if ';' in sample_str else ','
    
    try:
        csv_str = file_bytes.decode('utf-8-sig')
    except UnicodeDecodeError:
        csv_str = file_bytes.decode('latin-1', errors='ignore')
        
    df = pd.read_csv(io.StringIO(csv_str), delimiter=delimiter)
    
    # Validate columns
    if target_col not in df.columns:
        raise ValueError(f"Colonne cible '{target_col}' introuvable.")
    for f in feature_cols:
        if f not in df.columns:
            raise ValueError(f"Variable prédictive '{f}' introuvable.")
            
    # Clean target: make numeric and drop nulls
    df[target_col] = pd.to_numeric(df[target_col].astype(str).str.replace(' ', '').str.replace(',', '.'), errors='coerce')
    clean_df = df.dropna(subset=[target_col])
    
    if len(clean_df) < 10:
        raise ValueError("Le jeu de données contient trop peu de lignes valides pour entraîner un modèle (minimum 10 lignes requis).")
        
    X = clean_df[feature_cols]
    y = clean_df[target_col]
    
    # 2. Split features into numeric and categorical
    numeric_cols = []
    categorical_cols = []
    
    for col in feature_cols:
        # Check if column is numeric in Pandas
        is_num = pd.api.types.is_numeric_dtype(clean_df[col])
        if is_num:
            numeric_cols.append(col)
        else:
            categorical_cols.append(col)
            
    # 3. Create preprocessing pipelines
    transformers = []
    
    if len(numeric_cols) > 0:
        num_pipeline = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', StandardScaler())
        ])
        transformers.append(('num', num_pipeline, numeric_cols))
        
    if len(categorical_cols) > 0:
        cat_pipeline = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
            ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
        ])
        transformers.append(('cat', cat_pipeline, categorical_cols))
        
    preprocessor = ColumnTransformer(transformers=transformers)
    
    # 4. Define ML Regressor
    if algo == 'linear':
        model = LinearRegression()
    else:
        model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
        
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('model', model)
    ])
    
    # 5. Split train/test
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Fit pipeline
    pipeline.fit(X_train, y_train)
    
    # Evaluate
    y_pred = pipeline.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    
    # 6. Map feature importances back to original features
    importance_map = {col: 0.0 for col in feature_cols}
    
    try:
        transformer = pipeline.named_steps['preprocessor']
        
        # Get feature names after transformer
        feature_names = []
        if len(numeric_cols) > 0:
            feature_names.extend(numeric_cols)
        if len(categorical_cols) > 0:
            cat_encoder = transformer.named_transformers_['cat'].named_steps['onehot']
            cat_names = cat_encoder.get_feature_names_out(categorical_cols)
            feature_names.extend(cat_names)
            
        # Get raw importances/coefficients
        raw_importances = []
        if algo == 'linear':
            raw_importances = np.abs(pipeline.named_steps['model'].coef_)
        else:
            raw_importances = pipeline.named_steps['model'].feature_importances_
            
        # Normalize Linear Regression coefficients to represent relative contribution
        if algo == 'linear':
            tot = sum(raw_importances) if sum(raw_importances) > 0 else 1.0
            raw_importances = [float(val / tot) for val in raw_importances]
            
        # Aggregate
        for name, imp in zip(feature_names, raw_importances):
            matched = False
            for orig_col in categorical_cols:
                if name.startswith(orig_col + "_") or name == orig_col:
                    importance_map[orig_col] += float(imp)
                    matched = True
                    break
            if not matched:
                for orig_col in numeric_cols:
                    if name == orig_col:
                        importance_map[orig_col] += float(imp)
                        break
    except Exception:
        # Fallback to uniform importances if anything fails during extraction
        for col in feature_cols:
            importance_map[col] = 1.0 / len(feature_cols)
            
    # 7. Collect feature specifications for interactive UI generator
    feature_specs = []
    for col in feature_cols:
        if col in numeric_cols:
            feature_specs.append({
                "name": col,
                "type": "numeric",
                "min": clean_json_value(df[col].min()),
                "max": clean_json_value(df[col].max())
            })
        else:
            # Categorical: limit choices to top 80 most frequent options
            opts = df[col].dropna().value_counts().head(80).index.tolist()
            feature_specs.append({
                "name": col,
                "type": "categorical",
                "options": [str(o) for o in opts]
            })
            
    # 8. Save model pipeline
    model_id = str(uuid.uuid4())
    model_path = os.path.join(MODELS_DIR, f"{model_id}.joblib")
    joblib.dump(pipeline, model_path)
    
    return {
        "model_id": model_id,
        "metrics": {
            "r2": clean_json_value(r2),
            "mae": clean_json_value(mae),
            "rmse": clean_json_value(rmse)
        },
        "importances": [{"feature": k, "importance": clean_json_value(v)} for k, v in importance_map.items()],
        "feature_specs": feature_specs
    }

def predict_custom_value(model_id: str, input_data: Dict[str, Any]) -> float:
    """
    Loads a trained pipeline and runs inference on the provided input row.
    """
    model_path = os.path.join(MODELS_DIR, f"{model_id}.joblib")
    if not os.path.exists(model_path):
        raise FileNotFoundError("Modèle introuvable ou expiré.")
        
    pipeline = joblib.load(model_path)
    
    # Reconstruct single row dataframe
    input_row = {k: [v] for k, v in input_data.items()}
    df_input = pd.DataFrame(input_row)
    
    # Run prediction
    prediction = pipeline.predict(df_input)[0]
    return float(prediction)
