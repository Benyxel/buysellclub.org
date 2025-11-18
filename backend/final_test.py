"""
FINAL COMPREHENSIVE TEST - Tests all real-world scenarios
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bsbackend.settings")
django.setup()

from buysellapi.models import Tracking, UserModel, ShippingMark
from rest_framework.test import APIRequestFactory, force_authenticate
from buysellapi.views import TrackingListCreateView
from django.contrib.auth.models import User as DjangoUser


def test_scenario(title, steps):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)

    factory = APIRequestFactory()
    view = TrackingListCreateView.as_view()

    for i, step in enumerate(steps, 1):
        print(f"\n{i}. {step['desc']}")

        # Make API call
        user_obj = DjangoUser.objects.get(username=step["user"])
        request = factory.post("/api/trackings/", step["data"], format="json")
        force_authenticate(request, user=user_obj)
        response = view(request)

        print(f"   Response: {response.status_code}")

        # Check result
        tracking = Tracking.objects.get(tracking_number=step["data"]["tracking_number"])
        owner = tracking.owner.username if tracking.owner else "None"
        print(f"   DB: owner={owner}, mark={tracking.shipping_mark}")

        # Verify expectations
        if step.get("expect_owner"):
            if tracking.owner and tracking.owner.username == step["expect_owner"]:
                print(f"   ✅ Owner is correct: {step['expect_owner']}")
            else:
                print(f"   ❌ FAIL: Expected owner {step['expect_owner']}, got {owner}")
                return False

        if step.get("expect_mark"):
            if tracking.shipping_mark == step["expect_mark"]:
                print(f"   ✅ Mark is correct: {step['expect_mark']}")
            else:
                print(
                    f"   ❌ FAIL: Expected mark {step['expect_mark']}, got {tracking.shipping_mark}"
                )
                return False

    print(f"\n✅ {title} PASSED!")
    return True


# Get users
user1 = UserModel.objects.get(username="kwabena1")
mark1 = user1.shipping_mark.mark_id
admin = DjangoUser.objects.filter(is_staff=True).first().username

print("\n" + "=" * 70)
print("COMPREHENSIVE SYNC TEST")
print("=" * 70)
print(f"User: {user1.username} (mark: {mark1})")
print(f"Admin: {admin}")

# Clean up
Tracking.objects.filter(tracking_number__in=["TEST_A", "TEST_B", "TEST_C"]).delete()

# Test 1: User first, admin later
test1 = test_scenario(
    "TEST 1: User adds first, Admin updates later",
    [
        {
            "desc": f"{user1.username} creates tracking TEST_A",
            "user": user1.username,
            "data": {"tracking_number": "TEST_A", "status": "pending"},
            "expect_owner": user1.username,
            "expect_mark": mark1,
        },
        {
            "desc": f"{admin} tries to add TEST_A with different status",
            "user": admin,
            "data": {"tracking_number": "TEST_A", "status": "in_transit", "cbm": "2.5"},
            "expect_owner": user1.username,  # Should KEEP user's owner
            "expect_mark": mark1,  # Should KEEP user's mark
        },
    ],
)

# Test 2: Admin first (no owner), user later
test2 = test_scenario(
    "TEST 2: Admin adds first (no owner), User claims it",
    [
        {
            "desc": f"{admin} creates tracking TEST_B (no owner assigned)",
            "user": admin,
            "data": {"tracking_number": "TEST_B", "status": "pending"},
            "expect_owner": None,
        },
        {
            "desc": f"{user1.username} tries to add TEST_B",
            "user": user1.username,
            "data": {"tracking_number": "TEST_B", "status": "in_transit"},
            "expect_owner": user1.username,  # Should GET user as owner
            "expect_mark": mark1,  # Should GET user's mark
        },
    ],
)

# Test 3: User adds, admin updates status multiple times
test3 = test_scenario(
    "TEST 3: User adds, Admin updates multiple times",
    [
        {
            "desc": f"{user1.username} creates tracking TEST_C",
            "user": user1.username,
            "data": {"tracking_number": "TEST_C", "status": "pending"},
            "expect_owner": user1.username,
            "expect_mark": mark1,
        },
        {
            "desc": f"{admin} updates to arrived",
            "user": admin,
            "data": {"tracking_number": "TEST_C", "status": "arrived"},
            "expect_owner": user1.username,
            "expect_mark": mark1,
        },
        {
            "desc": f"{admin} updates to vessel",
            "user": admin,
            "data": {"tracking_number": "TEST_C", "status": "vessel", "cbm": "1.2"},
            "expect_owner": user1.username,
            "expect_mark": mark1,
        },
    ],
)

# Clean up
Tracking.objects.filter(tracking_number__in=["TEST_A", "TEST_B", "TEST_C"]).delete()

# Summary
print("\n" + "=" * 70)
print("FINAL RESULTS")
print("=" * 70)
results = [
    ("User first, Admin later", test1),
    ("Admin first, User claims", test2),
    ("Multiple admin updates", test3),
]

for name, passed in results:
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {name}")

if all(r[1] for r in results):
    print("\n🎉 ALL TESTS PASSED! The sync fix is working perfectly!")
else:
    print("\n❌ Some tests failed. Check output above.")
