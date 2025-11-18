"""
Advanced Gmail SMTP diagnostic with SSL debugging
"""

import os
import sys
import ssl
import socket
from dotenv import load_dotenv
import smtplib

# Load environment variables
load_dotenv(".env")

EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD")

print("=" * 70)
print("ADVANCED Gmail SMTP Diagnostic")
print("=" * 70)
print(f"\nEmail: {EMAIL_HOST_USER}")
print(f"Password length: {len(EMAIL_HOST_PASSWORD) if EMAIL_HOST_PASSWORD else 0}")
print(
    f"Password (first 4 chars): {EMAIL_HOST_PASSWORD[:4] if EMAIL_HOST_PASSWORD else 'NONE'}..."
)

# Test 1: Check internet connectivity
print("\n" + "=" * 70)
print("TEST 1: Internet Connectivity")
print("=" * 70)
try:
    socket.create_connection(("8.8.8.8", 53), timeout=3)
    print("✅ Internet connection: OK")
except Exception as e:
    print(f"❌ No internet connection: {e}")
    sys.exit(1)

# Test 2: Check Gmail SMTP server reachability
print("\n" + "=" * 70)
print("TEST 2: Gmail SMTP Server Reachability")
print("=" * 70)
try:
    socket.create_connection(("smtp.gmail.com", 587), timeout=10)
    print("✅ Can reach smtp.gmail.com:587")
except Exception as e:
    print(f"❌ Cannot reach Gmail SMTP server: {e}")
    print("Possible causes:")
    print("  - Firewall blocking port 587")
    print("  - Network proxy issues")
    print("  - ISP blocking SMTP")
    sys.exit(1)

# Test 3: Try SMTP connection without authentication
print("\n" + "=" * 70)
print("TEST 3: SMTP Connection (no auth)")
print("=" * 70)
try:
    server = smtplib.SMTP("smtp.gmail.com", 587, timeout=30)
    print("✅ SMTP connection established")
    server.quit()
except Exception as e:
    print(f"❌ SMTP connection failed: {e}")
    sys.exit(1)

# Test 4: STARTTLS
print("\n" + "=" * 70)
print("TEST 4: STARTTLS Encryption")
print("=" * 70)
try:
    server = smtplib.SMTP("smtp.gmail.com", 587, timeout=30)
    server.starttls()
    print("✅ TLS encryption started")
    server.quit()
except Exception as e:
    print(f"❌ TLS failed: {e}")
    sys.exit(1)

# Test 5: Authentication
print("\n" + "=" * 70)
print("TEST 5: Gmail Authentication")
print("=" * 70)
try:
    server = smtplib.SMTP("smtp.gmail.com", 587, timeout=30)
    server.ehlo()
    server.starttls()
    server.ehlo()

    print(f"Attempting login with: {EMAIL_HOST_USER}")
    server.login(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)
    print("✅ ✅ ✅ AUTHENTICATION SUCCESSFUL! ✅ ✅ ✅")

    # Test 6: Send actual email
    print("\n" + "=" * 70)
    print("TEST 6: Sending Test Email")
    print("=" * 70)

    from email.mime.text import MIMEText

    msg = MIMEText("🎉 SUCCESS! Your BuySell email system is working perfectly!")
    msg["Subject"] = "✅ BuySell Platform - Email System Test SUCCESS"
    msg["From"] = EMAIL_HOST_USER
    msg["To"] = EMAIL_HOST_USER

    server.send_message(msg)
    print(f"✅ Test email sent to: {EMAIL_HOST_USER}")
    print("📬 Check your inbox!")

    server.quit()

    print("\n" + "=" * 70)
    print("🎉 ALL TESTS PASSED! EMAIL SYSTEM IS READY! 🎉")
    print("=" * 70)

except smtplib.SMTPAuthenticationError as e:
    print(f"❌ AUTHENTICATION FAILED: {e}")
    print("\n📋 Troubleshooting:")
    print("1. Verify the App Password is correct (16 characters, no spaces)")
    print("2. Make sure 2FA is enabled on the Gmail account")
    print("3. The App Password might have been revoked - generate a new one")
    print("4. Check if you copied the entire password without missing characters")
    print(f"\nCurrent password: {EMAIL_HOST_PASSWORD}")

except socket.timeout:
    print("❌ CONNECTION TIMEOUT")
    print("The server is not responding. Possible causes:")
    print("  - Network firewall is blocking the connection")
    print("  - Slow internet connection")
    print("  - Gmail servers might be temporarily down")

except ConnectionResetError:
    print("❌ CONNECTION RESET BY SERVER")
    print("Gmail closed the connection. Possible causes:")
    print("  - Too many failed login attempts - wait 15 minutes and try again")
    print("  - Your IP might be temporarily blocked by Gmail")
    print("  - Network issues")

except Exception as e:
    print(f"❌ UNEXPECTED ERROR: {e}")
    print(f"Error type: {type(e).__name__}")
    import traceback

    traceback.print_exc()

print("\n" + "=" * 70)
