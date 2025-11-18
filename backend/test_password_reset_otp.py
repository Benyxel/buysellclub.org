"""
Quick password reset via OTP test script.
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bsbackend.settings")
django.setup()

from django.contrib.auth.models import User
from buysellapi.models import UserModel, PasswordResetOTP
from rest_framework.test import APIClient
from django.contrib.auth.hashers import make_password

print("=" * 60)
print("PASSWORD RESET OTP TEST")
print("=" * 60)

username = "resetuser"
email = "resetuser@example.com"
plain_password = "oldpass123"

user_model, created = UserModel.objects.get_or_create(
    username=username,
    defaults={
        "full_name": "Reset User",
        "email": email,
        "password": make_password(plain_password),
        "contact": "0557654321",
        "location": "Accra",
    },
)
if created:
    print(f"Created UserModel {username}")

if not User.objects.filter(username=username).exists():
    User.objects.create_user(username=username, email=email, password=plain_password)
    print("Created Django auth user")

client = APIClient()

print("\nRequesting reset OTP...")
resp = client.post(
    "/buysellapi/auth/request-password-reset/", {"identifier": email}, format="json"
)
print("Status:", resp.status_code)
print("Body:", resp.data if hasattr(resp, "data") else resp.content)

otp = (
    PasswordResetOTP.objects.filter(user=user_model, is_used=False)
    .order_by("-created_at")
    .first()
)
if not otp:
    print("No reset OTP created")
    raise SystemExit(1)

# For testing, set known code '654321'
otp.code_hash = make_password("654321")
otp.save(update_fields=["code_hash"])

print("\nVerifying reset with code 654321...")
new_password = "newpass999"
resp2 = client.post(
    "/buysellapi/auth/verify-password-reset/",
    {
        "identifier": email,
        "code": "654321",
        "new_password": new_password,
        "confirm_password": new_password,
    },
    format="json",
)
print("Status:", resp2.status_code)
print("Body:", resp2.data if hasattr(resp2, "data") else resp2.content)

if resp2.status_code == 200:
    print("\n✅ Password reset flow succeeded.")
else:
    print("\n❌ Password reset flow failed.")
