"""
Diagnostic script to test Gmail SMTP connection
"""

import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Load environment variables
load_dotenv(".env")

EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD")

print("=" * 60)
print("Gmail SMTP Connection Test")
print("=" * 60)
print(f"\nEmail: {EMAIL_HOST_USER}")
print(
    f"Password: {'*' * len(EMAIL_HOST_PASSWORD) if EMAIL_HOST_PASSWORD else 'NOT SET'}"
)
print(
    f"Password length: {len(EMAIL_HOST_PASSWORD) if EMAIL_HOST_PASSWORD else 0} characters"
)
print("\n" + "=" * 60)

if not EMAIL_HOST_USER or not EMAIL_HOST_PASSWORD:
    print("❌ ERROR: Email credentials not set in .env file")
    exit(1)

# Test connection
print("\n🔄 Testing SMTP connection...")
try:
    # Create SMTP connection
    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.set_debuglevel(1)  # Show detailed debug info

    print("\n🔄 Starting TLS...")
    server.starttls()

    print("\n🔄 Attempting login...")
    server.login(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)

    print("\n✅ SUCCESS! Login successful!")
    print("\n📧 Sending test email...")

    # Create test message
    msg = MIMEMultipart()
    msg["From"] = EMAIL_HOST_USER
    msg["To"] = EMAIL_HOST_USER
    msg["Subject"] = "Test Email from BuySell Platform"

    body = """
    This is a test email from your BuySell platform.
    
    If you're reading this, your Gmail SMTP configuration is working correctly!
    
    ✅ Email system is ready to use.
    """

    msg.attach(MIMEText(body, "plain"))

    server.send_message(msg)
    print("\n✅ Test email sent successfully!")
    print(f"Check your inbox at: {EMAIL_HOST_USER}")

    server.quit()
    print("\n" + "=" * 60)
    print("✅ All tests passed! Email system is ready.")
    print("=" * 60)

except smtplib.SMTPAuthenticationError as e:
    print(f"\n❌ AUTHENTICATION ERROR: {str(e)}")
    print("\n📋 Possible solutions:")
    print("1. You're using a regular Gmail password instead of an App Password")
    print("   - Go to: https://myaccount.google.com/apppasswords")
    print("   - Enable 2-Factor Authentication first if not enabled")
    print("   - Generate an App Password for 'Mail'")
    print("   - Copy the 16-character password to .env file")
    print("\n2. App Password format should be 16 characters (spaces are optional)")
    print("   Example: abcd efgh ijkl mnop or abcdefghijklmnop")
    print("\n3. Make sure you're not using special characters in the password")

except smtplib.SMTPException as e:
    print(f"\n❌ SMTP ERROR: {str(e)}")

except ConnectionRefusedError:
    print("\n❌ CONNECTION REFUSED")
    print("Gmail SMTP server refused the connection")
    print("Check your internet connection")

except Exception as e:
    print(f"\n❌ UNEXPECTED ERROR: {str(e)}")
    print(f"Error type: {type(e).__name__}")

print("\n" + "=" * 60)
