"""
Test Gmail SMTP using SSL (port 465) instead of TLS (port 587)
"""

import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText

load_dotenv(".env")

EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD")

print("=" * 70)
print("Testing Gmail SMTP with SSL (Port 465)")
print("=" * 70)
print(f"Email: {EMAIL_HOST_USER}")
print(f"Password length: {len(EMAIL_HOST_PASSWORD)}")

try:
    # Use SMTP_SSL for port 465
    print("\n🔄 Connecting to smtp.gmail.com:465 with SSL...")
    server = smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30)

    print("✅ SSL connection established!")

    print("\n🔄 Attempting login...")
    server.login(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)

    print("✅ ✅ ✅ LOGIN SUCCESSFUL! ✅ ✅ ✅")

    print("\n📧 Sending test email...")
    msg = MIMEText(
        "🎉 Your BuySell email system is working! This test used SSL port 465."
    )
    msg["Subject"] = "✅ BuySell Email Test - SSL Method SUCCESS"
    msg["From"] = EMAIL_HOST_USER
    msg["To"] = EMAIL_HOST_USER

    server.send_message(msg)
    print(f"✅ Email sent to {EMAIL_HOST_USER}")
    print("📬 Check your inbox!")

    server.quit()

    print("\n" + "=" * 70)
    print("🎉 SUCCESS WITH SSL! Email system is working!")
    print("=" * 70)
    print("\n⚠️ NOTE: You need to update Django settings to use port 465")
    print("The TLS method (port 587) seems to be blocked by your network.")

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    print(f"Error type: {type(e).__name__}")

print("\n" + "=" * 70)
