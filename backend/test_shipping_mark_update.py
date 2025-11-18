"""Test script to diagnose shipping mark auto-update issue"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bsbackend.settings")
django.setup()

from buysellapi.models import Tracking, ShippingMark, UserModel

print("=" * 60)
print("SHIPPING MARK AUTO-UPDATE DIAGNOSTIC TEST")
print("=" * 60)

# 1. Check if there are any users with shipping marks
print("\n1. Checking users with shipping marks:")
marks = ShippingMark.objects.all()
print(f"   Total shipping marks: {marks.count()}")
for mark in marks:
    print(f"   - {mark.mark_id} → {mark.owner.username} (role: {mark.owner.role})")

# 2. Check trackings with owners but no shipping_mark
print("\n2. Checking trackings with owners but no shipping_mark:")
trackings_no_mark = Tracking.objects.filter(owner__isnull=False, shipping_mark="")
print(f"   Found {trackings_no_mark.count()} trackings with owners but no mark")
for t in trackings_no_mark[:5]:  # Show first 5
    owner_mark = "NO MARK"
    try:
        mark = ShippingMark.objects.get(owner=t.owner)
        owner_mark = mark.mark_id
    except ShippingMark.DoesNotExist:
        owner_mark = "OWNER HAS NO MARK"
    print(
        f"   - {t.tracking_number} → Owner: {t.owner.username} (should be: {owner_mark})"
    )

# 3. Check if signals are working by testing a specific case
print("\n3. Testing signal functionality:")
# Find a user with a shipping mark and a tracking
test_user = None
for mark in marks:
    if mark.owner.role != "admin":
        test_user = mark.owner
        break

if test_user:
    print(f"   Test user: {test_user.username}")
    user_mark = ShippingMark.objects.get(owner=test_user)
    print(f"   User's mark: {user_mark.mark_id}")

    # Check their trackings
    user_trackings = Tracking.objects.filter(owner=test_user)
    print(f"   User has {user_trackings.count()} tracking(s)")

    for tracking in user_trackings[:3]:
        print(f"   - Tracking: {tracking.tracking_number}")
        print(f"     Current shipping_mark: '{tracking.shipping_mark}'")
        print(f"     Expected shipping_mark: '{user_mark.mark_id}'")
        print(f"     Match: {tracking.shipping_mark == user_mark.mark_id}")
else:
    print("   No non-admin users with shipping marks found for testing")

# 4. Check admin trackings
print("\n4. Checking admin-created trackings:")
admin_trackings = Tracking.objects.filter(owner__role="admin")
print(f"   Found {admin_trackings.count()} trackings owned by admins")
if admin_trackings.exists():
    print(
        "   WARNING: Admins should not own trackings. These should be unassigned or owned by customers."
    )
    for t in admin_trackings[:5]:
        print(f"   - {t.tracking_number} owned by admin: {t.owner.username}")

# 5. Check unassigned trackings
print("\n5. Checking unassigned trackings (no owner):")
unassigned = Tracking.objects.filter(owner__isnull=True)
print(f"   Found {unassigned.count()} unassigned trackings")
for t in unassigned[:5]:
    print(f"   - {t.tracking_number} (shipping_mark: '{t.shipping_mark}')")

print("\n" + "=" * 60)
print("DIAGNOSIS SUMMARY")
print("=" * 60)
print("\nPossible issues:")
print("1. If trackings have owners but shipping_mark is empty:")
print("   → Signal might not be firing or there's a logic issue")
print("2. If admins own trackings:")
print("   → Admins should create trackings WITHOUT assigning themselves as owner")
print("3. If users don't have shipping marks:")
print("   → Users need to generate shipping marks first")
print("\nRecommended fixes will be provided based on findings above.")
