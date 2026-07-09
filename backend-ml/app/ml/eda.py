import io
import csv
import pandas as pd
import numpy as np
from typing import Dict, Any, List

def clean_json_value(val: Any) -> Any:
    """
    Safely converts numpy types, NaN, Inf, and NaT into standard JSON-serializable types.
    """
    if pd.isna(val) or val is None:
        return None
    if isinstance(val, (np.integer, np.int64, np.int32)):
        return int(val)
    if isinstance(val, (np.floating, np.float64, np.float32)):
        if np.isnan(val) or np.isinf(val):
            return None
        return float(val)
    if isinstance(val, np.bool_):
        return bool(val)
    if isinstance(val, pd.Timestamp):
        return val.isoformat()
    return str(val)

def analyze_dataframe(df: pd.DataFrame, file_name: str) -> Dict[str, Any]:
    """
    Gathers statistical metadata from a pandas DataFrame and returns a clean JSON-serializable dictionary.
    """
    num_rows, num_cols = df.shape
    total_cells = num_rows * num_cols
    missing_cells = int(df.isna().sum().sum())
    total_missing_pct = float(missing_cells / total_cells * 100) if total_cells > 0 else 0.0
    
    # Duplicate rows
    duplicate_rows = int(df.duplicated().sum())
    
    # 3. Column-by-Column Statistics
    columns_stats = []
    
    for col_name in df.columns:
        col_series = df[col_name]
        missing_count = int(col_series.isna().sum())
        missing_pct = float(missing_count / num_rows * 100) if num_rows > 0 else 0.0
        
        # Determine logical type
        col_type = "categorical"
        if pd.api.types.is_numeric_dtype(col_series):
            # Check if it has very few unique values (might be categorical masquerading as numeric)
            non_null_series = col_series.dropna()
            if len(non_null_series.unique()) <= 10 and num_rows > 50:
                col_type = "categorical"
            else:
                col_type = "numeric"
        
        stat_item = {
            "name": str(col_name),
            "type": col_type,
            "missing_count": missing_count,
            "missing_pct": missing_pct
        }
        
        if col_type == "numeric":
            non_null = col_series.dropna()
            if len(non_null) > 0:
                stat_item["min"] = clean_json_value(non_null.min())
                stat_item["max"] = clean_json_value(non_null.max())
                stat_item["mean"] = clean_json_value(non_null.mean())
                stat_item["median"] = clean_json_value(non_null.median())
                stat_item["std"] = clean_json_value(non_null.std())
                
                # Compute Histogram Bins (10 bins)
                try:
                    counts, bins = np.histogram(non_null, bins=10)
                    stat_item["histogram"] = {
                        "frequencies": [int(c) for c in counts],
                        "bin_edges": [float(b) for b in bins]
                    }
                except Exception:
                    stat_item["histogram"] = None
            else:
                stat_item["min"] = None
                stat_item["max"] = None
                stat_item["mean"] = None
                stat_item["median"] = None
                stat_item["std"] = None
                stat_item["histogram"] = None
        else:
            # Categorical
            non_null = col_series.dropna()
            unique_count = int(non_null.nunique())
            stat_item["unique_count"] = unique_count
            
            # Value counts (top 5 values)
            top_values = []
            if len(non_null) > 0:
                counts = non_null.value_counts().head(5)
                for val, cnt in counts.items():
                    top_values.append({
                        "value": str(val),
                        "count": int(cnt),
                        "pct": float(cnt / len(non_null) * 100)
                    })
            stat_item["top_values"] = top_values
            
        columns_stats.append(stat_item)
        
    # 4. Correlation Matrix (Numerical variables only)
    correlation_list = []
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    # Filter out columns with no variance
    numeric_cols = [col for col in numeric_cols if df[col].dropna().std() > 0]
    
    if len(numeric_cols) > 1:
        corr_matrix = df[numeric_cols].corr(method='pearson')
        for i, col_x in enumerate(numeric_cols):
            for col_y in numeric_cols:
                val = corr_matrix.at[col_x, col_y]
                correlation_list.append({
                    "x": str(col_x),
                    "y": str(col_y),
                    "coef": clean_json_value(val)
                })
                
    # 5. Data Preview (first 10 rows)
    preview_rows = []
    preview_df = df.head(10)
    for _, row in preview_df.iterrows():
        row_dict = {}
        for col_name in df.columns:
            row_dict[str(col_name)] = clean_json_value(row[col_name])
        preview_rows.append(row_dict)
        
    return {
        "file_name": str(file_name),
        "rows": num_rows,
        "columns": num_cols,
        "total_missing_pct": total_missing_pct,
        "duplicate_rows": duplicate_rows,
        "columns_stats": columns_stats,
        "correlation_matrix": correlation_list,
        "preview": preview_rows
    }

def analyze_csv(file_bytes: bytes, file_name: str) -> Dict[str, Any]:
    """
    Parses a CSV file bytes stream, gathers statistical metadata,
    and returns a clean JSON-serializable dictionary.
    """
    try:
        sample = file_bytes[:10240]  # Take 10KB sample
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
    return analyze_dataframe(df, file_name)

def clean_and_analyze_csv(file_bytes: bytes, file_name: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
    if config is None:
        config = {
            "drop_duplicates": True,
            "impute_numeric": "median",
            "impute_categorical": "mode",
            "handle_outliers": "cap"
        }
    
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
        
    df_raw = pd.read_csv(io.StringIO(csv_str), delimiter=delimiter)
    
    # Raw Analysis
    raw_analysis = analyze_dataframe(df_raw, file_name)
    
    # Clone and clean
    df_clean = df_raw.copy()
    report = []
    
    # Duplicates handling
    if config.get("drop_duplicates", True):
        dups_count = int(df_clean.duplicated().sum())
        if dups_count > 0:
            df_clean = df_clean.drop_duplicates().reset_index(drop=True)
            report.append(f"{dups_count} ligne(s) doublon(s) supprimée(s).")
        else:
            report.append("Aucun doublon détecté.")
            
    # Columns handling (Missing and Outliers)
    for col_name in df_clean.columns:
        col_series = df_clean[col_name]
        missing_count = int(col_series.isna().sum())
        
        is_numeric = pd.api.types.is_numeric_dtype(col_series)
        if is_numeric:
            non_null_series = col_series.dropna()
            if len(non_null_series.unique()) <= 10 and len(df_clean) > 50:
                is_numeric = False
                
        # Missing values imputation
        if missing_count > 0:
            if is_numeric:
                imp_num = config.get("impute_numeric", "median")
                if imp_num == "median":
                    fill_val = col_series.median()
                    df_clean[col_name] = col_series.fillna(fill_val)
                    report.append(f"Colonne '{col_name}' : {missing_count} valeur(s) manquante(s) imputée(s) avec la médiane ({clean_json_value(fill_val)}).")
                elif imp_num == "mean":
                    fill_val = col_series.mean()
                    df_clean[col_name] = col_series.fillna(fill_val)
                    report.append(f"Colonne '{col_name}' : {missing_count} valeur(s) manquante(s) imputée(s) avec la moyenne ({clean_json_value(fill_val):.2f}).")
                elif imp_num == "zero":
                    df_clean[col_name] = col_series.fillna(0)
                    report.append(f"Colonne '{col_name}' : {missing_count} valeur(s) manquante(s) remplie(s) avec 0.")
                elif imp_num == "drop":
                    df_clean = df_clean.dropna(subset=[col_name]).reset_index(drop=True)
                    report.append(f"Colonne '{col_name}' : suppression des lignes contenant des valeurs manquantes ({missing_count} ligne(s) affectée(s)).")
            else:
                imp_cat = config.get("impute_categorical", "mode")
                if imp_cat == "mode" and not col_series.mode().empty:
                    fill_val = col_series.mode()[0]
                    df_clean[col_name] = col_series.fillna(fill_val)
                    report.append(f"Colonne '{col_name}' : {missing_count} valeur(s) manquante(s) imputée(s) avec le mode ('{fill_val}').")
                elif imp_cat == "missing_label":
                    df_clean[col_name] = col_series.fillna("Inconnu")
                    report.append(f"Colonne '{col_name}' : {missing_count} valeur(s) manquante(s) remplie(s) avec 'Inconnu'.")
                elif imp_cat == "drop":
                    df_clean = df_clean.dropna(subset=[col_name]).reset_index(drop=True)
                    report.append(f"Colonne '{col_name}' : suppression des lignes contenant des valeurs manquantes ({missing_count} ligne(s) affectée(s)).")

        # Outliers handling
        if is_numeric:
            non_null = df_clean[col_name].dropna()
            if len(non_null) > 4:
                q1 = non_null.quantile(0.25)
                q3 = non_null.quantile(0.75)
                iqr = q3 - q1
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr
                
                outliers_mask = (df_clean[col_name] < lower_bound) | (df_clean[col_name] > upper_bound)
                outliers_count = int(outliers_mask.sum())
                
                if outliers_count > 0:
                    handle_out = config.get("handle_outliers", "cap")
                    if handle_out == "cap":
                        df_clean[col_name] = np.clip(df_clean[col_name], lower_bound, upper_bound)
                        report.append(f"Colonne '{col_name}' : {outliers_count} valeur(s) aberrante(s) écrêtée(s) (capping) dans [{clean_json_value(lower_bound):.1f}, {clean_json_value(upper_bound):.1f}].")
                    elif handle_out == "drop":
                        df_clean = df_clean[~outliers_mask].reset_index(drop=True)
                        report.append(f"Colonne '{col_name}' : {outliers_count} ligne(s) contenant des valeurs aberrantes supprimée(s).")
                    else:
                        report.append(f"Colonne '{col_name}' : {outliers_count} valeur(s) aberrante(s) conservée(s).")

    # Add descriptive statistics (skewness, outliers count) to raw column stats
    for stat in raw_analysis["columns_stats"]:
        col_name = stat["name"]
        if stat["type"] == "numeric":
            col_series = df_raw[col_name].dropna()
            if len(col_series) > 2:
                stat["skewness"] = clean_json_value(col_series.skew())
                q1 = col_series.quantile(0.25)
                q3 = col_series.quantile(0.75)
                iqr = q3 - q1
                stat["outliers_count"] = int(((col_series < (q1 - 1.5 * iqr)) | (col_series > (q3 + 1.5 * iqr))).sum())
            else:
                stat["skewness"] = None
                stat["outliers_count"] = 0
        else:
            stat["skewness"] = None
            stat["outliers_count"] = 0
            
    # Clean Analysis
    clean_analysis = analyze_dataframe(df_clean, f"cleaned_{file_name}")
    
    # Add descriptive statistics to clean column stats
    for stat in clean_analysis["columns_stats"]:
        col_name = stat["name"]
        if stat["type"] == "numeric":
            col_series = df_clean[col_name].dropna()
            if len(col_series) > 2:
                stat["skewness"] = clean_json_value(col_series.skew())
                q1 = col_series.quantile(0.25)
                q3 = col_series.quantile(0.75)
                iqr = q3 - q1
                stat["outliers_count"] = int(((col_series < (q1 - 1.5 * iqr)) | (col_series > (q3 + 1.5 * iqr))).sum())
            else:
                stat["skewness"] = None
                stat["outliers_count"] = 0
        else:
            stat["skewness"] = None
            stat["outliers_count"] = 0

    # Calculate Bivariate Insights
    bivariate_insights = []
    # Correlations
    if len(raw_analysis["correlation_matrix"]) > 0:
        sorted_corr = [c for c in raw_analysis["correlation_matrix"] if c["x"] != c["y"]]
        sorted_corr = sorted(sorted_corr, key=lambda c: abs(c["coef"]) if c["coef"] is not None else 0, reverse=True)
        seen_pairs = set()
        top_corrs = []
        for c in sorted_corr:
            pair = tuple(sorted([c["x"], c["y"]]))
            if pair not in seen_pairs:
                seen_pairs.add(pair)
                top_corrs.append(c)
                if len(top_corrs) >= 3:
                    break
        for c in top_corrs:
            coef = c["coef"]
            relation = "forte" if abs(coef) > 0.7 else "modérée" if abs(coef) > 0.4 else "faible"
            direction = "positive" if coef > 0 else "négative"
            bivariate_insights.append({
                "type": "numeric-numeric",
                "x": c["x"],
                "y": c["y"],
                "metric": f"Coefficient r = {coef:.2f}",
                "description": f"Il existe une relation linéaire {relation} {direction} entre '{c['x']}' et '{c['y']}'."
            })
            
    # Numerical mean per categorical group
    numeric_cols = [c["name"] for c in raw_analysis["columns_stats"] if c["type"] == "numeric"]
    categorical_cols = [c["name"] for c in raw_analysis["columns_stats"] if c["type"] == "categorical"]
    if numeric_cols and categorical_cols:
        for cat_col in categorical_cols[:2]:
            for num_col in numeric_cols[:2]:
                try:
                    grp = df_raw.groupby(cat_col)[num_col].mean().dropna().sort_values(ascending=False)
                    if len(grp) > 1:
                        max_cat = grp.index[0]
                        max_val = grp.values[0]
                        min_cat = grp.index[-1]
                        min_val = grp.values[-1]
                        bivariate_insights.append({
                            "type": "categorical-numeric",
                            "x": cat_col,
                            "y": num_col,
                            "metric": f"Moyenne de '{num_col}' par '{cat_col}'",
                            "description": f"En moyenne, '{cat_col}'='{max_cat}' a la valeur la plus élevée de '{num_col}' ({max_val:.1f}), tandis que '{cat_col}'='{min_cat}' a la plus basse ({min_val:.1f})."
                        })
                except Exception:
                    pass

    # Save to string
    clean_csv_buffer = io.StringIO()
    df_clean.to_csv(clean_csv_buffer, index=False, sep=delimiter)
    clean_csv_str = clean_csv_buffer.getvalue()
    
    return {
        "raw_stats": raw_analysis,
        "clean_stats": clean_analysis,
        "report": report,
        "bivariate_insights": bivariate_insights,
        "cleaned_csv_content": clean_csv_str
    }

def aggregate_dashboard_data(file_bytes: bytes, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Groups and aggregates CSV data dynamically based on the provided configuration.
    """
    # 1. Parse file
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
    
    # 2. Extract configuration
    metric = config.get("metric")
    dimension = config.get("dimension")
    secondary_dim = config.get("secondary_dimension")
    date_col = config.get("date_col")
    agg_type = config.get("aggregation", "mean") # 'mean' or 'sum'
    
    if not metric or not dimension or metric not in df.columns or dimension not in df.columns:
        raise ValueError(f"Métrique '{metric}' ou dimension '{dimension}' introuvable dans le fichier.")
        
    # Standardize column types
    df[metric] = pd.to_numeric(df[metric].astype(str).str.replace(' ', '').str.replace(',', '.'), errors='coerce')
    non_null_df = df.dropna(subset=[metric])
    
    # 3. Calculate KPIs
    kpis = {
        "sum": clean_json_value(non_null_df[metric].sum()),
        "mean": clean_json_value(non_null_df[metric].mean()),
        "min": clean_json_value(non_null_df[metric].min()),
        "max": clean_json_value(non_null_df[metric].max()),
        "count": int(len(df))
    }
    
    # 4. Dimension breakdown (Top 8)
    dim_df = non_null_df.groupby(dimension)[metric].agg(agg_type).reset_index()
    dim_df = dim_df.sort_values(by=metric, ascending=False).head(8)
    dimension_breakdown = []
    for _, row in dim_df.iterrows():
        dimension_breakdown.append({
            "category": str(row[dimension]),
            "value": clean_json_value(row[metric])
        })
        
    # 5. Secondary breakdown (Top 8)
    secondary_breakdown = []
    if secondary_dim and secondary_dim in df.columns:
        counts = df[secondary_dim].dropna().value_counts().head(8)
        total_valid = int(df[secondary_dim].dropna().count())
        for cat, val in counts.items():
            secondary_breakdown.append({
                "category": str(cat),
                "count": int(val),
                "pct": float(val / total_valid * 100) if total_valid > 0 else 0.0
            })
            
    # 6. Trend calculation
    trend = []
    if date_col and date_col in df.columns:
        # Check if date can be parsed
        trend_df = non_null_df.copy()
        trend_df['parsed_date'] = pd.to_datetime(trend_df[date_col], errors='coerce')
        valid_dates = trend_df.dropna(subset=['parsed_date'])
        
        if len(valid_dates) > 0:
            # Group by parsed date (day or month depending on size)
            # If dates span across many months, group by month, otherwise group by date
            unique_days = valid_dates['parsed_date'].dt.date.nunique()
            if unique_days > 45:
                # Group by Month
                valid_dates['group_date'] = valid_dates['parsed_date'].dt.to_period('M').astype(str)
            else:
                valid_dates['group_date'] = valid_dates['parsed_date'].dt.date.astype(str)
                
            grouped_trend = valid_dates.groupby('group_date')[metric].agg(agg_type).reset_index()
            grouped_trend = grouped_trend.sort_values(by='group_date')
            
            for _, row in grouped_trend.iterrows():
                trend.append({
                    "date": str(row['group_date']),
                    "value": clean_json_value(row[metric])
                })
                
    # 7. Leaderboard (Top 10 sorted descending by metric)
    leaderboard = []
    leaderboard_df = df.sort_values(by=metric, ascending=False).head(10)
    for _, row in leaderboard_df.iterrows():
        row_dict = {}
        for col_name in df.columns:
            row_dict[str(col_name)] = clean_json_value(row[col_name])
        leaderboard.append(row_dict)
        
    return {
        "kpis": kpis,
        "dimension_breakdown": dimension_breakdown,
        "secondary_breakdown": secondary_breakdown,
        "trend": trend,
        "leaderboard": leaderboard
    }
