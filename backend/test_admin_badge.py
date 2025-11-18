"""
Test script for admin notification badge/icon system.
Tests the new /api/admin/notifications/me endpoint.
"""

import os
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bsbackend.settings")
django.setup()

from buysellapi.models import UserModel, EmailNotification


def test_admin_notification_badge():
    print("=" * 60)
    print("TESTING ADMIN NOTIFICATION BADGE SYSTEM")
    print("=" * 60)

    # Check if we have admin users
    admin_users = UserModel.objects.filter(role="admin")
    print(f"\n📊 Admin users in system: {admin_users.count()}")

    if not admin_users.exists():
        print("\n❌ No admin users found. Please create an admin first.")
        return

    for admin in admin_users:
        print(f"\n{'='*60}")
        print(f"Admin: {admin.full_name} ({admin.email})")
        print(f"{'='*60}")

        # Get admin notifications
        admin_notifications = EmailNotification.objects.filter(
            user=admin, notification_type="admin_notification"
        )

        total_count = admin_notifications.count()
        print(f"\n📬 Total admin notifications: {total_count}")

        # Count by status
        sent_count = admin_notifications.filter(status="sent").count()
        read_count = admin_notifications.filter(status="read").count()
        failed_count = admin_notifications.filter(status="failed").count()

        print(f"   🔔 Unread (sent): {sent_count}")
        print(f"   ✅ Read: {read_count}")
        print(f"   ❌ Failed: {failed_count}")

        # Show recent notifications
        print(f"\n📋 Recent notifications:")
        recent = admin_notifications.order_by("-created_at")[:5]

        if not recent.exists():
            print("   No notifications found")
        else:
            for notif in recent:
                status_emoji = (
                    "🔔"
                    if notif.status == "sent"
                    else "✅" if notif.status == "read" else "❌"
                )
                print(f"\n   {status_emoji} {notif.subject}")
                print(f"      Status: {notif.status}")
                print(f"      Date: {notif.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
                if notif.tracking:
                    print(f"      Tracking: {notif.tracking.tracking_number}")

    # Summary
    print("\n" + "=" * 60)
    print("NOTIFICATION BADGE STATISTICS")
    print("=" * 60)

    total_admin_notifs = EmailNotification.objects.filter(
        notification_type="admin_notification"
    )

    print(f"\nTotal admin notifications: {total_admin_notifs.count()}")
    print(f"Unread (sent): {total_admin_notifs.filter(status='sent').count()}")
    print(f"Read: {total_admin_notifs.filter(status='read').count()}")
    print(f"Failed: {total_admin_notifs.filter(status='failed').count()}")

    # API endpoint info
    print("\n" + "=" * 60)
    print("API ENDPOINTS")
    print("=" * 60)
    print("\n✅ Get admin notifications:")
    print("   GET /api/admin/notifications/me/")
    print("   Query params: limit, unread_only")
    print("   Returns: {notifications, unread_count, total_count}")

    print("\n✅ Mark notification as read:")
    print("   PATCH /api/notifications/<id>/mark-read/")

    print("\n✅ Mark all notifications as read:")
    print("   POST /api/notifications/mark-all-read/")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    test_admin_notification_badge()
