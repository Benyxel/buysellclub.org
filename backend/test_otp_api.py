"""
Quick OTP login flow test using Django REST Framework APIClient.
- Ensures a test user exists
- Requests OTP
- Sets known code hash for the latest OTP to '123456'
- Verifies OTP and prints tokens
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bsbackend.settings")
django.setup()

from django.contrib.auth.models import User
from buysellapi.models import UserModel, LoginOTP
from rest_framework.test import APIClient
from django.contrib.auth.hashers import make_password

print("=" * 60)
print("OTP LOGIN TEST")
print("=" * 60)

# Ensure user exists
username = "otpuser"
email = "otpuser@example.com"
plain_password = "testpass123"

user_model, created = UserModel.objects.get_or_create(
    username=username,
    defaults={
        "full_name": "OTP User",
        "email": email,
        "password": make_password(plain_password),
        "contact": "0551234567",
        "location": "Accra",
    },
)
if created:
    print(f"Created UserModel {username}")

# Ensure auth user exists
if not User.objects.filter(username=username).exists():
    User.objects.create_user(username=username, email=email, password=plain_password)
    print("Created Django auth user as well")

client = APIClient()

print("\nRequesting OTP...")
resp = client.post(
    "/buysellapi/auth/request-otp/", {"identifier": email}, format="json"
)
print("Status:", resp.status_code)
print("Body:", resp.data if hasattr(resp, "data") else resp.content)

otp = (
    LoginOTP.objects.filter(user=user_model, is_used=False)
    .order_by("-created_at")
    .first()
)
if not otp:
    print("No OTP created")
    raise SystemExit(1)

# For testing, set known code '123456'
otp.code_hash = make_password("123456")
otp.save(update_fields=["code_hash"])

print("\nVerifying OTP with code 123456...")
resp2 = client.post(
    "/buysellapi/auth/verify-otp/",
    {"identifier": email, "code": "123456"},
    format="json",
)
print("Status:", resp2.status_code)
print("Body:", resp2.data if hasattr(resp2, "data") else resp2.content)

if resp2.status_code == 200:
    print("\n✅ OTP login flow succeeded.")
else:
    print("\n❌ OTP login flow failed.")
