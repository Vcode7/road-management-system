# 🛣️ Sadak Kadak — AI-Powered Smart City Road Management System

<div align="center">

**AI-Powered Road Damage Reporting & Repair Management**

_Citizen Reporting → AI Detection → Automated Planning → Contractor Bidding → Repair Tracking → AI Verification_

</div>

---

## 🎯 Overview

Sadak Kadak is a production-level AI-powered road damage management system for smart cities. It automates the complete lifecycle from citizen damage reports to verified repairs using YOLO-based damage detection, autonomous agent planning, and real-time tracking.

## 🏗️ System Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                    SADAK KADAK SYSTEM                         │
├──────────────┬──────────────┬─────────────────────────────────┤
│  📱 Mobile   │  🖥️ Authority │  🏗️ Contractor                 │
│  React Native│  React+Vite  │  React+Vite                     │
│  (Citizens)  │  (Dashboard) │  (Portal)                       │
├──────────────┴──────────────┴─────────────────────────────────┤
│                    FastAPI Backend (REST + WebSocket)          │
├───────────┬───────────┬───────────┬───────────┬───────────────┤
│    Auth   │  Reports  │  AI Det.  │   Agent   │  Analytics    │
│   Service │  Service  │  Pipeline │  System   │   Service     │
├───────────┴───────────┴───────────┴───────────┴───────────────┤
│                     SQLite Database                           │
└───────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
sadak-kadak/
├── backend/                # Python FastAPI Backend
│   ├── ai/                 # AI/ML Pipeline
│   │   ├── preprocessor.py       # Image preprocessing + blur detection
│   │   ├── damage_detector.py    # YOLO damage detection
│   │   ├── severity_classifier.py # Severity classification
│   │   ├── damage_measurer.py    # Physical measurement estimation
│   │   ├── repair_verifier.py    # Before/after repair verification
│   │   ├── duplicate_detector.py # Geo-duplicate detection
│   │   └── priority_scorer.py    # Priority scoring formula
│   ├── agent/              # Autonomous Agent System
│   │   ├── orchestrator.py       # Full agent cycle
│   │   ├── prioritizer.py        # Report prioritization
│   │   ├── batch_planner.py      # Repair batch clustering
│   │   ├── contractor_selector.py # Multi-criteria selection
│   │   ├── bid_optimizer.py      # IQR-based bid optimization
│   │   └── quality_checker.py    # Auto-verification
│   ├── api/                # FastAPI Routes
│   ├── models/             # SQLAlchemy Models (7 tables)
│   ├── services/           # Business Logic Layer
│   ├── database/           # DB Connection + Seed Data
│   ├── config.py           # App Configuration
│   ├── main.py             # Application Entry Point
│   └── requirements.txt    # Python Dependencies
├── authority_dashboard/    # React+Vite Authority Dashboard
│   └── src/
│       ├── pages/          # 8 pages (Dashboard, Map, Reports, etc.)
│       ├── components/     # Layout, Sidebar
│       └── AuthContext.jsx # Auth state management
├── contractor_dashboard/   # React+Vite Contractor Portal
│   └── src/
│       ├── pages/          # 5 pages (Marketplace, Jobs, Bids, etc.)
│       ├── components/     # Layout, Sidebar
│       └── AuthContext.jsx # Auth state management
└── mobile_app/             # React Native Expo (Citizens)
    ├── App.js              # Navigation + Auth flow
    └── src/screens/        # 6 screens (Home, Report, Map, etc.)
```

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm 9+

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

### 2. Authority Dashboard
```bash
cd authority_dashboard
npm install
npm run dev -- --port 5173
```
Open: http://localhost:5173 — Login: `authority@demo.com` / `demo1234`

### 3. Contractor Dashboard
```bash
cd contractor_dashboard
npm install
npm run dev -- --port 5174
```
Open: http://localhost:5174 — Login: `contractor@demo.com` / `demo1234`

### 4. Mobile App
```bash
cd mobile_app
npm install
npx expo start
```
Login: `citizen@demo.com` / `demo1234`

## 🧠 AI Pipeline

| Module | Purpose | Tech |
|--------|---------|------|
| Preprocessor | Blur detection, resize, normalize | OpenCV |
| Damage Detector | YOLO object detection | Ultralytics |
| Severity Classifier | Rule-based severity scoring | scikit-learn |
| Damage Measurer | Physical dimension estimation | OpenCV |
| Repair Verifier | Before/after image comparison | SSIM |
| Duplicate Detector | Geo-proximity deduplication | Haversine |
| Priority Scorer | Severity × Traffic × Road Type | Custom |

> **Note:** AI runs in mock mode by default. Set `USE_REAL_MODEL=true` and provide YOLO weights at `ai_models/weights/best.pt` for real inference.

## 🤖 Autonomous Agent System

The agent runs an autonomous cycle:
1. **Prioritize** — Re-score all pending reports
2. **Batch Plan** — Cluster nearby damage into repair groups
3. **Create Jobs** — Generate repair jobs from batches
4. **Optimize Bids** — IQR outlier rejection + multi-factor scoring
5. **Quality Check** — AI-verify completed repairs

Trigger: `POST /api/agent/run`

## 📡 API Endpoints

| Category | Endpoints |
|----------|-----------|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Reports | `GET/POST /api/reports`, `PATCH /api/reports/{id}/status`, `GET /api/reports/nearby` |
| AI | `POST /api/ai/detect`, `POST /api/ai/verify` |
| Jobs | `GET/POST /api/jobs`, `PATCH /api/jobs/{id}/assign`, `POST /api/jobs/{id}/progress` |
| Bids | `POST /api/jobs/{id}/bid`, `PATCH /api/bids/{id}/accept`, `PATCH /api/bids/{id}/reject` |
| Agent | `POST /api/agent/run`, `GET /api/agent/plans` |
| Analytics | `GET /api/analytics/dashboard`, `GET /api/analytics/contractors`, `GET /api/analytics/heatmap` |
| Contractors | `GET/POST /api/contractors`, `GET /api/contractors/profile/me` |
| WebSocket | `WS /ws/{user_id}` |

## 🔐 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Citizen | citizen@demo.com | demo1234 |
| Authority | authority@demo.com | demo1234 |
| Contractor | contractor@demo.com | demo1234 |

## 📄 License

MIT License — Built for smart city road infrastructure management.
