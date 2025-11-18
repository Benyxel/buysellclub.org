# Admin Notification Badge System

## Overview

The admin notification badge system displays real-time notification counts in the admin interface, showing unread notifications about user signups and shipments. This provides admins with instant visibility into platform activities.

## Features

### 1. Notification Badge Counter

- Shows unread notification count (red badge)
- Updates in real-time when new notifications arrive
- Distinguishes between read and unread notifications

### 2. Notification Status Tracking

- **Sent (Unread)**: New notifications that haven't been read
- **Read**: Notifications marked as read by admin
- **Failed**: Notifications that failed to send
- **Pending**: Notifications queued for sending

### 3. Mark as Read Functionality

- Mark individual notifications as read
- Mark all notifications as read at once
- Automatic badge count updates

## API Endpoints

### Get Admin Notifications

**Endpoint:** `GET /api/admin/notifications/me/`

**Description:** Retrieves notifications for the authenticated admin user.

**Query Parameters:**

- `limit` (optional, default: 50): Number of results to return
- `unread_only` (optional, boolean): If true, returns only unread notifications

**Authentication:** Required (Admin only)

**Response:**

```json
{
  "notifications": [
    {
      "id": 1,
      "user": 2,
      "notification_type": "admin_notification",
      "subject": "🆕 New User Registration: John Doe",
      "message": "Hello Admin...",
      "html_message": "<html>...",
      "status": "sent",
      "sent_at": "2025-11-02T23:01:35Z",
      "created_at": "2025-11-02T23:01:35Z",
      "tracking": null,
      "user_email": "admin@example.com"
    }
  ],
  "unread_count": 2,
  "total_count": 15
}
```

**Example Usage:**

```javascript
// Get all admin notifications
const response = await API.get("/buysellapi/admin/notifications/me/");

// Get only unread notifications
const unread = await API.get(
  "/buysellapi/admin/notifications/me/?unread_only=true"
);

// Get last 10 notifications
const recent = await API.get("/buysellapi/admin/notifications/me/?limit=10");
```

---

### Mark Notification as Read

**Endpoint:** `PATCH /api/notifications/<notification_id>/mark-read/`

**Description:** Marks a specific notification as read.

**Path Parameters:**

- `notification_id`: ID of the notification to mark as read

**Authentication:** Required (User can only mark their own notifications)

**Response:**

```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

**Example Usage:**

```javascript
const markRead = async (notificationId) => {
  await API.patch(`/buysellapi/notifications/${notificationId}/mark-read/`);
};
```

---

### Mark All Notifications as Read

**Endpoint:** `POST /api/notifications/mark-all-read/`

**Description:** Marks all unread notifications as read for the authenticated user.

**Authentication:** Required

**Response:**

```json
{
  "success": true,
  "message": "Marked 5 notifications as read",
  "count": 5
}
```

**Example Usage:**

```javascript
const markAllRead = async () => {
  const response = await API.post("/buysellapi/notifications/mark-all-read/");
  console.log(`Marked ${response.data.count} notifications as read`);
};
```

---

## Frontend Implementation

### Admin Notification Badge Component

Here's a sample React component for displaying the notification badge:

```javascript
import React, { useState, useEffect } from "react";
import { FaBell } from "react-icons/fa";
import API from "../api";

const AdminNotificationBadge = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch notification count
  const fetchNotifications = async () => {
    try {
      const response = await API.get(
        "/buysellapi/admin/notifications/me/?limit=10"
      );
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await API.patch(`/buysellapi/notifications/${notificationId}/mark-read/`);
      await fetchNotifications(); // Refresh
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await API.post("/buysellapi/notifications/mark-all-read/");
      await fetchNotifications(); // Refresh
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      {/* Bell Icon with Badge */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-primary"
      >
        <FaBell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-primary hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                    notif.status === "sent" ? "bg-blue-50" : ""
                  }`}
                  onClick={() => markAsRead(notif.id)}
                >
                  <p className="font-medium text-sm">{notif.subject}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notif.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t text-center">
            <a
              href="/admin/notifications"
              className="text-sm text-primary hover:underline"
            >
              View all notifications
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotificationBadge;
```

---

## Backend Implementation Details

### Database Schema

**EmailNotification Model:**

```python
class EmailNotification(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("sent", "Sent"),      # Unread
        ("read", "Read"),      # Read by user
        ("failed", "Failed"),
        ("bounced", "Bounced"),
    ]

    user = models.ForeignKey(UserModel, on_delete=models.CASCADE)
    notification_type = models.CharField(max_length=50)
    subject = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    tracking = models.ForeignKey(Tracking, null=True, blank=True)
```

### Views

**AdminNotificationsView:**

```python
class AdminNotificationsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        # Filter by admin user and notification_type='admin_notification'
        # Count unread (status='sent')
        # Return notifications with unread_count
```

**MarkNotificationReadView:**

```python
class MarkNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_id):
        # Update notification.status = 'read'
        # Verify ownership
```

**MarkAllNotificationsReadView:**

```python
class MarkAllNotificationsReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Update all user's sent notifications to read
        # Return count of updated notifications
```

---

## How It Works

### Flow Diagram - Notification Badge Update

```
Admin Opens Dashboard
    ↓
Frontend calls GET /api/admin/notifications/me/
    ↓
Backend queries EmailNotification
    └→ Filter: user=admin, notification_type='admin_notification'
    └→ Count: status='sent' (unread)
    ↓
Return: {notifications, unread_count: 2}
    ↓
Frontend displays badge: 🔔 (2)
```

### Flow Diagram - Mark as Read

```
Admin Clicks Notification
    ↓
Frontend calls PATCH /api/notifications/{id}/mark-read/
    ↓
Backend updates notification.status = 'read'
    ↓
Return: {success: true}
    ↓
Frontend refreshes notifications
    ↓
Badge count decreases: 🔔 (1)
```

### Flow Diagram - Real-time Updates

```
New User Signs Up
    ↓
Django Signal: notify_admin_new_user_signup()
    ↓
EmailNotification created with status='sent'
    ↓
Email sent to admin
    ↓
[30 seconds later]
    ↓
Frontend polls GET /api/admin/notifications/me/
    ↓
unread_count increases: 🔔 (3)
    ↓
Badge updates automatically
```

---

## Testing

### Test Script

**File:** `backend/test_admin_badge.py`

Run the test:

```bash
cd backend
python test_admin_badge.py
```

**Expected Output:**

```
============================================================
TESTING ADMIN NOTIFICATION BADGE SYSTEM
============================================================

📊 Admin users in system: 1
📬 Total admin notifications: 2
   🔔 Unread (sent): 2
   ✅ Read: 0
   ❌ Failed: 0

📋 Recent notifications:
   🔔 📦 New Shipment Added: ABC123
   🔔 🆕 New User Registration: John Doe
```

### Manual API Testing

**1. Get notification count:**

```bash
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:8000/api/admin/notifications/me/
```

**2. Mark notification as read:**

```bash
curl -X PATCH \
  -H "Authorization: Bearer <admin_token>" \
  http://localhost:8000/api/notifications/1/mark-read/
```

**3. Mark all as read:**

```bash
curl -X POST \
  -H "Authorization: Bearer <admin_token>" \
  http://localhost:8000/api/notifications/mark-all-read/
```

---

## Configuration

### Polling Interval

Configure how often the frontend checks for new notifications:

```javascript
// Poll every 30 seconds (recommended)
const POLL_INTERVAL = 30000;

// Poll every minute (less server load)
const POLL_INTERVAL = 60000;

// Poll every 15 seconds (more responsive)
const POLL_INTERVAL = 15000;
```

### Badge Display

Configure badge appearance:

```javascript
// Show exact count up to 99
{
  unreadCount > 99 ? "99+" : unreadCount;
}

// Show exact count up to 9
{
  unreadCount > 9 ? "9+" : unreadCount;
}

// Show only indicator
{
  unreadCount > 0 && <span className="badge" />;
}
```

---

## Security Considerations

1. **Authentication Required:** All endpoints require valid JWT token
2. **Admin-Only Access:** Admin notifications endpoint restricted to admin role
3. **Ownership Verification:** Users can only mark their own notifications as read
4. **Rate Limiting:** Consider rate limiting for polling endpoints
5. **Input Validation:** Notification IDs validated before updates

---

## Database Queries

### Get Unread Count for Admin

```python
unread_count = EmailNotification.objects.filter(
    user=admin_user,
    notification_type='admin_notification',
    status='sent'
).count()
```

### Get All Admin Notifications

```python
notifications = EmailNotification.objects.filter(
    user=admin_user,
    notification_type='admin_notification'
).order_by('-created_at')[:50]
```

### Mark Notification as Read

```python
notification = EmailNotification.objects.get(id=notif_id, user=user)
notification.status = 'read'
notification.save()
```

### Mark All as Read

```python
updated = EmailNotification.objects.filter(
    user=user,
    status='sent'
).update(status='read')
```

---

## Performance Optimization

### Database Indexing

Add indexes for faster queries:

```python
class EmailNotification(models.Model):
    class Meta:
        indexes = [
            models.Index(fields=['user', 'notification_type', 'status']),
            models.Index(fields=['user', 'created_at']),
        ]
```

### Caching

Cache unread counts to reduce database queries:

```python
from django.core.cache import cache

def get_unread_count(user):
    cache_key = f'unread_count_{user.id}'
    count = cache.get(cache_key)

    if count is None:
        count = EmailNotification.objects.filter(
            user=user,
            notification_type='admin_notification',
            status='sent'
        ).count()
        cache.set(cache_key, count, timeout=60)  # Cache for 1 minute

    return count
```

### Pagination

Limit results to prevent large queries:

```python
# Already implemented in views
limit = int(request.query_params.get("limit", 50))
notifications = queryset.order_by("-created_at")[:limit]
```

---

## Troubleshooting

### Badge Not Updating

1. **Check authentication:**

   ```javascript
   const token = localStorage.getItem("token");
   console.log("Token:", token ? "Present" : "Missing");
   ```

2. **Check admin role:**

   ```python
   user = UserModel.objects.get(username='admin')
   print(f"Role: {user.role}")  # Should be 'admin'
   ```

3. **Check notifications exist:**
   ```python
   EmailNotification.objects.filter(
       notification_type='admin_notification'
   ).count()
   ```

### Unread Count Incorrect

1. **Check notification status:**

   ```python
   EmailNotification.objects.filter(
       user=admin_user,
       notification_type='admin_notification'
   ).values('status', 'subject')
   ```

2. **Verify status values:**
   - Unread = `status='sent'`
   - Read = `status='read'`
   - Not failed or bounced

### Mark as Read Not Working

1. **Check ownership:**

   ```python
   notification = EmailNotification.objects.get(id=notif_id)
   print(f"Owner: {notification.user.username}")
   print(f"Current User: {request.user.username}")
   ```

2. **Check permissions:**
   ```python
   print(f"Is authenticated: {request.user.is_authenticated}")
   ```

---

## Future Enhancements

1. **WebSocket Integration:** Real-time updates without polling
2. **Push Notifications:** Browser push notifications for new alerts
3. **Notification Preferences:** Allow admins to customize notification types
4. **Sound Alerts:** Audio notification for new admin alerts
5. **Desktop Notifications:** Native OS notifications
6. **Notification Grouping:** Group similar notifications (e.g., "5 new signups")
7. **Priority Levels:** Mark critical notifications with high priority
8. **Notification Archive:** Archive old notifications after 30 days

---

## Related Files

- `backend/buysellapi/views.py` - AdminNotificationsView, MarkNotificationReadView
- `backend/buysellapi/urls.py` - API endpoint routes
- `backend/buysellapi/models.py` - EmailNotification model
- `backend/test_admin_badge.py` - Test script
- `ADMIN_NOTIFICATION_SYSTEM.md` - Admin notification system docs

---

## Summary

The admin notification badge system provides:

- ✅ Real-time unread notification count
- ✅ Mark as read functionality (individual & bulk)
- ✅ Secure admin-only access
- ✅ Efficient database queries
- ✅ Easy frontend integration
- ✅ Comprehensive API endpoints

This system ensures admins stay informed about platform activities without manually checking for updates.
