"""
Sadak Kadak - Comprehensive E2E API Test Script
Tests all flows: Auth → Reports → AI → Jobs → Bids → Agent → Analytics
"""
import json
import sys

BASE = "http://localhost:8000/api"

# Use requests if available, else error
try:
    import requests
except ImportError:
    print("ERROR: requests module not installed. Run: pip install requests")
    sys.exit(1)

results = {"PASS": 0, "FAIL": 0, "WARN": 0, "tests": []}

def test(name, func):
    try:
        res = func()
        status = "PASS" if res else "FAIL"
    except Exception as e:
        res = str(e)
        status = "FAIL"
    results[status] += 1
    results["tests"].append({"name": name, "status": status, "detail": str(res)[:200]})
    print(f"  {'✅' if status == 'PASS' else '❌'} {name}: {str(res)[:100]}")
    return res if status == "PASS" else None

# ═══ 1. AUTH TESTS ═══
print("\n═══ 1. AUTH TESTS ═══")

def t_root():
    r = requests.get("http://localhost:8000/")
    return r.status_code == 200 and r.json()["status"] == "running"
test("Root endpoint", t_root)

def t_health():
    r = requests.get("http://localhost:8000/health")
    return r.status_code == 200
test("Health check", t_health)

# Login as authority
def t_auth_login():
    r = requests.post(f"{BASE}/auth/login", json={"email":"authority@demo.com","password":"demo1234"})
    if r.status_code == 200 and "access_token" in r.json():
        global auth_token
        auth_token = r.json()["access_token"]
        return True
    return False
test("Authority login", t_auth_login)

# Login as citizen
def t_citizen_login():
    r = requests.post(f"{BASE}/auth/login", json={"email":"citizen@demo.com","password":"demo1234"})
    if r.status_code == 200:
        global citizen_token
        citizen_token = r.json()["access_token"]
        return True
    return False
test("Citizen login", t_citizen_login)

# Login as contractor
def t_contractor_login():
    r = requests.post(f"{BASE}/auth/login", json={"email":"contractor@demo.com","password":"demo1234"})
    if r.status_code == 200:
        global contractor_token
        contractor_token = r.json()["access_token"]
        return True
    return False
test("Contractor login", t_contractor_login)

# Wrong password
def t_bad_login():
    r = requests.post(f"{BASE}/auth/login", json={"email":"authority@demo.com","password":"wrong"})
    return r.status_code == 401
test("Invalid password → 401", t_bad_login)

# Register new user
def t_register():
    r = requests.post(f"{BASE}/auth/register", json={"name":"Test User","email":"test_qa@demo.com","password":"test1234","role":"citizen"})
    return r.status_code == 200 and "access_token" in r.json()
test("Register new user", t_register)

# Duplicate email
def t_dup_register():
    r = requests.post(f"{BASE}/auth/register", json={"name":"Dup","email":"test_qa@demo.com","password":"test1234","role":"citizen"})
    return r.status_code == 400
test("Duplicate email → 400", t_dup_register)

# Get me
def t_me():
    r = requests.get(f"{BASE}/auth/me", headers={"Authorization": f"Bearer {auth_token}"})
    return r.status_code == 200 and r.json()["role"] == "authority"
test("Get /me (authority)", t_me)

# No token
def t_no_token():
    r = requests.get(f"{BASE}/auth/me")
    return r.status_code == 403 or r.status_code == 401
test("No token → 401/403", t_no_token)

# ═══ 2. REPORTS TESTS ═══
print("\n═══ 2. REPORTS TESTS ═══")

def t_list_reports():
    r = requests.get(f"{BASE}/reports", headers={"Authorization": f"Bearer {auth_token}"})
    if r.status_code == 200:
        data = r.json()
        global first_report_id
        if len(data) > 0:
            first_report_id = data[0]["id"]
        return len(data) >= 6
    return False
test("List reports (seeded 6)", t_list_reports)

def t_get_single_report():
    r = requests.get(f"{BASE}/reports/{first_report_id}", headers={"Authorization": f"Bearer {auth_token}"})
    return r.status_code == 200 and "damage_type" in r.json()
test("Get single report", t_get_single_report)

def t_nearby_reports():
    r = requests.get(f"{BASE}/reports/nearby?lat=28.614&lng=77.209&radius_km=5", headers={"Authorization": f"Bearer {auth_token}"})
    return r.status_code == 200 and len(r.json()) > 0
test("Nearby reports", t_nearby_reports)

def t_404_report():
    r = requests.get(f"{BASE}/reports/nonexistent-id", headers={"Authorization": f"Bearer {auth_token}"})
    return r.status_code == 404
test("Get nonexistent report → 404", t_404_report)

# Submit report as citizen
def t_submit_report():
    r = requests.post(f"{BASE}/reports",
        headers={"Authorization": f"Bearer {citizen_token}"},
        data={"latitude":"28.615","longitude":"77.210","damage_type":"pothole","severity":"high","description":"QA test report","road_type":"local","traffic_density":"3.0"})
    if r.status_code == 200:
        global new_report_id
        new_report_id = r.json()["id"]
        return True
    print(f"submit_report failed: {r.status_code} {r.text[:200]}")
    return False
test("Citizen submits report", t_submit_report)

# Update status as authority
def t_update_status():
    r = requests.patch(f"{BASE}/reports/{new_report_id}/status?status=verified", headers={"Authorization": f"Bearer {auth_token}"})
    return r.status_code == 200 and r.json()["status"] == "verified"
test("Authority verifies report", t_update_status)

# Citizen cannot update status
def t_citizen_no_update():
    r = requests.patch(f"{BASE}/reports/{new_report_id}/status?status=rejected", headers={"Authorization": f"Bearer {citizen_token}"})
    return r.status_code == 403
test("Citizen can't update status → 403", t_citizen_no_update)

# ═══ 3. AI DETECTION TESTS ═══
print("\n═══ 3. AI DETECTION TESTS ═══")

def t_detect_no_image():
    r = requests.post(f"{BASE}/ai/detect", headers={"Authorization": f"Bearer {auth_token}"})
    return r.status_code == 422 or r.status_code == 400
test("AI detect with no image → 4xx", t_detect_no_image)

# ═══ 4. REPAIR JOBS TESTS ═══
print("\n═══ 4. REPAIR JOBS TESTS ═══")

def t_list_jobs():
    r = requests.get(f"{BASE}/jobs", headers={"Authorization": f"Bearer {auth_token}"})
    if r.status_code == 200:
        data = r.json()
        global job_id
        if len(data) > 0:
            job_id = data[0]["id"]
        return len(data) >= 1
    return False
test("List jobs (seeded 1)", t_list_jobs)

def t_create_job():
    r = requests.post(f"{BASE}/jobs",
        headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
        json={"title":"QA Test Job","latitude":28.615,"longitude":77.21,"estimated_cost":50000,"report_ids":[new_report_id],"priority_score":8.0})
    if r.status_code == 200:
        global new_job_id
        new_job_id = r.json()["id"]
        return True
    print(f"create_job failed: {r.status_code} {r.text[:200]}")
    return False
test("Authority creates job", t_create_job)

def t_get_job():
    r = requests.get(f"{BASE}/jobs/{new_job_id}", headers={"Authorization": f"Bearer {auth_token}"})
    return r.status_code == 200 and r.json()["title"] == "QA Test Job"
test("Get single job", t_get_job)

# Contractor cannot create job
def t_contractor_no_create():
    r = requests.post(f"{BASE}/jobs",
        headers={"Authorization": f"Bearer {contractor_token}", "Content-Type": "application/json"},
        json={"title":"Illegal Job","latitude":28.0,"longitude":77.0})
    return r.status_code == 403
test("Contractor can't create job → 403", t_contractor_no_create)

# ═══ 5. BIDS TESTS ═══
print("\n═══ 5. BIDS TESTS ═══")

def t_submit_bid():
    r = requests.post(f"{BASE}/jobs/{new_job_id}/bid",
        headers={"Authorization": f"Bearer {contractor_token}", "Content-Type": "application/json"},
        json={"price":45000,"repair_time_days":3,"materials":["asphalt","bitumen"],"notes":"QA test bid"})
    if r.status_code == 200:
        global new_bid_id
        new_bid_id = r.json()["id"]
        return True
    print(f"submit_bid failed: {r.status_code} {r.text[:200]}")
    return False
test("Contractor submits bid", t_submit_bid)

def t_list_bids():
    r = requests.get(f"{BASE}/jobs/{new_job_id}/bids", headers={"Authorization": f"Bearer {auth_token}"})
    return r.status_code == 200 and len(r.json()) >= 1
test("List bids for job", t_list_bids)

def t_my_bids():
    r = requests.get(f"{BASE}/my-bids", headers={"Authorization": f"Bearer {contractor_token}"})
    return r.status_code == 200 and len(r.json()) >= 1
test("Contractor my-bids", t_my_bids)

def t_accept_bid():
    r = requests.post(f"{BASE}/bids/{new_bid_id}/accept", headers={"Authorization": f"Bearer {auth_token}"})
    if r.status_code == 200:
        return r.json()["status"] == "accepted"
    print(f"accept_bid: {r.status_code} {r.text[:200]}")
    return False
test("Authority accepts bid", t_accept_bid)

# Check job is now assigned
def t_job_assigned():
    r = requests.get(f"{BASE}/jobs/{new_job_id}", headers={"Authorization": f"Bearer {auth_token}"})
    j = r.json()
    return j["status"] == "assigned" and j["winning_bid_id"] == new_bid_id
test("Job status → assigned after bid accept", t_job_assigned)

# ═══ 6. PROGRESS TESTS ═══
print("\n═══ 6. PROGRESS TESTS ═══")

def t_update_progress():
    r = requests.patch(f"{BASE}/jobs/{new_job_id}/progress",
        headers={"Authorization": f"Bearer {contractor_token}"},
        data={"stage":"materials_ready","notes":"Materials procured"})
    return r.status_code == 200
test("Contractor updates progress", t_update_progress)

def t_progress_in_job():
    r = requests.get(f"{BASE}/jobs/{new_job_id}", headers={"Authorization": f"Bearer {auth_token}"})
    j = r.json()
    return len(j["progress"]) >= 1 and j["status"] == "in_progress"
test("Job shows progress + in_progress status", t_progress_in_job)

# ═══ 7. ANALYTICS TESTS ═══
print("\n═══ 7. ANALYTICS TESTS ═══")

def t_dashboard():
    r = requests.get(f"{BASE}/analytics/dashboard", headers={"Authorization": f"Bearer {auth_token}"})
    return r.status_code == 200 and "total_reports" in r.json()
test("Analytics dashboard", t_dashboard)

def t_contractor_perf():
    r = requests.get(f"{BASE}/analytics/contractors", headers={"Authorization": f"Bearer {auth_token}"})
    return r.status_code == 200
test("Contractor performance", t_contractor_perf)

def t_heatmap():
    r = requests.get(f"{BASE}/analytics/heatmap", headers={"Authorization": f"Bearer {auth_token}"})
    return r.status_code == 200
test("Heatmap data", t_heatmap)

# Citizen cannot access analytics
def t_citizen_no_analytics():
    r = requests.get(f"{BASE}/analytics/dashboard", headers={"Authorization": f"Bearer {citizen_token}"})
    return r.status_code == 403
test("Citizen can't access analytics → 403", t_citizen_no_analytics)

# ═══ 8. CONTRACTORS TESTS ═══
print("\n═══ 8. CONTRACTORS TESTS ═══")

def t_list_contractors():
    r = requests.get(f"{BASE}/contractors", headers={"Authorization": f"Bearer {auth_token}"})
    return r.status_code == 200 and len(r.json()) >= 1
test("List contractors (authority)", t_list_contractors)

def t_my_profile():
    r = requests.get(f"{BASE}/contractors/profile/me", headers={"Authorization": f"Bearer {contractor_token}"})
    return r.status_code == 200 and "company_name" in r.json()
test("Contractor profile/me", t_my_profile)

# ═══ 9. AGENT TESTS ═══
print("\n═══ 9. AGENT TESTS ═══")

def t_agent_run():
    r = requests.post(f"{BASE}/agent/run", headers={"Authorization": f"Bearer {auth_token}"})
    if r.status_code == 200:
        return "message" in r.json()
    print(f"agent_run: {r.status_code} {r.text[:200]}")
    return False
test("Agent run cycle", t_agent_run)

def t_agent_plans():
    r = requests.get(f"{BASE}/agent/plans", headers={"Authorization": f"Bearer {auth_token}"})
    return r.status_code == 200
test("Agent plans list", t_agent_plans)

# ═══ SUMMARY ═══
print("\n" + "═" * 60)
print(f"  RESULTS: ✅ {results['PASS']} passed | ❌ {results['FAIL']} failed | ⚠️  {results['WARN']} warnings")
print(f"  TOTAL: {results['PASS'] + results['FAIL'] + results['WARN']} tests")
print("═" * 60)

# Print failures
fails = [t for t in results["tests"] if t["status"] == "FAIL"]
if fails:
    print("\n❌ FAILED TESTS:")
    for f in fails:
        print(f"  - {f['name']}: {f['detail']}")
