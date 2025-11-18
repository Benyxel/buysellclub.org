import django
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bsbackend.settings")
django.setup()

from buysellapi.models import EmailNotification

print("\n" + "=" * 70)
print("RECENT EMAIL NOTIFICATIONS")
print("=" * 70 + "\n")

notifications = EmailNotification.objects.order_by("-created_at")[:5]

for i, n in enumerate(notifications, 1):
    print(f"{i}. Type: {n.notification_type}")
    print(f"   Subject: {n.subject}")
    print(f"   Status: {n.status}")
    print(f"   To: {n.user.email}")
    print(f"   Sent: {n.sent_at if n.sent_at else 'Not sent'}")
    if n.error_message:
        print(f"   Error: {n.error_message}")
    print()

print("=" * 70)
print(f"Total emails in database: {EmailNotification.objects.count()}")
print(f"Successfully sent: {EmailNotification.objects.filter(status='sent').count()}")
print(f"Failed: {EmailNotification.objects.filter(status='failed').count()}")
print("=" * 70)
