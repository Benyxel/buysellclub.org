"""
Test admin notifications API endpoint
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bsbackend.settings")
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth.models import User
from buysellapi.models import UserModel, EmailNotification
from rest_framework_simplejwt.tokens import RefreshToken

print("=" * 60)
print("TESTING ADMIN NOTIFICATIONS API")
print("=" * 60)

# Get admin user
try:
    admin_django = User.objects.get(username="admin")
    admin_profile = UserModel.objects.get(username="admin")
    print(f"\n✅ Admin user found: {admin_django.username}")
    print(f"   Email: {admin_django.email}")
    print(f"   Is Staff: {admin_django.is_staff}")
    print(f"   Profile Role: {admin_profile.role}")
except:
    print("\n❌ Admin user not found!")
    exit(1)

# Generate JWT token for admin
refresh = RefreshToken.for_user(admin_django)
access_token = str(refresh.access_token)
print(f"\n✅ JWT Token generated")

# Create API client with auth
client = APIClient()
client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

# Test 1: Get admin notifications
print("\n" + "=" * 60)
print("TEST 1: GET /api/admin/notifications/me/")
print("=" * 60)
response = client.get("/buysellapi/admin/notifications/me/")
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.data
    print(f"✅ Success!")
    print(f"   Unread Count: {data.get('unread_count', 0)}")
    print(f"   Total Count: {data.get('total_count', 0)}")
    print(f"   Notifications: {len(data.get('notifications', []))}")

    if data.get("notifications"):
        print("\n   Recent notifications:")
        for notif in data["notifications"][:3]:
            print(f"   - {notif['subject']} ({notif['status']})")
else:
    print(f"❌ Failed: {response.data}")

# Test 2: Check notification counts
print("\n" + "=" * 60)
print("TEST 2: Check notification counts in database")
print("=" * 60)
admin_notifs = EmailNotification.objects.filter(
    user=admin_profile, notification_type="admin_notification"
)
print(f"Total admin notifications: {admin_notifs.count()}")
print(f"Unread (sent): {admin_notifs.filter(status='sent').count()}")
print(f"Read: {admin_notifs.filter(status='read').count()}")

# Test 3: Mark as read endpoint
print("\n" + "=" * 60)
print("TEST 3: Test mark notification as read")
print("=" * 60)
if admin_notifs.filter(status="sent").exists():
    test_notif = admin_notifs.filter(status="sent").first()
    print(f"Testing with notification ID: {test_notif.id}")
    print(f"Subject: {test_notif.subject}")

    response = client.patch(f"/buysellapi/notifications/{test_notif.id}/mark-read/")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"✅ Successfully marked as read")
        test_notif.refresh_from_db()
        print(f"   New status: {test_notif.status}")
    else:
        print(f"❌ Failed: {response.data}")
else:
    print("No unread notifications to test with")

# Test 4: Mark all as read
print("\n" + "=" * 60)
print("TEST 4: Test mark all notifications as read")
print("=" * 60)
unread_before = admin_notifs.filter(status="sent").count()
print(f"Unread notifications before: {unread_before}")

if unread_before > 0:
    response = client.post("/buysellapi/notifications/mark-all-read/")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"✅ Successfully marked all as read")
        print(f"   Response: {response.data}")
        unread_after = admin_notifs.filter(status="sent").count()
        print(f"   Unread notifications after: {unread_after}")
    else:
        print(f"❌ Failed: {response.data}")
else:
    print("No unread notifications to test with")

print("\n" + "=" * 60)
print("API TESTING COMPLETED")
print("=" * 60)
