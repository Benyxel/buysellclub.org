"""
Simulate REAL API calls to test the sync behavior
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
print("SIMULATING REAL API SCENARIO")
print("=" * 70)

# Get test users
user = UserModel.objects.get(username="kwabena1")  # Regular user with mark FIM979
admin_django = DjangoUser.objects.filter(is_staff=True).first()

if not admin_django:
    print("❌ No Django admin user found. Creating one...")
    admin_django = DjangoUser.objects.create_superuser(
        "admin", "admin@test.com", "admin123"
    )

print(f"\nUsing user: {user.username} (mark: {user.shipping_mark.mark_id})")
print(f"Using admin: {admin_django.username}")

# Create API factory
factory = APIRequestFactory()

# Test tracking number
test_number = "API_TEST_888"

# Clean up if exists
Tracking.objects.filter(tracking_number=test_number).delete()
print(f"\nTesting with tracking number: {test_number}")

print("\n" + "-" * 70)
print("SCENARIO 1: User adds tracking first")
print("-" * 70)

# User creates tracking via API
request = factory.post(
    "/api/trackings/",
    {"tracking_number": test_number, "status": "pending"},
    format="json",
)
force_authenticate(request, user=DjangoUser.objects.get(username=user.username))

view = TrackingListCreateView.as_view()
response = view(request)

print(f"API Response status: {response.status_code}")
if response.status_code == 201:
    print(f"✓ Tracking created")

    # Check database
    tracking = Tracking.objects.get(tracking_number=test_number)
    print(
        f"  DB State: owner={tracking.owner.username if tracking.owner else 'None'}, mark={tracking.shipping_mark}"
    )
else:
    print(f"❌ Failed: {response.data}")

print("\n" + "-" * 70)
print("SCENARIO 2: Admin tries to add SAME tracking")
print("-" * 70)

# Admin tries to add same tracking
request = factory.post(
    "/api/trackings/",
    {"tracking_number": test_number, "status": "in_transit", "cbm": "1.5"},
    format="json",
)
force_authenticate(request, user=admin_django)

response = view(request)

print(f"API Response status: {response.status_code}")
if response.status_code in [200, 201]:
    print(f"✓ API call succeeded")

    # Check database
    tracking = Tracking.objects.get(tracking_number=test_number)
    owner_name = tracking.owner.username if tracking.owner else "NO_OWNER"
    print(
        f"  DB State: owner={owner_name}, mark={tracking.shipping_mark}, cbm={tracking.cbm}"
    )

    # Verify
    if tracking.owner and tracking.owner.username == user.username:
        print(f"\n✅ SUCCESS: Tracking still owned by {user.username}!")
    else:
        print(f"\n❌ PROBLEM: Owner changed to {owner_name}!")

    if tracking.shipping_mark == user.shipping_mark.mark_id:
        print(f"✅ SUCCESS: Shipping mark is still {user.shipping_mark.mark_id}!")
    else:
        print(f"❌ PROBLEM: Shipping mark is {tracking.shipping_mark}!")
else:
    print(f"❌ API call failed: {response.data}")

print("\n" + "-" * 70)
print("SCENARIO 3: Admin adds NEW tracking (no owner)")
print("-" * 70)

test_number2 = "API_TEST_999"
Tracking.objects.filter(tracking_number=test_number2).delete()

# Admin creates unassigned tracking
request = factory.post(
    "/api/trackings/",
    {"tracking_number": test_number2, "status": "pending"},
    format="json",
)
force_authenticate(request, user=admin_django)

response = view(request)
print(f"API Response status: {response.status_code}")
if response.status_code == 201:
    tracking = Tracking.objects.get(tracking_number=test_number2)
    print(f"✓ Created: owner={tracking.owner}, mark={tracking.shipping_mark}")

print("\n" + "-" * 70)
print("SCENARIO 4: User tries to add SAME tracking (that admin added)")
print("-" * 70)

# User tries to add same tracking
request = factory.post(
    "/api/trackings/",
    {"tracking_number": test_number2, "status": "in_transit"},
    format="json",
)
force_authenticate(request, user=DjangoUser.objects.get(username=user.username))

response = view(request)
print(f"API Response status: {response.status_code}")
if response.status_code in [200, 201]:
    tracking = Tracking.objects.get(tracking_number=test_number2)
    owner_name = tracking.owner.username if tracking.owner else "NO_OWNER"
    print(f"✓ API call succeeded")
    print(f"  DB State: owner={owner_name}, mark={tracking.shipping_mark}")

    if tracking.owner and tracking.owner.username == user.username:
        print(f"\n✅ SUCCESS: Tracking now owned by {user.username}!")
    else:
        print(f"\n❌ PROBLEM: Owner is {owner_name}!")

    if tracking.shipping_mark == user.shipping_mark.mark_id:
        print(f"✅ SUCCESS: Shipping mark is {user.shipping_mark.mark_id}!")
    else:
        print(f"❌ PROBLEM: Shipping mark is {tracking.shipping_mark}!")
else:
    print(f"❌ API call failed: {response.data}")

# Cleanup
print("\n" + "=" * 70)
Tracking.objects.filter(tracking_number__in=[test_number, test_number2]).delete()
print("✓ Cleaned up test data")
print("=" * 70)
