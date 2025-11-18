"""
Test when USER adds FIRST, then ADMIN tries to add
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bsbackend.settings")
django.setup()

from buysellapi.models import Tracking, UserModel, ShippingMark
from rest_framework.test import APIRequestFactory, force_authenticate
from buysellapi.views import TrackingListCreateView
from django.contrib.auth.models import User as DjangoUser

print("\n" + "=" * 70)
print("TESTING: USER ADDS FIRST, THEN ADMIN TRIES TO ADD")
print("=" * 70)

# Setup
factory = APIRequestFactory()
view = TrackingListCreateView.as_view()

user = UserModel.objects.get(username="kwabena1")
user_mark = user.shipping_mark.mark_id
admin = DjangoUser.objects.filter(is_staff=True).first()
user_django = DjangoUser.objects.get(username=user.username)

test_number = "USER_FIRST_888"

# Clean up
Tracking.objects.filter(tracking_number=test_number).delete()

print(f"\nUser: {user.username} (mark: {user_mark})")
print(f"Admin: {admin.username}")
print(f"Testing with: {test_number}\n")

# Step 1: USER adds tracking FIRST
print("STEP 1: User adds tracking FIRST")
print("-" * 70)
request = factory.post(
    "/api/trackings/",
    {"tracking_number": test_number, "status": "pending"},
    format="json",
)
force_authenticate(request, user=user_django)

response = view(request)
print(f"Response Status: {response.status_code}")
if "shipping_mark" in response.data:
    print(f"Response shipping_mark: {response.data['shipping_mark']}")
if "owner_username" in response.data:
    print(f"Response owner: {response.data['owner_username']}")

# Check DB
tracking = Tracking.objects.get(tracking_number=test_number)
owner_name = tracking.owner.username if tracking.owner else "NO_OWNER"
print(f"\nDB State: owner={owner_name}, mark='{tracking.shipping_mark}'")

if tracking.owner and tracking.owner.username == user.username:
    print(f"✅ User successfully created tracking with ownership")
else:
    print(f"❌ PROBLEM: Owner is {owner_name}")

if tracking.shipping_mark == user_mark:
    print(f"✅ User's mark ({user_mark}) is set")
else:
    print(f"❌ PROBLEM: Mark is '{tracking.shipping_mark}' instead of {user_mark}")

# Step 2: ADMIN tries to add SAME tracking
print("\n\nSTEP 2: Admin tries to add same tracking")
print("-" * 70)
request = factory.post(
    "/api/trackings/",
    {"tracking_number": test_number, "status": "in_transit", "cbm": "2.5"},
    format="json",
)
force_authenticate(request, user=admin)

response = view(request)
print(f"Response Status: {response.status_code}")
if "shipping_mark" in response.data:
    print(f"Response shipping_mark: {response.data['shipping_mark']}")
if "owner_username" in response.data:
    print(f"Response owner: {response.data['owner_username']}")

# Check DB
tracking = Tracking.objects.get(tracking_number=test_number)
owner_name = tracking.owner.username if tracking.owner else "NO_OWNER"
print(
    f"\nDB State: owner={owner_name}, mark='{tracking.shipping_mark}', status={tracking.status}, cbm={tracking.cbm}"
)

# Verify
print("\n" + "=" * 70)
print("VERIFICATION")
print("=" * 70)

if tracking.owner and tracking.owner.username == user.username:
    print(f"✅ SUCCESS: Tracking STILL owned by {user.username}")
else:
    print(f"❌ PROBLEM: Tracking owned by {owner_name} instead of {user.username}")

if tracking.shipping_mark == user_mark:
    print(f"✅ SUCCESS: Tracking STILL has user's mark {user_mark}")
else:
    print(
        f"❌ PROBLEM: Tracking has mark '{tracking.shipping_mark}' instead of {user_mark}"
    )

if tracking.cbm and str(tracking.cbm) == "2.500":
    print(f"✅ SUCCESS: Admin's CBM update was applied")
else:
    print(f"⚠️  WARNING: CBM is {tracking.cbm}")

if response.status_code in [200, 201]:
    print(f"✅ SUCCESS: API accepted admin's request")
else:
    print(f"❌ PROBLEM: API returned {response.status_code}")

# Cleanup
Tracking.objects.filter(tracking_number=test_number).delete()
print(f"\n✓ Cleaned up test data")
