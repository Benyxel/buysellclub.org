"""
Comprehensive diagnostic script to identify why tracking sync isn't working.
Run with: python manage.py shell < diagnose_tracking_sync.py
Or: py -3 manage.py shell
Then paste this script.
"""

import os
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bsbackend.settings")
django.setup()

from buysellapi.models import Tracking, ShippingMark, UserModel
from django.db.models import Count, Q

print("=" * 80)
print("DIAGNOSTIC: Tracking Owner/Mark Sync Issue")
print("=" * 80)

# 1. Check if signals are registered
print("\n1. SIGNALS REGISTRATION CHECK:")
from django.db.models.signals import post_save
from buysellapi.signals import (
    auto_update_shipping_mark,
    propagate_owner_to_related_trackings,
    unify_owner_and_mark_across_duplicates,
)

receivers = post_save._live_receivers(Tracking)
print(f"   Total post_save receivers for Tracking: {len(receivers)}")
print("   Registered signal handlers:")
for receiver in receivers:
    print(f"   - {receiver.__name__}")

# 2. Find duplicate tracking numbers
print("\n2. DUPLICATE TRACKING NUMBERS:")
duplicates = (
    Tracking.objects.values("tracking_number")
    .annotate(count=Count("id"))
    .filter(count__gt=1)
    .order_by("-count")
)

print(f"   Found {duplicates.count()} tracking numbers with duplicates")
for dup in duplicates[:5]:  # Show first 5
    tn = dup["tracking_number"]
    records = Tracking.objects.filter(tracking_number=tn).order_by("date_added")
    print(f"\n   Tracking: {tn} ({dup['count']} records)")
    for i, rec in enumerate(records, 1):
        owner_info = (
            f"{rec.owner.username} (role={rec.owner.role})" if rec.owner else "None"
        )
        mark = rec.shipping_mark or "(empty)"
        print(
            f"      #{i}: ID={rec.id}, Owner={owner_info}, Mark={mark}, Added={rec.date_added}"
        )

# 3. Check shipping marks
print("\n3. SHIPPING MARKS:")
marks = ShippingMark.objects.all()
print(f"   Total shipping marks: {marks.count()}")
for mark in marks[:10]:  # Show first 10
    print(
        f"   - {mark.mark_id} → Owner: {mark.owner.username} (ID={mark.owner.id}, role={mark.owner.role})"
    )

# 4. Find problematic cases
print("\n4. PROBLEMATIC CASES:")

# Case A: Same tracking_number, different owners
print("\n   A. Same tracking_number with DIFFERENT owners:")
for dup in duplicates[:10]:
    tn = dup["tracking_number"]
    records = Tracking.objects.filter(tracking_number=tn)
    owners = set(r.owner_id for r in records if r.owner)
    if len(owners) > 1:
        print(f"      {tn}: {len(owners)} different owners")
        for rec in records:
            owner_info = (
                f"{rec.owner.username} (ID={rec.owner_id}, role={rec.owner.role})"
                if rec.owner
                else "NULL"
            )
            print(
                f"         - ID={rec.id}: owner={owner_info}, mark={rec.shipping_mark or '(empty)'}"
            )

# Case B: Same tracking_number, different marks
print("\n   B. Same tracking_number with DIFFERENT marks:")
for dup in duplicates[:10]:
    tn = dup["tracking_number"]
    records = Tracking.objects.filter(tracking_number=tn)
    marks = set(r.shipping_mark for r in records if r.shipping_mark)
    if len(marks) > 1:
        print(f"      {tn}: {len(marks)} different marks: {marks}")
        for rec in records:
            owner_info = f"{rec.owner.username}" if rec.owner else "NULL"
            print(
                f"         - ID={rec.id}: owner={owner_info}, mark={rec.shipping_mark or '(empty)'}"
            )

# Case C: Has shipping_mark but owner is NULL or admin
print("\n   C. Has shipping_mark but owner is NULL or admin:")
mismatched = (
    Tracking.objects.filter(Q(owner__isnull=True) | Q(owner__role="admin"))
    .exclude(shipping_mark="")
    .exclude(shipping_mark__isnull=True)
)
print(f"      Found {mismatched.count()} records")
for rec in mismatched[:5]:
    owner_info = (
        f"{rec.owner.username} (role={rec.owner.role})" if rec.owner else "NULL"
    )
    print(
        f"      - Tracking: {rec.tracking_number}, Owner: {owner_info}, Mark: {rec.shipping_mark}"
    )

# 5. Admin users
print("\n5. ADMIN USERS:")
admins = UserModel.objects.filter(role="admin")
print(f"   Total admin users: {admins.count()}")
for admin in admins:
    print(f"   - {admin.username} (ID={admin.id})")
    admin_trackings = Tracking.objects.filter(owner=admin).count()
    print(f"     Trackings owned: {admin_trackings}")

# 6. Test case simulation
print("\n6. TEST CASE SIMULATION:")
print("   Let's create a test scenario to see if signals fire...")

# Find or create a test user
test_user = UserModel.objects.filter(role="user").exclude(username="admin").first()
if test_user:
    print(f"   Using test user: {test_user.username} (ID={test_user.id})")

    # Check if user has a shipping mark
    try:
        user_mark = ShippingMark.objects.get(owner=test_user)
        print(f"   User's shipping mark: {user_mark.mark_id}")
    except ShippingMark.DoesNotExist:
        print("   ⚠ User has NO shipping mark!")
        user_mark = None

    # Find a tracking number with duplicates
    if duplicates.exists():
        test_tn = duplicates.first()["tracking_number"]
        test_records = Tracking.objects.filter(tracking_number=test_tn)
        print(f"\n   Test tracking number: {test_tn}")
        print(f"   Current state ({test_records.count()} records):")
        for rec in test_records:
            owner_info = (
                f"{rec.owner.username} (role={rec.owner.role})" if rec.owner else "NULL"
            )
            print(
                f"      - ID={rec.id}: owner={owner_info}, mark={rec.shipping_mark or '(empty)'}"
            )
else:
    print("   ⚠ No non-admin users found for testing!")

print("\n" + "=" * 80)
print("RECOMMENDATIONS:")
print("=" * 80)

# Count issues
issue_count = 0

# Check signal registration
if len(receivers) < 3:
    print(
        f"⚠ ISSUE {issue_count + 1}: Only {len(receivers)} signals registered (expected at least 3)"
    )
    print("   → Check that buysellapi.signals is imported in apps.py ready() method")
    issue_count += 1

# Check for mismatched data
if mismatched.count() > 0:
    print(
        f"⚠ ISSUE {issue_count + 1}: {mismatched.count()} trackings have marks but no valid owner"
    )
    print("   → Run: py -3 manage.py normalize_tracking_shipping_marks")
    issue_count += 1

# Check for users without marks
users_without_marks = (
    UserModel.objects.filter(role="user")
    .exclude(id__in=ShippingMark.objects.values_list("owner_id", flat=True))
    .count()
)
if users_without_marks > 0:
    print(
        f"⚠ ISSUE {issue_count + 1}: {users_without_marks} regular users don't have shipping marks"
    )
    print("   → Ensure shipping marks are created for all users who add trackings")
    issue_count += 1

# Check for inconsistent duplicates
inconsistent = 0
for dup in duplicates:
    tn = dup["tracking_number"]
    records = Tracking.objects.filter(tracking_number=tn)
    owners = set(r.owner_id for r in records if r.owner)
    if len(owners) > 1:
        inconsistent += 1

if inconsistent > 0:
    print(
        f"⚠ ISSUE {issue_count + 1}: {inconsistent} tracking numbers have inconsistent owners"
    )
    print("   → Signals should fix this on next save, or run normalize command")
    issue_count += 1

if issue_count == 0:
    print("✓ No obvious issues detected!")
    print("  If sync still doesn't work, the issue may be:")
    print("  - Signals not firing (check middleware/transaction handling)")
    print("  - Admin interface bypassing signals (raw=True saves)")
    print("  - Data being imported via loaddata/fixtures")

print("\n" + "=" * 80)
