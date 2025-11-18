# Email Notification System - Quick Reference

## ✅ Implementation Complete

The email notification system has been fully implemented and integrated with Gmail SMTP.

## 🏗️ What Was Built

### Backend Components

1. **Email Configuration** (`bsbackend/settings.py`)

   - Gmail SMTP settings (smtp.gmail.com:587, TLS)
   - Environment variable support for credentials
   - Site name and URL configuration

2. **EmailNotification Model** (`buysellapi/models.py`)

   - Tracks all sent emails with delivery status
   - Links to users and tracking records
   - Stores subject, message, HTML content, error messages
   - Status tracking: pending, sent, failed, bounced

3. **Email Utility Functions** (`buysellapi/email_utils.py`)

   - `send_notification_email()` - Core sending function
   - `send_tracking_status_update()` - Tracking updates
   - `send_welcome_email()` - New user welcome
   - `send_shipping_mark_created_email()` - Shipping mark notification
   - `send_admin_announcement()` - Custom admin messages

4. **Django Signals** (`buysellapi/signals.py`)

   - Auto-send on tracking creation/update
   - Auto-send welcome email on user registration
   - Auto-send on shipping mark creation

5. **Admin API Endpoints** (`buysellapi/views.py` + `urls.py`)

   - `POST /api/admin/notifications/send/` - Send to single user
   - `POST /api/admin/notifications/broadcast/` - Send to multiple users
   - `GET /api/admin/notifications/history/` - View notification history

6. **EmailNotification Serializer** (`buysellapi/serializers.py`)
   - JSON serialization for API responses
   - Includes user email, full name, tracking number

## 📋 Setup Checklist

- [x] Email configuration added to settings.py
- [x] EmailNotification model created
- [x] Database migration created and applied
- [x] Email utility functions implemented
- [x] Django signals for auto-notifications
- [x] Admin API endpoints created
- [x] URL routes configured
- [x] Serializers created
- [x] .env.example file created
- [x] .gitignore updated to exclude .env
- [x] EMAIL_SETUP.md documentation created

## 🚀 Next Steps (Manual Configuration Required)

1. **Generate Gmail App Password**

   - Go to: https://myaccount.google.com/apppasswords
   - Create app password for "Mail"
   - Save the 16-character password

2. **Create .env File**

   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and add your Gmail credentials
   ```

3. **Set Environment Variables**

   ```
   EMAIL_HOST_USER=your-email@gmail.com
   EMAIL_HOST_PASSWORD=your-app-password
   DEFAULT_FROM_EMAIL=BuySell Support <your-email@gmail.com>
   SITE_URL=http://localhost:5173
   ```

4. **Test Email Sending**

   ```python
   python manage.py shell
   from buysellapi.models import UserModel
   from buysellapi.email_utils import send_welcome_email
   user = UserModel.objects.first()
   send_welcome_email(user)
   ```

5. **Restart Django Server**
   ```bash
   cd backend
   python manage.py runserver
   ```

## 📧 Email Types & Triggers

| Email Type            | Trigger                       | Automatic | Recipient       |
| --------------------- | ----------------------------- | --------- | --------------- |
| Tracking Update       | Status change or new tracking | ✅ Yes    | Tracking owner  |
| Welcome Email         | New user registration         | ✅ Yes    | New user        |
| Shipping Mark Created | Mark generated                | ✅ Yes    | Mark owner      |
| Admin Announcement    | Admin sends via API           | ❌ Manual | Admin specified |

## 🔧 API Usage Examples

### Send to Single User

```bash
curl -X POST http://localhost:8000/api/admin/notifications/send/ \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "subject": "Important Update",
    "message": "Your shipment has been processed."
  }'
```

### Broadcast to All Users

```bash
curl -X POST http://localhost:8000/api/admin/notifications/broadcast/ \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "System Maintenance",
    "message": "The system will be down tonight."
  }'
```

### View Notification History

```bash
curl http://localhost:8000/api/admin/notifications/history/?status=sent&limit=20 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 📊 Database Schema

### EmailNotification Table

```sql
CREATE TABLE emailnotification (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    tracking_id INTEGER NULL,
    notification_type VARCHAR(50),
    subject VARCHAR(255),
    message TEXT,
    html_message TEXT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    sent_at DATETIME NULL,
    error_message TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES usermodel(id),
    FOREIGN KEY (tracking_id) REFERENCES tracking(id)
);
```

## 🔒 Security Notes

- ✅ Credentials stored in environment variables (not in code)
- ✅ .env file excluded from git
- ✅ Only admins can send manual notifications
- ✅ App password used (not actual Gmail password)
- ✅ Admin users excluded from auto-notifications

## 📖 Documentation Files

- `EMAIL_SETUP.md` - Detailed setup instructions
- `.env.example` - Environment variable template
- `.gitignore` - Excludes sensitive files

## 🐛 Troubleshooting

**Emails not sending?**

1. Check `.env` file exists and has correct values
2. Verify Gmail app password is correct (16 chars, no spaces)
3. Check Django console for error messages
4. Look at EmailNotification records for error_message field

**Gmail App Password not working?**

1. Ensure 2FA is enabled on Gmail account
2. Generate a new app password
3. Use the password exactly as shown (spaces don't matter)

**Too many emails?**

- Edit `buysellapi/signals.py` to limit triggers
- Add logic to check if status actually changed before sending

## 📚 Additional Resources

- Gmail App Passwords: https://myaccount.google.com/apppasswords
- Django Email Documentation: https://docs.djangoproject.com/en/stable/topics/email/
- SMTP Troubleshooting: Check Gmail SMTP settings and account security
