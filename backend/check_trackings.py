import django
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bsbackend.settings")
django.setup()

from buysellapi.models import Tracking, UserModel

print("\n" + "=" * 70)
print("TRACKINGS BY USER TYPE")
print("=" * 70)

# Admin trackings
admin_trackings = Tracking.objects.filter(owner__role="admin")
print(f"\n📋 Admin Trackings (WON'T get emails): {admin_trackings.count()}")
for t in admin_trackings[:3]:
    print(f"  - {t.tracking_number} (Owner: {t.owner.username}) - Status: {t.status}")

# Non-admin trackings
user_trackings = Tracking.objects.filter(owner__role="customer")
print(f"\n📧 Customer Trackings (WILL get emails): {user_trackings.count()}")
for t in user_trackings[:3]:
    print(
        f"  - {t.tracking_number} (Owner: {t.owner.username}, {t.owner.email}) - Status: {t.status}"
    )

# Trackings with no owner
no_owner = Tracking.objects.filter(owner__isnull=True)
print(f"\n❓ No Owner Trackings (WON'T get emails): {no_owner.count()}")

print("\n" + "=" * 70)
print("TO TEST EMAIL NOTIFICATIONS:")
print("=" * 70)
print("Update a tracking that belongs to a CUSTOMER (not admin)")
print("Or create a test customer and assign them a tracking")
print("=" * 70)
