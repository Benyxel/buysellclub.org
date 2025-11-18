"""Test admin login"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bsbackend.settings")
django.setup()

from django.contrib.auth import authenticate

# Test login
user = authenticate(username="admin", password="admin123")

if user:
    print("✅ Login successful!")
    print(f"  Username: {user.username}")
    print(f"  Email: {user.email}")
    print(f"  Is Staff: {user.is_staff}")
    print(f"  Is Superuser: {user.is_superuser}")
else:
    print("❌ Login failed!")
