# Sadak Kadak - Technical Context & System Architecture

## 📖 Overview
**Sadak Kadak** is a robust, AI-accelerated platform for modern municipal road management. Built specifically around the Solapur Municipal Corporation context, it handles the complete lifecycle of road maintenance: from citizen discovery and AI verification to municipal job-batching and transparent contractor bidding negotiations.

---

## 🛠️ Technology Stack
* **Backend:** FastAPI (Python), SQLAlchemy (ORM), SQLite database, Uvicorn, Pydantic, Passlib (Bcrypt hashing), PyJWT.
* **Artificial Intelligence:** Ultralytics (YOLOv8) for road damage boundary detection, custom Python algorithmic heuristics for Severity Mapping & Priority Scoring.
* **Citizen Mobile App:** React Native, Expo SDK, React Navigation, Expo Location, React Native Maps, Google Roads API.
* **Authority Dashboard:** React, Vite, React Router, Recharts, Leaflet (`react-leaflet` & `leaflet.heat`), Tailwind-like structural CSS.
* **Contractor Dashboard:** React, Vite (mirrors authority structural patterns but specialized for Bid management and Job progress).

---

## 🏗️ Detailed Project Structure
```text
/e:/projects/sadak-kadak
├── /backend
│   ├── /ai                     # Machine Learning Pipeline
│   │   ├── damage_detector.py  # Wrapper for YOLO inference & mock fallbacks
│   │   ├── severity_classifier.py# Calculates area ratio to map to low/medium/high/critical
│   │   └── priority_scorer.py  # Averages severity + traffic density + road type 
│   ├── /api                    # FastAPI Route Controllers (auth, bids, repair_jobs, reports)
│   ├── /database               # connection.py (SessionLocal) & seed.py (Solapur mock data)
│   ├── /models                 # SQLAlchemy Schemas (Tables & Columns)
│   ├── /schemas                # Pydantic validation Models (Request/Response shapes)
│   ├── /services               # Business logic (e.g. auth_service.py parsing passwords)
│   ├── config.py               # Centralizes Env variables (Secret Keys, JWT Expire)
│   └── main.py                 # FastAPI Lifespan init, CORS config, Router mounting
|
├── /mobile_app                 # Citizen iOS/Android App
│   ├── /assets                 # App Icons & Splash screens
│   ├── /src
│   │   ├── /screens            # MapScreen.js (Snaps to roads), HomeScreen.js, ReportScreen.js
│   │   ├── api.js              # Axios interceptor logic (injects Bearer Tokens)
│   │   └── AuthContext.js      # React Context tracking login state via AsyncStorage
│   ├── app.json                # Expo config (manifest routing & Permissions)
│   └── App.js                  # React Navigation Stack / Tabs setup
|
├── /authority_dashboard        # Municipal Staff Control Center
│   ├── /src
│   │   ├── /components         # JobDetailModal.jsx, ReportDetailModal.jsx, Layout.jsx
│   │   ├── /pages              # RepairPlanningPage, ReportsPage, MapPage
│   │   └── api.js              # Axios logic via browser localStorage token retrieval
│   └── index.css               # Global application styling overrides
|
└── /contractor_dashboard       # Vendor Workflow UI
```

---

## 🗄️ Database Models & Relationships (SQLAlchemy)

### 1. User
- **Fields:** `id`, `email`, `password_hash`, `role` (Citizen, Authority, Contractor), `name`, `phone`
- **Relationship:** One-to-Many to `Report` (Citizen created), `RepairJob` (Authority created).

### 2. Report
- **Fields:** `image_urls` (JSON), `latitude`, `longitude`, `damage_type` (`pothole`, `transverse_crack`, `alligator_crack`, `longitudinal_crack`, `other corruption`), `severity` (`low`, `medium`, `high`, `critical`), `status` (`submitted`, `verified`, `duplicate`, `scheduled`, `repairing`, `completed`), `priority_score` (Float 0-10).
- **Relationship:** Many-to-Many to `RepairJob` via junction table `RepairJobReport`.

### 3. RepairJob 
- **Fields:** `title`, `description`, `status` (`bidding`, `assigned`, `in_progress`, `completed`), `latitude`, `longitude`, `address`, `estimated_cost`, `estimated_area`.
- **Relationship:** One-to-Many with `Bid`, Foreign Key `assigned_to` referencing Contractor.

### 4. Bid
- **Fields:** `job_id`, `contractor_id`, `price`, `repair_time_days`, `materials` (JSON Array), `status` (`pending`, `accepted`, `rejected`, `reproposed`), `reproposal_notes` (String), `suggested_price` (Float).
- **Flow:** If rejected or modified by Authority, status changes to `reproposed` and contractor gets counter-offer details.

### 5. Contractor
- **Fields:** `user_id` (FK to User), `company_name`, `license_number`, `specialization` (JSON).

---

## ⚡ Complete API Endpoint Specifications (FastAPI)

All requests (except public endpoints and login/register) require setting the generic header `Authorization: Bearer <TOKEN>`.

### 1. Authentication (`/api/auth`)
* `POST /auth/register`
  * **Payload (JSON):** `{ "name": "...", "email": "...", "password": "...", "role": "citizen|authority|contractor", "phone": "..." }`
  * **Returns:** `TokenResponse { access_token, token_type: "bearer", user: {...} }`
* `POST /auth/login`
  * **Payload (JSON)::** `{ "email": "...", "password": "..." }`
  * **Returns:** `TokenResponse`
* `GET /auth/me`
  * **Requires:** Any Auth Token
  * **Returns:** Currently logged-in User dictionary.

### 2. Reports (`/api/reports`)
* `GET /reports/public/recent`
  * **Auth:** None (Public).
  * **Query Params:** `?limit=5`
  * **Returns:** Array of recent reports with lightweight fields for map markers.
* `GET /reports`
  * **Auth:** Required (Citizens see only their own; Authorities see all).
  * **Query Params:** `?status=...&damage_type=...&limit=100&offset=0`
  * **Returns:** Array of deeply nested `_report_dict` complete with `ai_detection_result` and extracted damage metadata.
* `POST /reports`
  * **Auth:** Required.
  * **Payload (FormData - Multipart):** `latitude`, `longitude`, `damage_type`, optionally `severity`, `description`, `road_name`, `road_type`, `traffic_density`, and file array `images`.
  * **Action:** Triggers `run_detection_pipeline` AI logic if imagery is attached.
  * **Returns:** Created Report object.
* `GET /reports/nearby`
  * **Auth:** Required.
  * **Query Params:** `?lat=...&lng=...&radius_km=2.0`
  * **Returns:** Filtered reports computed via Geographic bounded box radius.
* `PATCH /reports/{report_id}/status`
  * **Auth:** Requires Authority role.
  * **Payload (JSON):** `{ "status": "verified|duplicate|scheduled" }`

### 3. Repair Jobs (`/api/jobs`)
* `POST /jobs`
  * **Auth:** Requires Authority/Admin.
  * **Payload (JSON):** `{ title, description, latitude, longitude, address, estimated_cost, estimated_area, deadline, report_ids: [...], priority_score }`
* `GET /jobs`
  * **Auth:** Required. If role is Contractor, automatically filters to only show relevant or unassigned jobs.
  * **Returns:** Array of jobs including fully linked `bids`, `report_links`, and `progress_updates` history.
* `PATCH /jobs/{job_id}/progress`
  * **Auth:** Required. 
  * **Payload (FormData):** `stage`, `notes`, array of `images`.
  * **Action:** Automatically cycles the Parent Job status based on the submission stage (e.g., `verified` resolves the job).
* `POST /jobs/{job_id}/assign`
  * **Payload:** Target `contractor_id` & `bid_id`. Forces the job to instantly switch to `assigned` mode mapping the winning bid.

### 4. Bidding System (`/api/bids` & `/api/jobs/{job_id}/bid`)
* `POST /jobs/{job_id}/bid`
  * **Auth:** Requires Contractor.
  * **Payload (JSON):** `{ price: Float, repair_time_days: Float, materials: [...], notes: String }`
* `GET /jobs/{job_id}/bids`
  * **Auth:** Required. Lists all competing bids on a single job.
* `GET /my-bids`
  * **Auth:** Requires Contractor. Fetches exactly what that authenticated vendor has bid on.
* `POST /bids/{bid_id}/accept`
  * **Auth:** Authority. Stamps bid as accepted and triggers `assign_contractor` internally.
* `POST /bids/{bid_id}/reject`
  * **Auth:** Authority. Kills the bid iteration.
* `POST /bids/{bid_id}/repropose`
  * **Auth:** Authority. 
  * **Payload (JSON):** `{ "suggested_price": Float, "notes": String }`
  * **Returns:** Repurposes the Bid model, injecting a highly visible `[COUNTER-OFFER ...]` text string directly into the database so the contractor receives the negotiation alert.

---

## ⚡ Core Data & Authentication Flow

### 1. Authentication (JWT lifecycle)
1. User logs in. `api/auth.py` evaluates bcrypt hash via `services/auth_service.py`.
2. FastAPI returns `access_token` (JWT).
3. **Dashboards** save token in `localStorage`. **Mobile App** saves token in `@react-native-async-storage`.
4. The `api.js` Axios instances catch every outgoing request and attach `Authorization: Bearer <TOKEN>`.
5. FastAPI routers use Depends `get_current_user` to decode the token. Certain endpoints throw `HTTPException 403` if permissions check fails (e.g. Citizen trying to access Contractor endpoints).

### 2. The AI Verification Pipeline
1. Citizen triggers `POST /reports` sending image and Lat/Lng. Status initially `submitted`.
2. Authority triggers `Verify` button on Dashboard. Calls `/reports/{id}/analyze`.
3. Backend passes image to YOLOv8 `detect_damage()` inside `damage_detector.py`. Emits bounding boxes & Class.
4. Bounding box coordinates calculate Area Ratio. The `severity_classifier.py` maps large area = `critical`, small = `low`.
5. The report automatically locks down a Priority Float between `1.0 - 10.0` (Heavily weighted to Highway Cracks / Arterial Potholes). Status flips to `verified`.

### 3. Road Mapping Architecture (Google Roads & Leaflet)
* **Heatmaps (Admin):** The Authority Dashboard uses `leaflet.heat` to map heavy report clusters. Red zones highlight structural anomalies for major repair contracts.
* **Curved Polylines (Mobile):** The Mobile App heavily utilizes the **Google Roads API**. 
    - Fetches the closest physical road anchor via `nearestRoads` to fix GPS drift. 
    - Builds a custom interpolated 3-point trace geometry (`snapToRoads`) directly tracing the physical road.
    - Limits redundant rate-limit exhaustion using batched point aggregation requests and the `SNAP_CACHE`.

---

## ⚙️ Environment Configurations (`.env`)

For full functionality, ensure environment variables exist:
```env
# Mobile App Root (/mobile_app/.env)
EXPO_PUBLIC_GOOGLE_MAP_KEY=AIzaSy... # Vital for drawing Road traces
EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:8000/api 

# Backend Root (/backend/config.py)
JWT_SECRET_KEY=yoursecret
YOLO_WEIGHTS_PATH=E:/projects/deepfake_detection_model/.../best.pt
```

---

## 🚀 Running Locally

* **Backend:** 
    1. `cd backend`
    2. `uvicorn main:app --reload`
    *(Auto-seeds SQLite DB on first lifecyle startup with Solapur coords)*
* **Mobile App:** 
    1. `cd mobile_app`
    2. `npx expo start -c`
    *(Type 'a' to strictly force Android Emulator load)*
* **Authority / Contractor Dashboards:** 
    1. `cd authority_dashboard` (or `contractor_dashboard`)
    2. `npm run dev`
    *(Boots Vite fast-refresh server)*
