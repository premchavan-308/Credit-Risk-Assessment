from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from contextlib import asynccontextmanager
import pandas as pd
import numpy as np
import joblib
import shap
from sklearn.pipeline import Pipeline

ml_model = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    ml_model["model"] = joblib.load("credit_risk_model.pkl")
    ml_model["threshold"] = joblib.load("best_threshold.pkl")

   
    try:
        explainer_model = joblib.load("credit_risk_explainer_model.pkl")
    except FileNotFoundError:
        explainer_model = None

    try:
        ml_model["background"] = joblib.load("background_sample.pkl")
    except FileNotFoundError:
        ml_model["background"] = None

    ml_model["explainer_model"] = explainer_model
    ml_model["explainer"] = (
        _build_explainer(explainer_model, ml_model["background"])
        if explainer_model is not None
        else None
    )

    yield

    ml_model.clear()


def _build_explainer(model, background):
    
    estimator = model
    if hasattr(model, "named_steps"):
       
        estimator = list(model.named_steps.values())[-1]

    try:
        return {"kind": "tree", "explainer": shap.TreeExplainer(estimator)}
    except Exception:
        pass

    if background is not None:
        try:
            return {
                "kind": "generic",
                "explainer": shap.Explainer(model.predict_proba, background),
            }
        except Exception:
            pass

    return None


def _get_top_factors(input_df: pd.DataFrame, max_factors: int = 6) -> list[dict]:
    
    bundle = ml_model.get("explainer")
    if bundle is None:
        return []

    try:
        model = ml_model["explainer_model"]
        preprocessor = None
        if hasattr(model, "named_steps"):
            steps = list(model.named_steps.items())
            if len(steps) > 1:
                preprocessor = Pipeline(steps[:-1])

        if bundle["kind"] == "tree":
            X = preprocessor.transform(input_df) if preprocessor is not None else input_df

            shap_values = bundle["explainer"].shap_values(X)
            if isinstance(shap_values, list):  # binary classifier returns [class0, class1]
                shap_values = shap_values[1]
            values = np.array(shap_values).flatten()

            if preprocessor is not None and hasattr(preprocessor, "get_feature_names_out"):
                feature_names = list(preprocessor.get_feature_names_out())
            else:
                feature_names = list(input_df.columns)
        else:
            result = bundle["explainer"](input_df)
            values = np.array(result.values)
            if values.ndim > 1 and values.shape[-1] > 1:
                values = values[..., 1]  # positive class
            values = values.flatten()
            feature_names = list(input_df.columns)

        if len(feature_names) != len(values):
            feature_names = [f"feature_{i}" for i in range(len(values))]

        ranked = sorted(
            zip(feature_names, values.tolist()), key=lambda kv: abs(kv[1]), reverse=True
        )
        return [
            {"feature": name, "impact": round(float(impact), 4)}
            for name, impact in ranked[:max_factors]
        ]
    except Exception:
        # Explainability is a bonus, not a requirement — a bug here
        # should degrade to "no breakdown", not a 500 on /predict.
        return []


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoanApplication(BaseModel):
    person_age: int
    person_income: float
    person_home_ownership: str
    person_emp_length: float
    loan_intent: str
    loan_grade: str
    loan_amnt: float
    loan_int_rate: float
    loan_percent_income: float
    cb_person_default_on_file: str
    cb_person_cred_hist_length: int


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "model_loaded": "model" in ml_model,
        "explainer_available": ml_model.get("explainer") is not None,
    }


@app.post("/predict")
def predict(data: LoanApplication):
    input_df = pd.DataFrame([data.dict()])

    try:
        probability = float(ml_model["model"].predict_proba(input_df)[:, 1][0])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Model inference failed: {exc}")

    threshold = float(ml_model["threshold"])
    prediction = int(probability >= threshold)

    return {
        "default_probability": probability,
        "default_prediction": prediction,
        "threshold": threshold,
        "Result": "High Risk" if prediction == 1 else "Low Risk",
        "top_factors": _get_top_factors(input_df),
    }


app.mount("/", StaticFiles(directory="static", html=True), name="static")
