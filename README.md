# 💳 Explainable Credit Risk Assessment

> An end-to-end **Explainable AI** application that predicts loan default risk using **XGBoost** and explains the prediction using **SHAP**.

[![Python](https://img.shields.io/badge/Python-3.13-blue?logo=python)](https://www.python.org/)
[![XGBoost](https://img.shields.io/badge/XGBoost-ML-orange)](https://xgboost.readthedocs.io/)
[![SHAP](https://img.shields.io/badge/SHAP-Explainable%20AI-red)](https://shap.readthedocs.io/)
[![FastAPI](https://img.shields.io/badge/FastAPI-API-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Render](https://img.shields.io/badge/Deployed-Render-46E3B7?logo=render)](https://render.com/)

## 🚀 Overview

This project predicts the probability of **loan default** from borrower and loan information, then uses **SHAP (SHapley Additive exPlanations)** to show which features influenced the prediction.

Instead of only answering:

> **"Is this applicant high risk?"**

the system also answers:

> **"What factors influenced this prediction?"**

### 🔍 Key Features

- 🤖 **XGBoost** classification for credit-risk prediction
- 📊 Default probability estimation
- 🎯 Optimized decision threshold
- 🔍 **SHAP-based explainability**
- 🌐 FastAPI REST API
- 🖥️ Interactive web interface
- ☁️ Deployed on Render

---

## 🧠 Workflow

```text
Loan Application
       ↓
Data Preprocessing
       ↓
XGBoost Model
       ↓
Default Probability
       ↓
Optimized Threshold
       ↓
Risk Classification
       ↓
SHAP Explanation
       ↓
Feature Drivers
```

## 📋 Input Features

The model considers factors including:

- Applicant age & income
- Employment length
- Home ownership
- Loan amount & interest rate
- Loan purpose & grade
- Loan-to-income ratio
- Previous default history
- Credit history length

## 🔍 Explainable Predictions

SHAP provides feature-level contributions for individual predictions.

Example:

### Prediction: High Risk

↑ Increasing Risk
• High loan interest rate
• High loan-to-income ratio
• Previous default history

↓ Reducing Risk
• Higher income
• Longer employment history
• Longer credit history

SHAP explains the model's behavior; feature contributions should not be interpreted as causal effects.



## 🛠️ Tech Stack

### Machine Learning:
Python • Pandas • NumPy • Scikit-learn • XGBoost

### Explainability:
SHAP

### Backend:
FastAPI • Pydantic • Uvicorn

### Deployment:
Render



## 📁 Project Structure
### Credit-Risk-Assessment/
│
├── main.py
├── credit_risk_model.pkl
├── best_threshold.pkl
├── requirements.txt
│
└── static/
    ├── index.html
    ├── style.css
    └── script.js
    

## 💻 Run Locally
- git clone https://github.com/premchavan-308/Credit-Risk-Assessment.git
- cd Credit-Risk-Assessment
- pip install -r requirements.txt
- uvicorn main:app --reload

### Open:

http://127.0.0.1:8000

### API documentation:

http://127.0.0.1:8000/docs

## 🎯 What This Project Demonstrates

Machine Learning → Explainable AI → REST API → Web Application → Cloud Deployment

It combines predictive modeling with interpretability to create a more transparent and production-oriented ML application.


### 👨‍💻 Author
### Prem Chavan
### Final-Year B.E. Computer Engineering | Data Science & AI

⭐ If you find this project interesting, consider starring the repository!
