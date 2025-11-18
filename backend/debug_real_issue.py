"""
Debug script to see EXACTLY what's happening with real tracking data
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bsbackend.settings")
django.setup()

from buysellapi.models import Tracking, UserModel, ShippingMark

print("\n" + "=" * 70)
print("CURRENT DATABASE STATE")
print("=" * 70)

# Show all users with shipping marks
print("\n1. USERS WITH SHIPPING MARKS:")
print("-" * 70)
users_with_marks = UserModel.objects.filter(role="user").exclude(
    shipping_mark__isnull=True
)
for user in users_with_marks:
    try:
        mark = user.shipping_mark.mark_id
        print(f"   User: {user.username:15} | Mark: {mark:10} | ID: {user.id}")
    except:
        print(f"   User: {user.username:15} | Mark: ERROR")

# Show all trackings
print("\n2. ALL TRACKINGS:")
print("-" * 70)
all_trackings = Tracking.objects.all().order_by("-date_added")[:20]
print(f"   Total trackings: {Tracking.objects.count()}")
print(f"   Showing last 20:")
print()
for t in all_trackings:
    owner_name = t.owner.username if t.owner else "NO_OWNER"
    owner_role = f"({t.owner.role})" if t.owner else ""
    print(
        f"   Number: {t.tracking_number:20} | Owner: {owner_name:15} {owner_role:10} | Mark: {t.shipping_mark:10}"
    )

# Check for problem cases
print("\n3. PROBLEM CASES:")
print("-" * 70)

# Trackings with marks but no owner
no_owner_with_mark = Tracking.objects.filter(owner__isnull=True).exclude(
    shipping_mark=""
)
print(f"   Trackings with MARK but NO OWNER: {no_owner_with_mark.count()}")
for t in no_owner_with_mark[:5]:
    print(f"      - {t.tracking_number}: mark={t.shipping_mark}")

# Trackings owned by admin
admin_owned = Tracking.objects.filter(owner__role="admin")
print(f"\n   Trackings OWNED BY ADMIN: {admin_owned.count()}")
for t in admin_owned[:5]:
    print(
        f"      - {t.tracking_number}: owner={t.owner.username}, mark={t.shipping_mark}"
    )

# Trackings with owner but no mark
owner_no_mark = Tracking.objects.filter(owner__isnull=False, shipping_mark="").exclude(
    owner__role="admin"
)
print(f"\n   Trackings with OWNER but NO MARK: {owner_no_mark.count()}")
for t in owner_no_mark[:5]:
    print(f"      - {t.tracking_number}: owner={t.owner.username}")

print("\n" + "=" * 70)
print("TESTING sync_duplicates() METHOD")
print("=" * 70)

# Test the sync method on a real tracking
test_tracking = (
    Tracking.objects.filter(owner__isnull=False).exclude(owner__role="admin").first()
)
if test_tracking:
    print(f"\nTesting with: {test_tracking.tracking_number}")
    print(
        f"BEFORE sync: owner={test_tracking.owner.username if test_tracking.owner else 'None'}, mark={test_tracking.shipping_mark}"
    )

    # Call sync
    test_tracking.sync_duplicates()

    # Reload from DB
    test_tracking.refresh_from_db()
    print(
        f"AFTER sync:  owner={test_tracking.owner.username if test_tracking.owner else 'None'}, mark={test_tracking.shipping_mark}"
    )
else:
    print("\nNo suitable tracking found for testing")

print("\n" + "=" * 70)
print("RECOMMENDATIONS")
print("=" * 70)

# Count issues
issues = no_owner_with_mark.count() + admin_owned.count() + owner_no_mark.count()
if issues > 0:
    print(f"\n⚠️  Found {issues} trackings that need fixing!")
    print("\nTo fix these, run:")
    print("   py -3 manage.py normalize_tracking_shipping_marks")
else:
    print("\n✅ No obvious issues found in database!")

print()
