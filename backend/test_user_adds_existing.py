"""
Test to see what happens when USER adds a tracking that admin already added
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
print("TESTING: USER ADDING TRACKING THAT ADMIN ALREADY HAS")
print("=" * 70)

# Setup
factory = APIRequestFactory()
view = TrackingListCreateView.as_view()

user = UserModel.objects.get(username="kwabena1")
user_mark = user.shipping_mark.mark_id
admin = DjangoUser.objects.filter(is_staff=True).first()
user_django = DjangoUser.objects.get(username=user.username)

test_number = "REAL_TEST_777"

# Clean up
Tracking.objects.filter(tracking_number=test_number).delete()

print(f"\nUser: {user.username} (mark: {user_mark})")
print(f"Admin: {admin.username}")
print(f"Testing with: {test_number}\n")

# Step 1: Admin adds tracking
print("STEP 1: Admin adds tracking (no owner)")
print("-" * 70)
request = factory.post(
    "/api/trackings/",
    {"tracking_number": test_number, "status": "pending", "cbm": "1.5"},
    format="json",
)
force_authenticate(request, user=admin)

response = view(request)
print(f"Response Status: {response.status_code}")
print(f"Response Data: {response.data}\n")

# Check DB
tracking = Tracking.objects.get(tracking_number=test_number)
owner_name = tracking.owner.username if tracking.owner else "NO_OWNER"
print(
    f"DB State: owner={owner_name}, mark='{tracking.shipping_mark}', cbm={tracking.cbm}"
)

# Step 2: User tries to add SAME tracking from frontend
print("\n\nSTEP 2: User tries to add same tracking from frontend")
print("-" * 70)
request = factory.post(
    "/api/trackings/",
    {"tracking_number": test_number, "status": "in_transit"},
    format="json",
)
force_authenticate(request, user=user_django)

response = view(request)
print(f"Response Status: {response.status_code}")
print(f"Response Data: {response.data}\n")

# Check DB
tracking = Tracking.objects.get(tracking_number=test_number)
owner_name = tracking.owner.username if tracking.owner else "NO_OWNER"
print(
    f"DB State: owner={owner_name}, mark='{tracking.shipping_mark}', status={tracking.status}"
)

# Verify
print("\n" + "=" * 70)
print("VERIFICATION")
print("=" * 70)

if tracking.owner and tracking.owner.username == user.username:
    print(f"✅ SUCCESS: Tracking owned by {user.username}")
else:
    print(f"❌ PROBLEM: Tracking owned by {owner_name} instead of {user.username}")

if tracking.shipping_mark == user_mark:
    print(f"✅ SUCCESS: Tracking has mark {user_mark}")
else:
    print(
        f"❌ PROBLEM: Tracking has mark '{tracking.shipping_mark}' instead of {user_mark}"
    )

if response.status_code in [200, 201]:
    print(f"✅ SUCCESS: API accepted the request")
else:
    print(f"❌ PROBLEM: API returned {response.status_code}")

# Cleanup
Tracking.objects.filter(tracking_number=test_number).delete()
print(f"\n✓ Cleaned up test data")
