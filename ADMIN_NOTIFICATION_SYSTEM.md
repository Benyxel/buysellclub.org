# Admin Notification System

## Overview

The admin notification system automatically sends email alerts to all admin users when important events occur on the platform. This helps admins stay informed about new user registrations and shipment activities.

## Features

### 1. New User Signup Notifications

When a new user registers on the platform, all admins receive an email notification with:

- User's full name
- Email address
- Contact number
- Username
- Registration date and time

**Email Subject:** `🆕 New User Registration: [User Name]`

### 2. New Shipment Notifications

When a user adds a new shipment/tracking, all admins receive an email notification with:

- Tracking number
- User details (name, email, contact)
- Shipment status
- Shipping mark
- CBM (cubic meters)
- ETA (estimated time of arrival)
- Date and time added

**Email Subject:** `📦 New Shipment Added: [Tracking Number]`

## Implementation Details

### Backend Components

#### 1. Email Utility Functions

**File:** `backend/buysellapi/email_utils.py`

Two new functions were added:

**`notify_admin_new_user_signup(new_user)`**

- Sends notification to all admins when a user signs up
- Parameters: `new_user` - UserModel instance
- Returns: List of EmailNotification instances
- HTML email with formatted user details table

**`notify_admin_new_shipment(tracking)`**

- Sends notification to all admins when a user adds a shipment
- Parameters: `tracking` - Tracking instance
- Returns: List of EmailNotification instances
- HTML email with formatted shipment details table

#### 2. Django Signals

**File:** `backend/buysellapi/signals.py`

**Updated `send_welcome_notification` signal:**

```python
@receiver(post_save, sender=UserModel)
def send_welcome_notification(sender, instance, created, **kwargs):
    """
    Send welcome email when a new user registers.
    Also notify admins about new user signup.
    """
    if created and instance.role != "admin":
        # Send welcome email to the new user
        send_welcome_email(instance)

        # Notify all admins about the new user
        notify_admin_new_user_signup(instance)
```

**Updated `send_tracking_notification` signal:**

```python
@receiver(post_save, sender=Tracking)
def send_tracking_notification(sender, instance, created, **kwargs):
    """
    Send email notification to user and admins.
    """
    if instance.owner and instance.owner.role != "admin":
        if created:
            # Send notification to user
            send_tracking_status_update(instance)

            # Notify all admins about the new shipment
            notify_admin_new_shipment(instance)
```

#### 3. Email Notification Model

**File:** `backend/buysellapi/models.py`

Added new notification type:

```python
NOTIFICATION_TYPES = [
    # ... existing types
    ("admin_notification", "Admin Notification"),
    # ... other types
]
```

#### 4. Database Migration

**File:** `backend/buysellapi/migrations/0019_alter_emailnotification_notification_type.py`

Updated the notification_type field to include "admin_notification" choice.

## Email Templates

### User Signup Email (Admin)

```
Subject: 🆕 New User Registration: [User Name]

Hello Admin,

A new user has registered on [SITE_NAME]:

┌──────────────────────────────────┐
│ User Details                      │
├──────────────────────────────────┤
│ Name:       [User Full Name]     │
│ Email:      [user@email.com]     │
│ Contact:    [Contact Number]     │
│ Username:   [username]           │
│ Registered: [Date and Time]      │
└──────────────────────────────────┘

You can manage this user from the admin panel.
```

### New Shipment Email (Admin)

```
Subject: 📦 New Shipment Added: [Tracking Number]

Hello Admin,

User [User Name] has added a new shipment:

┌──────────────────────────────────┐
│ Shipment Details                 │
├──────────────────────────────────┤
│ Tracking Number: [ABC123]        │
│ User:           [Name (email)]   │
│ Contact:        [Phone]          │
│ Status:         [Status]         │
│ Shipping Mark:  [Mark ID]        │
│ CBM:            [1.5]            │
│ ETA:            [Date]           │
│ Added:          [Date and Time]  │
└──────────────────────────────────┘

You can manage this shipment from the admin panel.
```

## How It Works

### Flow Diagram - User Signup

```
User Registers
    ↓
UserModel.save() called
    ↓
Django Signal: send_welcome_notification
    ↓
1. send_welcome_email(user)
    └→ User receives welcome email
    ↓
2. notify_admin_new_user_signup(user)
    ├→ Query all admin users
    ├→ For each admin:
    │   ├→ Create EmailNotification record
    │   ├→ Send email via Gmail SMTP
    │   └→ Update notification status
    └→ Return list of notifications
```

### Flow Diagram - New Shipment

```
User Adds Tracking Number
    ↓
Tracking.save() called
    ↓
Django Signal: send_tracking_notification
    ↓
1. send_tracking_status_update(tracking)
    └→ User receives tracking confirmation
    ↓
2. notify_admin_new_shipment(tracking)
    ├→ Query all admin users
    ├→ For each admin:
    │   ├→ Create EmailNotification record
    │   ├→ Send email via Gmail SMTP
    │   └→ Update notification status
    └→ Return list of notifications
```

## Testing

### Test Script

**File:** `backend/test_admin_notifications.py`

Comprehensive test script that:

1. Checks for admin users in the system
2. Creates test admin if none exist
3. Tests user signup notification
4. Tests new shipment notification
5. Shows notification statistics

**Run test:**

```bash
cd backend
python test_admin_notifications.py
```

**Expected Output:**

```
============================================================
TESTING ADMIN NOTIFICATION SYSTEM
============================================================

📊 Admin users in system: 1
   - Admin System (admin@example.com)

📊 Regular users in system: 2
   Using existing user: John Doe (john@example.com)

============================================================
TEST 1: Admin Notification for User Signup
============================================================
✅ Sent 1 admin notification(s) about user signup
   - To: admin@example.com
   - Subject: 🆕 New User Registration: John Doe
   - Status: sent

============================================================
TEST 2: Admin Notification for New Shipment
============================================================
✅ Sent 1 admin notification(s) about new shipment
   - To: admin@example.com
   - Subject: 📦 New Shipment Added: ABC123
   - Status: sent

📊 Admin Notification Statistics:
   ✅ Sent: 2
   ❌ Failed: 0
   ⏳ Pending: 0
```

### Manual Testing

1. **Test User Signup Notification:**

   ```bash
   # Register a new user via the frontend
   # Or create via Django shell:
   python manage.py shell
   >>> from buysellapi.models import UserModel
   >>> user = UserModel.objects.create(
   ...     username="testuser",
   ...     email="test@example.com",
   ...     full_name="Test User",
   ...     role="user",
   ...     contact="1234567890"
   ... )
   >>> # Check admin's email inbox
   ```

2. **Test Shipment Notification:**
   ```bash
   # Add a tracking via the frontend
   # Or create via Django shell:
   python manage.py shell
   >>> from buysellapi.models import Tracking, UserModel
   >>> user = UserModel.objects.get(email="test@example.com")
   >>> tracking = Tracking.objects.create(
   ...     tracking_number="TEST123",
   ...     owner=user,
   ...     status="in_transit",
   ...     cbm=1.5
   ... )
   >>> # Check admin's email inbox
   ```

## Configuration

### Admin Users

To receive notifications, users must have `role="admin"` in the UserModel.

**Create admin user:**

```python
from buysellapi.models import UserModel

admin = UserModel.objects.create(
    username="admin",
    email="admin@example.com",
    full_name="Admin User",
    role="admin",  # Important!
    contact="1234567890"
)
```

**Check admin users:**

```bash
python manage.py shell
>>> from buysellapi.models import UserModel
>>> admins = UserModel.objects.filter(role="admin")
>>> for admin in admins:
...     print(f"{admin.full_name} ({admin.email})")
```

### Email Settings

Make sure these are set in `backend/.env`:

```env
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=Your Site <your-email@gmail.com>
EMAIL_PORT=465
EMAIL_USE_SSL=True
```

## Notification Database Records

All admin notifications are stored in the `EmailNotification` model with:

- `notification_type` = "admin_notification"
- `user` = Admin user receiving the notification
- `status` = "sent", "failed", or "pending"
- `tracking` = Related tracking (for shipment notifications)

**Query admin notifications:**

```python
from buysellapi.models import EmailNotification

# All admin notifications
admin_notifs = EmailNotification.objects.filter(
    notification_type="admin_notification"
)

# Recent admin notifications
recent = admin_notifs.order_by("-created_at")[:10]

# Failed notifications
failed = admin_notifs.filter(status="failed")

# Notifications for specific admin
admin_notifs.filter(user__email="admin@example.com")
```

## Error Handling

The system includes comprehensive error handling:

1. **No Admin Users:** Logs warning, returns empty list
2. **Email Send Failure:** Marks notification as "failed", logs error
3. **Missing User Owner:** Returns empty list (shipment notifications)
4. **Signal Errors:** Prints error but doesn't break the save operation

**Check for failed notifications:**

```bash
python manage.py shell
>>> from buysellapi.models import EmailNotification
>>> failed = EmailNotification.objects.filter(
...     notification_type="admin_notification",
...     status="failed"
... )
>>> for notif in failed:
...     print(f"{notif.subject} - Error: {notif.error_message}")
```

## Future Enhancements

Potential improvements:

1. Admin notification preferences (enable/disable per admin)
2. Notification frequency settings (immediate, daily digest)
3. Slack/Discord integration for instant admin alerts
4. Dashboard widget showing pending admin actions
5. Email notification templates stored in database
6. Admin notification categories (critical, info, warning)
7. Push notifications for mobile admin app

## Troubleshooting

### Admins Not Receiving Emails

1. **Check admin role:**

   ```python
   UserModel.objects.filter(email="admin@example.com").values("role")
   # Should show: {'role': 'admin'}
   ```

2. **Check email settings:**

   ```bash
   python manage.py shell
   >>> from django.conf import settings
   >>> print(settings.EMAIL_HOST_USER)
   >>> print(settings.EMAIL_PORT)
   ```

3. **Check notification records:**

   ```python
   EmailNotification.objects.filter(
       notification_type="admin_notification"
   ).order_by("-created_at").first()
   ```

4. **Check spam folder:** Gmail might filter automated emails

### Signal Not Triggering

1. **Check if signals are imported:**

   - Verify `buysellapi/apps.py` has `ready()` method
   - Ensure signals.py is imported in `ready()`

2. **Check raw save:**

   - Signals skip when `raw=True` (used in migrations)

3. **Check admin users exist:**
   ```python
   UserModel.objects.filter(role="admin").count()
   # Should be > 0
   ```

## Related Files

- `backend/buysellapi/email_utils.py` - Email notification functions
- `backend/buysellapi/signals.py` - Django signal handlers
- `backend/buysellapi/models.py` - UserModel, Tracking, EmailNotification
- `backend/test_admin_notifications.py` - Test script
- `backend/.env` - Email configuration

## Summary

The admin notification system provides real-time alerts to administrators about important platform events. It integrates seamlessly with the existing email system, uses Django signals for automatic triggering, and maintains a complete audit trail in the database.

**Key Benefits:**

- ✅ Automatic notifications for critical events
- ✅ No manual checking required
- ✅ Complete audit trail in database
- ✅ Professional HTML email formatting
- ✅ Supports multiple admin users
- ✅ Error handling and logging
- ✅ Easy to test and extend
