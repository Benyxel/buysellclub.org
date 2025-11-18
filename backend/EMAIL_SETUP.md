# Email Notification System Setup Guide

## Overview

This application now includes a comprehensive email notification system integrated with Gmail SMTP. Users will automatically receive emails about:

- Tracking status updates
- New account creation (welcome emails)
- Shipping mark generation
- Admin announcements

## Features

### Automatic Notifications (via Django Signals)

- **Tracking Updates**: When tracking status changes, users automatically receive an email with the updated information
- **Welcome Emails**: New users get a welcome email when they register
- **Shipping Mark Notifications**: Users are notified when their permanent shipping mark is created

### Admin Manual Notifications

Admins can send custom notifications through API endpoints:

- Send to specific users
- Broadcast to all users or filtered groups
- View notification history

### Email Tracking

All sent emails are tracked in the database with:

- Delivery status (pending, sent, failed, bounced)
- Timestamp
- Error messages (if any)
- Link to related tracking/user

## Gmail Setup Instructions

### Step 1: Enable 2-Factor Authentication

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to Security → 2-Step Verification
3. Follow the prompts to enable 2FA if not already enabled

### Step 2: Generate App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" as the app
3. Select "Other" as the device and name it "BuySell Django Backend"
4. Click "Generate"
5. Copy the 16-character password (it will look like: `xxxx xxxx xxxx xxxx`)
6. **Important**: Save this password - you won't be able to see it again!

### Step 3: Configure Environment Variables

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your Gmail credentials:

   ```
   EMAIL_HOST_USER=your-actual-email@gmail.com
   EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx
   DEFAULT_FROM_EMAIL=BuySell Support <your-actual-email@gmail.com>
   SITE_URL=http://localhost:5173
   ```

3. **Important**: Add `.env` to your `.gitignore` to prevent committing credentials:
   ```
   echo ".env" >> .gitignore
   ```

### Step 4: Load Environment Variables

The Django settings are already configured to read from environment variables. Make sure to load them:

**For Development (Windows PowerShell)**:

```powershell
# Create a .env file then restart your terminal or
$env:EMAIL_HOST_USER="your-email@gmail.com"
$env:EMAIL_HOST_PASSWORD="your-app-password"
$env:DEFAULT_FROM_EMAIL="BuySell Support <your-email@gmail.com>"
$env:SITE_URL="http://localhost:5173"
```

**For Production (Linux/Docker)**:
Set environment variables in your deployment platform (Heroku, AWS, etc.)

### Step 5: Test Email Sending

Create a simple test script or use Django shell:

```python
python manage.py shell

from buysellapi.models import UserModel
from buysellapi.email_utils import send_welcome_email

# Get a test user
user = UserModel.objects.first()

# Send test email
send_welcome_email(user)
```

Check your email and the database for the EmailNotification record.

## API Endpoints

### Admin Send Notification (Single User)

```http
POST /api/admin/notifications/send/
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "user_id": 1,
  "subject": "Important Update",
  "message": "Your shipment has been processed."
}
```

### Admin Broadcast Notification

```http
POST /api/admin/notifications/broadcast/
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "subject": "System Maintenance",
  "message": "The system will be down for maintenance tonight.",
  "role_filter": "customer"  // optional, can also use "user_ids": [1, 2, 3]
}
```

### View Notification History

```http
GET /api/admin/notifications/history/?limit=100&status=sent
Authorization: Bearer <admin-token>
```

Query parameters:

- `user_id`: Filter by specific user
- `notification_type`: Filter by type (tracking_update, welcome, etc.)
- `status`: Filter by status (pending, sent, failed, bounced)
- `limit`: Number of results (default 50)

## Email Types

### 1. Tracking Status Update

**Trigger**: When tracking status changes or new tracking is created
**Type**: `tracking_update`
**Contains**: Tracking number, current status, ETA, shipping mark, link to site

### 2. Welcome Email

**Trigger**: New user registration
**Type**: `welcome`
**Contains**: Welcome message, feature list, getting started instructions

### 3. Shipping Mark Created

**Trigger**: When permanent shipping mark is generated
**Type**: `shipping_mark_created`
**Contains**: Mark ID, instructions on using the mark, reminder to use for all shipments

### 4. Admin Announcement

**Trigger**: Manual send by admin
**Type**: `admin_announcement`
**Contains**: Custom subject and message from admin

## Database Model

### EmailNotification Fields

- `user`: ForeignKey to UserModel (recipient)
- `notification_type`: Type of notification (tracking_update, welcome, etc.)
- `subject`: Email subject line
- `message`: Plain text message
- `html_message`: HTML version of email (optional)
- `status`: Delivery status (pending, sent, failed, bounced)
- `sent_at`: Timestamp when email was sent
- `error_message`: Error details if send failed
- `tracking`: Optional ForeignKey to related Tracking record
- `created_at`: When notification was created

## Troubleshooting

### Emails Not Sending

1. **Check Gmail App Password**: Make sure you're using the app password, not your regular password
2. **Check Environment Variables**: Verify `.env` is loaded correctly
3. **Check Gmail Account**: Ensure the Gmail account is active and not locked
4. **Check Logs**: Look for error messages in console or EmailNotification.error_message field
5. **Test SMTP Connection**:
   ```python
   from django.core.mail import send_mail
   send_mail('Test', 'Test message', 'from@example.com', ['to@example.com'])
   ```

### Too Many Emails

If users are receiving too many emails:

1. Modify the signal in `signals.py` to only trigger on specific status changes
2. Add rate limiting or debouncing logic
3. Allow users to configure email preferences

### Gmail Sending Limits

- Gmail has daily sending limits (500 emails/day for free accounts)
- For high-volume sending, consider:
  - Using Google Workspace (higher limits)
  - Switching to SendGrid, AWS SES, or Mailgun

## Security Best Practices

1. **Never commit `.env` file** - Always add to `.gitignore`
2. **Use app passwords** - Never use your actual Gmail password
3. **Rotate credentials regularly** - Generate new app passwords periodically
4. **Limit admin access** - Only admins can send manual notifications
5. **Monitor failed sends** - Check EmailNotification records for failed deliveries

## Future Enhancements

Consider adding:

- Email preferences for users (opt-in/opt-out)
- Email templates with better styling
- Rich notifications with images and buttons
- SMS notifications via Twilio
- Push notifications for mobile app
- Email scheduling and queuing
- Retry logic for failed sends
