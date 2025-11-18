"""
Test script for admin notification system.
Tests:
1. Admin notification on user signup
2. Admin notification when user adds shipment
"""

import os
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bsbackend.settings")
django.setup()

from buysellapi.models import UserModel, Tracking, EmailNotification
from buysellapi.email_utils import (
    notify_admin_new_user_signup,
    notify_admin_new_shipment,
)


def test_admin_notifications():
    print("=" * 60)
    print("TESTING ADMIN NOTIFICATION SYSTEM")
    print("=" * 60)

    # Check if we have admin users
    admin_users = UserModel.objects.filter(role="admin")
    print(f"\n📊 Admin users in system: {admin_users.count()}")
    for admin in admin_users:
        print(f"   - {admin.full_name} ({admin.email})")

    if not admin_users.exists():
        print("\n❌ No admin users found. Creating a test admin...")
        admin = UserModel.objects.create(
            username="testadmin",
            email="admin@test.com",
            full_name="Test Admin",
            role="admin",
            contact="1234567890",
        )
        print(f"✅ Created admin: {admin.full_name} ({admin.email})")

    # Check if we have regular users
    regular_users = UserModel.objects.filter(role="user")
    print(f"\n📊 Regular users in system: {regular_users.count()}")

    if regular_users.exists():
        test_user = regular_users.first()
        print(f"   Using existing user: {test_user.full_name} ({test_user.email})")
    else:
        print("\n❌ No regular users found. Please create a user through signup first.")
        return

    # Test 1: Notify admins about user signup (simulated)
    print("\n" + "=" * 60)
    print("TEST 1: Admin Notification for User Signup")
    print("=" * 60)
    try:
        notifications = notify_admin_new_user_signup(test_user)
        print(f"✅ Sent {len(notifications)} admin notification(s) about user signup")
        for notif in notifications:
            print(f"   - To: {notif.user.email}")
            print(f"   - Subject: {notif.subject}")
            print(f"   - Status: {notif.status}")
    except Exception as e:
        print(f"❌ Failed to send admin signup notifications: {str(e)}")

    # Test 2: Notify admins about new shipment
    print("\n" + "=" * 60)
    print("TEST 2: Admin Notification for New Shipment")
    print("=" * 60)

    # Check if user has any trackings
    user_trackings = Tracking.objects.filter(owner=test_user)
    print(f"\n📊 User trackings: {user_trackings.count()}")

    if user_trackings.exists():
        test_tracking = user_trackings.first()
        print(f"   Using existing tracking: {test_tracking.tracking_number}")
    else:
        print("\n❌ No trackings found for user. Creating a test tracking...")
        test_tracking = Tracking.objects.create(
            tracking_number="TEST12345",
            owner=test_user,
            status="in_transit",
            cbm=1.5,
        )
        print(f"✅ Created test tracking: {test_tracking.tracking_number}")

    try:
        notifications = notify_admin_new_shipment(test_tracking)
        print(f"✅ Sent {len(notifications)} admin notification(s) about new shipment")
        for notif in notifications:
            print(f"   - To: {notif.user.email}")
            print(f"   - Subject: {notif.subject}")
            print(f"   - Status: {notif.status}")
    except Exception as e:
        print(f"❌ Failed to send admin shipment notifications: {str(e)}")

    # Summary of all notifications
    print("\n" + "=" * 60)
    print("NOTIFICATION SUMMARY")
    print("=" * 60)

    admin_notifications = EmailNotification.objects.filter(
        notification_type="admin_notification"
    ).order_by("-created_at")

    print(f"\nTotal admin notifications in database: {admin_notifications.count()}")
    print("\nRecent admin notifications:")
    for notif in admin_notifications[:5]:
        print(f"\n   {notif.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"   To: {notif.user.full_name} ({notif.user.email})")
        print(f"   Subject: {notif.subject}")
        print(f"   Status: {notif.status}")
        if notif.status == "failed":
            print(f"   Error: {notif.error_message}")

    # Check email notification counts by status
    print("\n📊 Admin Notification Statistics:")
    sent_count = admin_notifications.filter(status="sent").count()
    failed_count = admin_notifications.filter(status="failed").count()
    pending_count = admin_notifications.filter(status="pending").count()

    print(f"   ✅ Sent: {sent_count}")
    print(f"   ❌ Failed: {failed_count}")
    print(f"   ⏳ Pending: {pending_count}")

    print("\n" + "=" * 60)
    print("TEST COMPLETED")
    print("=" * 60)


if __name__ == "__main__":
    test_admin_notifications()
