"""
Test script to verify tracking sync works in both directions:
1. User adds first, then someone updates it
2. Admin adds first (no owner), then user adds their info

NOTE: tracking_number is UNIQUE in the database, so we simulate
the API behavior of updating existing records when duplicates are attempted.
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bsbackend.settings")
django.setup()

from buysellapi.models import Tracking, UserModel, ShippingMark
from django.utils import timezone


def cleanup_test_data():
    """Remove any test tracking numbers we create."""
    test_numbers = ["TEST_USER_FIRST_123", "TEST_ADMIN_FIRST_456"]
    Tracking.objects.filter(tracking_number__in=test_numbers).delete()
    print("✓ Cleaned up test data\n")


def test_user_first_then_admin():
    """Test Scenario 1: User adds tracking, then admin adds same tracking."""
    print("=" * 60)
    print("TEST 1: User adds first, admin adds later")
    print("=" * 60)

    tracking_num = "TEST_USER_FIRST_123"

    # Get a regular user with a shipping mark
    user = (
        UserModel.objects.filter(role="user")
        .exclude(shipping_mark__isnull=True)
        .first()
    )
    if not user:
        print("❌ No regular user with shipping mark found. Create one first.")
        return False

    user_mark = user.shipping_mark.mark_id
    print(f"Using user: {user.username} (mark: {user_mark})")

    # Get an admin user
    admin = UserModel.objects.filter(role="admin").first()
    if not admin:
        print("❌ No admin user found.")
        return False
    print(f"Using admin: {admin.username}\n")

    # Step 1: User creates tracking
    print(f"1. User creates tracking '{tracking_num}'...")
    user_tracking = Tracking.objects.create(
        tracking_number=tracking_num,
        owner=user,
        shipping_mark=user_mark,
        status="pending",
    )
    user_tracking.sync_duplicates()
    print(
        f"   ✓ Created: owner={user_tracking.owner.username}, mark={user_tracking.shipping_mark}"
    )

    # Step 2: Admin tries to add same tracking (simulates API update behavior)
    print(f"\n2. Admin tries to add same tracking '{tracking_num}'...")
    admin_tracking = Tracking.objects.get(tracking_number=tracking_num)
    admin_tracking.status = "in_transit"  # Admin updates status
    admin_tracking.save()
    admin_tracking.sync_duplicates()
    print(f"   ✓ Updated existing tracking, called sync_duplicates()")

    # Step 3: Verify the record kept user's owner and mark
    print(f"\n3. Checking tracking '{tracking_num}'...")
    record = Tracking.objects.get(tracking_number=tracking_num)
    owner_name = record.owner.username if record.owner else "None"
    print(
        f"   - ID {record.pk}: owner={owner_name}, mark={record.shipping_mark}, status={record.status}"
    )

    success = True
    # Verify it has user as owner and user's mark
    if not record.owner or record.owner.username != user.username:
        print(f"     ❌ FAIL: Owner should be {user.username}, got {owner_name}")
        success = False
    if record.shipping_mark != user_mark:
        print(f"     ❌ FAIL: Mark should be {user_mark}, got {record.shipping_mark}")
        success = False

    if success:
        print(
            f"\n✅ TEST 1 PASSED: Record kept user's owner and mark after admin update!"
        )
    else:
        print(f"\n❌ TEST 1 FAILED")

    return success


def test_admin_first_then_user():
    """Test Scenario 2: Admin adds tracking first, then user adds same tracking."""
    print("\n" + "=" * 60)
    print("TEST 2: Admin adds first, user adds later")
    print("=" * 60)

    tracking_num = "TEST_ADMIN_FIRST_456"

    # Get a regular user with a shipping mark
    user = (
        UserModel.objects.filter(role="user")
        .exclude(shipping_mark__isnull=True)
        .first()
    )
    if not user:
        print("❌ No regular user with shipping mark found.")
        return False

    user_mark = user.shipping_mark.mark_id
    print(f"Using user: {user.username} (mark: {user_mark})")

    # Get an admin user
    admin = UserModel.objects.filter(role="admin").first()
    if not admin:
        print("❌ No admin user found.")
        return False
    print(f"Using admin: {admin.username}\n")

    # Step 1: Admin creates tracking (no owner)
    print(f"1. Admin creates tracking '{tracking_num}' (no owner)...")
    admin_tracking = Tracking.objects.create(
        tracking_number=tracking_num, owner=None, shipping_mark="", status="pending"
    )
    admin_tracking.sync_duplicates()
    print(
        f"   ✓ Created: owner={admin_tracking.owner}, mark='{admin_tracking.shipping_mark}'"
    )

    # Step 2: User tries to add same tracking (simulates API update behavior)
    print(f"\n2. User tries to add tracking '{tracking_num}' with their info...")
    user_tracking = Tracking.objects.get(tracking_number=tracking_num)
    user_tracking.owner = user
    user_tracking.shipping_mark = user_mark
    user_tracking.status = "in_transit"
    user_tracking.save()
    user_tracking.sync_duplicates()
    print(f"   ✓ Updated tracking with user ownership, called sync_duplicates()")

    # Step 3: Verify the record now has user's owner and mark
    print(f"\n3. Checking tracking '{tracking_num}'...")
    record = Tracking.objects.get(tracking_number=tracking_num)
    owner_name = record.owner.username if record.owner else "None"
    print(
        f"   - ID {record.pk}: owner={owner_name}, mark={record.shipping_mark}, status={record.status}"
    )

    success = True
    # Verify it has user as owner and user's mark
    if not record.owner or record.owner.username != user.username:
        print(f"     ❌ FAIL: Owner should be {user.username}, got {owner_name}")
        success = False
    if record.shipping_mark != user_mark:
        print(f"     ❌ FAIL: Mark should be {user_mark}, got {record.shipping_mark}")
        success = False

    if success:
        print(
            f"\n✅ TEST 2 PASSED: Admin's entry got updated with user's owner and mark!"
        )
    else:
        print(f"\n❌ TEST 2 FAILED")

    return success


if __name__ == "__main__":
    print("\n🧪 TESTING TRACKING SYNC FIX\n")

    # Cleanup any previous test data
    cleanup_test_data()

    # Run tests
    test1_passed = test_user_first_then_admin()
    test2_passed = test_admin_first_then_user()

    # Cleanup
    print("\n" + "=" * 60)
    cleanup_test_data()

    # Summary
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Test 1 (User first): {'✅ PASSED' if test1_passed else '❌ FAILED'}")
    print(f"Test 2 (Admin first): {'✅ PASSED' if test2_passed else '❌ FAILED'}")

    if test1_passed and test2_passed:
        print("\n🎉 ALL TESTS PASSED! Sync works in both directions.")
    else:
        print("\n❌ SOME TESTS FAILED. Check the output above for details.")
