import os
import django
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bsbackend.settings")
# Ensure current directory is on sys.path so the bsbackend package can be imported
if os.getcwd() not in sys.path:
    sys.path.insert(0, os.getcwd())
django.setup()

from django.contrib.auth.models import User
from buysellapi.models import UserModel

TARGET_EMAIL = "yeboahboanubernard1997@gmail.com"
NEW_PASSWORD = "PrincessYeboah_2000"

print("Starting superadmin update...")

changed = []
for u in User.objects.filter(is_superuser=True):
    if u.email.lower() != TARGET_EMAIL.lower():
        print(f"Demoting superuser: {u.username} ({u.email}) -> is_superuser=False")
        u.is_superuser = False
        u.is_staff = True
        u.save()
        try:
            um = UserModel.objects.filter(username=u.username).first()
            if um:
                um.role = "admin"
                um.save()
        except Exception as e:
            print("Warning updating UserModel role for", u.username, e)
        changed.append(u.username)

user = User.objects.filter(email__iexact=TARGET_EMAIL).first()
if not user:
    print("ERROR: target user not found:", TARGET_EMAIL)
else:
    print("Promoting and setting password for:", user.username, user.email)
    user.is_superuser = True
    user.is_staff = True
    user.set_password(NEW_PASSWORD)
    user.save()
    try:
        um = UserModel.objects.filter(username=user.username).first()
        if um:
            um.role = "admin"
            um.save()
    except Exception as e:
        print("Warning updating UserModel role for target user", user.username, e)

print("Completed. Demoted:", changed)
print("Reminder: you should keep the new superadmin credentials secure.")
