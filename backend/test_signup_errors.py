"""
Test signup form error handling
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bsbackend.settings")
django.setup()

from rest_framework.test import APIClient
from buysellapi.models import UserModel
from django.contrib.auth.models import User

client = APIClient()

print("=" * 60)
print("TESTING SIGNUP ERROR HANDLING")
print("=" * 60)

# Test 1: Missing required fields
print("\n1. Testing missing required fields...")
response = client.post("/buysellapi/user/register/", {})
print(f"   Status: {response.status_code}")
print(f"   Errors: {response.data}")

# Test 2: Duplicate username
print("\n2. Testing duplicate username...")
response = client.post(
    "/buysellapi/user/register/",
    {
        "username": "admin",  # Already exists
        "full_name": "Test User",
        "email": "newtest@example.com",
        "password": "password123",
        "confirm_password": "password123",
        "contact": "1234567890",
        "location": "Test City",
    },
)
print(f"   Status: {response.status_code}")
print(f"   Errors: {response.data}")

# Test 3: Duplicate email
print("\n3. Testing duplicate email...")
response = client.post(
    "/buysellapi/user/register/",
    {
        "username": "newuser123",
        "full_name": "Test User",
        "email": "yeboahboanubernard1997@gmail.com",  # Already exists
        "password": "password123",
        "confirm_password": "password123",
        "contact": "9876543210",
        "location": "Test City",
    },
)
print(f"   Status: {response.status_code}")
print(f"   Errors: {response.data}")

# Test 4: Password mismatch
print("\n4. Testing password mismatch...")
response = client.post(
    "/buysellapi/user/register/",
    {
        "username": "testuser456",
        "full_name": "Test User",
        "email": "testuser@example.com",
        "password": "password123",
        "confirm_password": "password456",  # Different
        "contact": "5555555555",
        "location": "Test City",
    },
)
print(f"   Status: {response.status_code}")
print(f"   Errors: {response.data}")

# Test 5: Password too short
print("\n5. Testing short password...")
response = client.post(
    "/buysellapi/user/register/",
    {
        "username": "testuser789",
        "full_name": "Test User",
        "email": "testuser2@example.com",
        "password": "12345",  # Too short
        "confirm_password": "12345",
        "contact": "6666666666",
        "location": "Test City",
    },
)
print(f"   Status: {response.status_code}")
print(f"   Errors: {response.data}")

# Test 6: Username too short
print("\n6. Testing short username...")
response = client.post(
    "/buysellapi/user/register/",
    {
        "username": "ab",  # Too short
        "full_name": "Test User",
        "email": "testuser3@example.com",
        "password": "password123",
        "confirm_password": "password123",
        "contact": "7777777777",
        "location": "Test City",
    },
)
print(f"   Status: {response.status_code}")
print(f"   Errors: {response.data}")

# Test 7: Valid signup
print("\n7. Testing valid signup (cleanup after)...")
test_username = "validtestuser"
test_email = "validtest@example.com"
test_contact = "8888888888"

# Clean up if exists
UserModel.objects.filter(username=test_username).delete()
UserModel.objects.filter(email=test_email).delete()
UserModel.objects.filter(contact=test_contact).delete()
User.objects.filter(username=test_username).delete()

response = client.post(
    "/buysellapi/user/register/",
    {
        "username": test_username,
        "full_name": "Valid Test User",
        "email": test_email,
        "password": "password123",
        "confirm_password": "password123",
        "contact": test_contact,
        "location": "Test City",
    },
)
print(f"   Status: {response.status_code}")
print(f"   Response: {response.data}")

# Cleanup
if response.status_code == 201:
    UserModel.objects.filter(username=test_username).delete()
    User.objects.filter(username=test_username).delete()
    print("   ✅ Signup successful and cleaned up!")

print("\n" + "=" * 60)
print("ERROR HANDLING TEST COMPLETED")
print("=" * 60)
