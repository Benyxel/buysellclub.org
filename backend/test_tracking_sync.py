"""
Test script to verify tracking sync works in both scenarios:
1. User adds first, then admin adds later
2. Admin adds first, then user adds later
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

print("=" * 80)
print("TESTING TRACKING SYNC - Both Order Scenarios")
print("=" * 80)

# Get admin token (you'll need to use actual admin credentials)
print("\n1. Logging in as admin...")
admin_login = requests.post(f"{BASE_URL}/login/", json={
    "username": "admin",
    "password": "admin123"  # Update with your actual admin password
})

if admin_login.status_code != 200:
    print(f"❌ Admin login failed: {admin_login.status_code}")
    print(f"   Response: {admin_login.text}")
    print("\n   Please update the admin credentials in this script and try again.")
    exit(1)

admin_token = admin_login.json().get("access")
print(f"✓ Admin logged in")

# Get a regular user token (you'll need actual user credentials)
print("\n2. Logging in as regular user...")
user_login = requests.post(f"{BASE_URL}/login/", json={
    "username": "Benyxel",  # Update with actual username
    "password": "password123"  # Update with actual password
})

if user_login.status_code != 200:
    print(f"❌ User login failed: {user_login.status_code}")
    print(f"   Response: {user_login.text}")
    print("\n   Please update the user credentials in this script and try again.")
    exit(1)

user_token = user_login.json().get("access")
user_data = user_login.json().get("user", {})
user_mark = user_data.get("shipping_mark", "")
print(f"✓ User logged in: {user_data.get('username')} (mark: {user_mark})")

if not user_mark:
    print(f"❌ User has no shipping mark! Please assign a shipping mark first.")
    exit(1)

# Test tracking numbers
test_tn_1 = "TEST_USER_FIRST_001"
test_tn_2 = "TEST_ADMIN_FIRST_002"

print("\n" + "=" * 80)
print("SCENARIO 1: User adds first, then admin adds later")
print("=" * 80)

# User adds tracking
print(f"\n3. User adds tracking: {test_tn_1}")
user_add = requests.post(
    f"{BASE_URL}/trackings/",
    headers={"Authorization": f"Bearer {user_token}"},
    json={
        "tracking_number": test_tn_1,
        "cbm": "1.5",
        "description": "User added first test"
    }
)

if user_add.status_code not in [200, 201]:
    print(f"❌ Failed to add tracking: {user_add.status_code}")
    print(f"   {user_add.text}")
else:
    print(f"✓ User added tracking")
    user_tracking = user_add.json()
    print(f"   Owner: {user_tracking.get('owner_username', 'N/A')}")
    print(f"   Mark: {user_tracking.get('shipping_mark', '(empty)')}")

# Admin adds same tracking number
print(f"\n4. Admin adds same tracking number: {test_tn_1}")
admin_add_1 = requests.post(
    f"{BASE_URL}/trackings/",
    headers={"Authorization": f"Bearer {admin_token}"},
    json={
        "tracking_number": test_tn_1,
        "cbm": "2.0",
        "description": "Admin added later"
    }
)

if admin_add_1.status_code not in [200, 201]:
    print(f"❌ Failed to add tracking: {admin_add_1.status_code}")
    print(f"   {admin_add_1.text}")
else:
    print(f"✓ Admin added tracking")
    admin_tracking = admin_add_1.json()
    print(f"   Owner: {admin_tracking.get('owner_username', 'N/A')}")
    print(f"   Mark: {admin_tracking.get('shipping_mark', '(empty)')}")

# Fetch all records with this tracking number
print(f"\n5. Checking all records for {test_tn_1}...")
all_trackings = requests.get(
    f"{BASE_URL}/trackings/",
    headers={"Authorization": f"Bearer {admin_token}"}
)

if all_trackings.status_code == 200:
    trackings = [t for t in all_trackings.json() if t['tracking_number'] == test_tn_1]
    print(f"   Found {len(trackings)} records:")
    for t in trackings:
        print(f"   - ID {t['id']}: Owner={t.get('owner_username', 'NULL')}, Mark={t.get('shipping_mark', '(empty)')}")
    
    # Verify sync worked
    owners = set(t.get('owner_username') for t in trackings if t.get('owner_username'))
    marks = set(t.get('shipping_mark') for t in trackings if t.get('shipping_mark'))
    
    if len(owners) == 1 and len(marks) == 1:
        print(f"\n   ✅ PASS: All records unified to Owner={owners.pop()}, Mark={marks.pop()}")
    else:
        print(f"\n   ❌ FAIL: Records not unified!")
        print(f"      Distinct owners: {owners}")
        print(f"      Distinct marks: {marks}")

print("\n" + "=" * 80)
print("SCENARIO 2: Admin adds first, then user adds later")
print("=" * 80)

# Admin adds tracking first
print(f"\n6. Admin adds tracking: {test_tn_2}")
admin_add_2 = requests.post(
    f"{BASE_URL}/trackings/",
    headers={"Authorization": f"Bearer {admin_token}"},
    json={
        "tracking_number": test_tn_2,
        "cbm": "1.0",
        "description": "Admin added first"
    }
)

if admin_add_2.status_code not in [200, 201]:
    print(f"❌ Failed to add tracking: {admin_add_2.status_code}")
    print(f"   {admin_add_2.text}")
else:
    print(f"✓ Admin added tracking")
    admin_tracking_2 = admin_add_2.json()
    print(f"   Owner: {admin_tracking_2.get('owner_username', 'N/A')}")
    print(f"   Mark: {admin_tracking_2.get('shipping_mark', '(empty)')}")

# User adds same tracking number
print(f"\n7. User adds same tracking number: {test_tn_2}")
user_add_2 = requests.post(
    f"{BASE_URL}/trackings/",
    headers={"Authorization": f"Bearer {user_token}"},
    json={
        "tracking_number": test_tn_2,
        "cbm": "1.5",
        "description": "User added later"
    }
)

if user_add_2.status_code not in [200, 201]:
    print(f"❌ Failed to add tracking: {user_add_2.status_code}")
    print(f"   {user_add_2.text}")
else:
    print(f"✓ User added tracking")
    user_tracking_2 = user_add_2.json()
    print(f"   Owner: {user_tracking_2.get('owner_username', 'N/A')}")
    print(f"   Mark: {user_tracking_2.get('shipping_mark', '(empty)')}")

# Fetch all records with this tracking number
print(f"\n8. Checking all records for {test_tn_2}...")
all_trackings_2 = requests.get(
    f"{BASE_URL}/trackings/",
    headers={"Authorization": f"Bearer {admin_token}"}
)

if all_trackings_2.status_code == 200:
    trackings_2 = [t for t in all_trackings_2.json() if t['tracking_number'] == test_tn_2]
    print(f"   Found {len(trackings_2)} records:")
    for t in trackings_2:
        print(f"   - ID {t['id']}: Owner={t.get('owner_username', 'NULL')}, Mark={t.get('shipping_mark', '(empty)')}")
    
    # Verify sync worked
    owners_2 = set(t.get('owner_username') for t in trackings_2 if t.get('owner_username'))
    marks_2 = set(t.get('shipping_mark') for t in trackings_2 if t.get('shipping_mark'))
    
    if len(owners_2) == 1 and len(marks_2) == 1:
        print(f"\n   ✅ PASS: All records unified to Owner={owners_2.pop()}, Mark={marks_2.pop()}")
    else:
        print(f"\n   ❌ FAIL: Records not unified!")
        print(f"      Distinct owners: {owners_2}")
        print(f"      Distinct marks: {marks_2}")

print("\n" + "=" * 80)
print("TEST COMPLETE")
print("=" * 80)
