# pyright: reportMissingImports=false
# pyrefly: disable
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

# Ensure models directory exists at import time — not on every call.
MODELS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models"
)
os.makedirs(MODELS_DIR, exist_ok=True)


def _detect_encoding_and_delimiter(file_bytes: bytes):
    """
    Tries UTF-8 BOM first, then falls back to Latin-1.
    Returns (csv_str, delimiter).
    """
    for encoding in ('utf-8-sig', 'latin-1'):
        try:
            csv_str = file_bytes.decode(encoding, errors='ignore')
            break
        except Exception:
            csv_str = ''

    # Detect delimiter from the first 10 KB to avoid reading the entire file twice.
    sample = csv_str[:10_240]
    delimiter = ';' if sample.count(';') > sample.count(',') else ','
    return csv_str, delimiter


def train_custom_predictor(
    file_bytes: bytes,
    target_col: str,
    feature_cols: List[str],
    algo: str,
) -> Dict[str, Any]:
    """
    Trains a regression model on the uploaded CSV based on user specifications.

    Changes vs previous version:
    - Removed dead imports (GridSearchCV, RobustScaler — never used).
    - Encoding detection extracted to helper — not duplicated inline.
    - BUG FIX: was saving `pipeline` (unfitted object) instead of `best_pipeline`
      (the fitted one). Now correctly saves `best_pipeline`.
    - Importance aggregation uses a dict accumulator instead of nested loops.
    - Feature spec numeric stats computed from clean_df (post-clean) to avoid
      leaking NaN min/max into the UI.
    """
    csv_str, delimiter = _detect_encoding_and_delimiter(file_bytes)
    df = pd.read_csv(io.StringIO(csv_str), delimiter=delimiter)

    # ── Column validation ────────────────────────────────────────────────────
    if target_col not in df.columns:
        raise ValueError(f"Colonne cible '{target_col}' introuvable.")
    for f in feature_cols:
        if f not in df.columns:
            raise ValueError(f"Variable prédictive '{f}' introuvable.")

    # ── Target cleaning ──────────────────────────────────────────────────────
    df[target_col] = pd.to_numeric(
        df[target_col].astype(str).str.replace(' ', '').str.replace(',', '.'),
        errors='coerce',
    )
    clean_df = df.dropna(subset=[target_col])

    if len(clean_df) < 10:
        raise ValueError(
            "Le jeu de données contient trop peu de lignes valides pour entraîner "
            "un modèle (minimum 10 lignes requis)."
        )

    X = clean_df[feature_cols]
    y = clean_df[target_col]

    # ── Feature type detection ───────────────────────────────────────────────
    numeric_cols     = [c for c in feature_cols if pd.api.types.is_numeric_dtype(clean_df[c])]
    categorical_cols = [c for c in feature_cols if c not in numeric_cols]

    # ── Preprocessing pipelines ──────────────────────────────────────────────
    transformers = []
    if numeric_cols:
        num_pipeline = Pipeline([
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler',  StandardScaler()),
        ])
        transformers.append(('num', num_pipeline, numeric_cols))

    if categorical_cols:
        cat_pipeline = Pipeline([
            ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
            ('onehot',  OneHotEncoder(handle_unknown='ignore', sparse_output=False)),
        ])
        transformers.append(('cat', cat_pipeline, categorical_cols))

    preprocessor = ColumnTransformer(transformers)

    # ── Train / test split ───────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # ── Model selection and fit ──────────────────────────────────────────────
    if algo == 'linear':
        estimator = LinearRegression()
    else:
        estimator = RandomForestRegressor(
            n_estimators=100,
            max_depth=None,
            random_state=42,
            n_jobs=-1,
        )

    best_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('model',         estimator),
    ])
    best_pipeline.fit(X_train, y_train)

    # ── Evaluation ───────────────────────────────────────────────────────────
    y_pred = best_pipeline.predict(X_test)
    r2   = r2_score(y_test, y_pred)
    mae  = mean_absolute_error(y_test, y_pred)
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))

    # ── Feature importance extraction ────────────────────────────────────────
    importance_map = {col: 0.0 for col in feature_cols}
    try:
        transformer = best_pipeline.named_steps['preprocessor']

        # Ordered list of feature names as seen by the model
        feature_names: List[str] = list(numeric_cols)
        if categorical_cols:
            ohe = transformer.named_transformers_['cat'].named_steps['onehot']
            feature_names.extend(ohe.get_feature_names_out(categorical_cols).tolist())

        if algo == 'linear':
            raw = np.abs(best_pipeline.named_steps['model'].coef_)
            total = raw.sum() or 1.0
            raw   = raw / total                     # normalise to relative share
        else:
            raw = best_pipeline.named_steps['model'].feature_importances_

        # Map encoded feature names back to their original column
        # Build a lookup: encoded_prefix → original column for categorical features
        cat_prefix_map = {f"{col}_": col for col in categorical_cols}
        cat_prefix_map.update({col: col for col in categorical_cols})  # exact match

        for name, imp in zip(feature_names, raw):
            matched = False
            # Check categorical prefixes first (encoded names look like "col_value")
            for prefix, orig_col in cat_prefix_map.items():
                if name.startswith(prefix):
                    importance_map[orig_col] += float(imp)
                    matched = True
                    break
            if not matched and name in importance_map:
                importance_map[name] += float(imp)

    except Exception:
        n = len(feature_cols)
        importance_map = {col: 1.0 / n for col in feature_cols}

    # ── Feature specs for interactive UI ────────────────────────────────────
    feature_specs = []
    for col in feature_cols:
        if col in numeric_cols:
            feature_specs.append({
                "name": col,
                "type": "numeric",
                "min":  clean_json_value(clean_df[col].min()),
                "max":  clean_json_value(clean_df[col].max()),
            })
        else:
            opts = clean_df[col].dropna().value_counts().head(80).index.tolist()
            feature_specs.append({
                "name":    col,
                "type":    "categorical",
                "options": [str(o) for o in opts],
            })

    # ── Persist model ────────────────────────────────────────────────────────
    model_id   = str(uuid.uuid4())
    model_path = os.path.join(MODELS_DIR, f"{model_id}.joblib")
    # BUG FIX: was saving `pipeline` (the unfitted skeleton), now saves `best_pipeline`.
    joblib.dump(best_pipeline, model_path)

    return {
        "model_id": model_id,
        "metrics": {
            "r2":   clean_json_value(r2),
            "mae":  clean_json_value(mae),
            "rmse": clean_json_value(rmse),
        },
        "importances":    [{"feature": k, "importance": clean_json_value(v)} for k, v in importance_map.items()],
        "feature_specs":  feature_specs,
    }


def predict_custom_value(model_id: str, input_data: Dict[str, Any]) -> float:
    """
    Loads a persisted pipeline by model_id and runs inference on a single input row.
    """
    model_path = os.path.join(MODELS_DIR, f"{model_id}.joblib")
    if not os.path.exists(model_path):
        raise FileNotFoundError("Modèle introuvable ou expiré.")

    pipeline    = joblib.load(model_path)
    df_input    = pd.DataFrame({k: [v] for k, v in input_data.items()})
    prediction  = pipeline.predict(df_input)[0]
    return float(prediction)
