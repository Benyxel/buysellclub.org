# User Notifications Integration - Profile Page

## Overview

Successfully integrated the backend email notification system with the frontend profile page. Users can now view all email notifications they've received directly in their profile.

## What Was Implemented

### Backend Changes

#### 1. User Notifications API Endpoint

**File:** `backend/buysellapi/views.py`

Created `UserNotificationsView` class-based view that:

- Filters `EmailNotification` records for the authenticated user
- Supports pagination with `limit` query parameter (default: 50)
- Provides `unread_count` and `total_count` in response
- Returns notifications sorted by date (newest first)

**Endpoint:** `GET /api/notifications/me/`

**Response Format:**

```json
{
  "notifications": [
    {
      "id": 1,
      "user": 2,
      "notification_type": "tracking_update",
      "subject": "Tracking Update: Arrived in Ghana",
      "message": "<html>Your shipment has arrived...</html>",
      "status": "sent",
      "sent_at": "2025-11-02T20:15:30Z",
      "tracking_number": "ABC123",
      "user_email": "user@example.com"
    }
  ],
  "unread_count": 3,
  "total_count": 15
}
```

#### 2. URL Configuration

**File:** `backend/buysellapi/urls.py`

Added route:

```python
path("notifications/me/", UserNotificationsView.as_view(), name="user-notifications")
```

### Frontend Changes

#### 1. Fetch Notifications Function

**File:** `frontend/src/components/MyProfile.jsx`

Created `fetchUserNotifications()` async function that:

- Calls `/api/notifications/me?limit=50` endpoint
- Transforms backend format to frontend format:
  - `notification_type` → `type`
  - `subject` → `title`
  - `sent_at` → `date`
  - `status !== "sent"` → `read` (logic: unread if just sent)
  - Adds `trackingNumber` field
- Sorts notifications by date (newest first)
- Updates `notifications` state and `unreadCount`
- Falls back to localStorage if API fails

#### 2. Notification Loading

- Replaced localStorage-only loading with API call
- Updated `useEffect` to call `fetchUserNotifications()` on component mount
- Maintains localStorage fallback for offline support

#### 3. UI Enhancements

**Refresh Button:**

- Added refresh button with sync icon in notifications header
- Users can manually fetch latest notifications
- Button positioned next to "Mark all as read"

**Notification Cards:**

- Display tracking numbers as badges (when available)
- Enhanced date format: "Nov 2, 2025, 10:15 PM"
- HTML message rendering with `dangerouslySetInnerHTML`
- Type-specific icons:
  - 🚚 Truck icon for `tracking_update`
  - 👤 User icon for `welcome`
  - 📦 Box icon for `shipping_mark`
  - 🔔 Bell icon for `announcement`
- Color-coded backgrounds by notification type

## Notification Types

The system handles 5 types of email notifications:

1. **tracking_update** - Shipment status changes (blue)
2. **welcome** - New user registration (green)
3. **shipping_mark** - Shipping mark creation (purple)
4. **announcement** - Admin announcements (yellow)
5. **general** - Other notifications (gray)

## How It Works

### Flow Diagram

```
User Action (e.g., admin updates tracking)
    ↓
Django Signal (send_tracking_notification)
    ↓
email_utils.send_tracking_status_update()
    ↓
EmailNotification record created in database
    ↓
Email sent via Gmail SMTP (SSL port 465)
    ↓
User opens profile page
    ↓
fetchUserNotifications() called
    ↓
GET /api/notifications/me/
    ↓
Notifications displayed in "Updates" tab
```

## Testing

### Existing Test Data

Database currently has 3 sent emails that can be viewed in the profile.

### Test Scenarios

1. **View Notifications:**

   - Login to the application
   - Navigate to profile page
   - Click "Updates" tab (bell icon)
   - Should see list of email notifications

2. **Refresh Notifications:**

   - Click "Refresh" button in notifications header
   - New notifications should appear

3. **Check Unread Count:**

   - Badge on "Updates" tab shows unread count
   - Count updates after marking as read

4. **Tracking Number Display:**
   - Tracking update notifications show tracking number badge
   - Click tracking number to view details (if implemented)

## API Usage Examples

### Fetch All Notifications

```javascript
const response = await API.get("/buysellapi/notifications/me");
// Returns: { notifications: [...], unread_count: 3, total_count: 15 }
```

### Fetch Limited Notifications

```javascript
const response = await API.get("/buysellapi/notifications/me?limit=10");
// Returns only last 10 notifications
```

### Fetch Unread Only (Backend supports this)

```javascript
const response = await API.get("/buysellapi/notifications/me?unread_only=true");
// Returns only unread notifications
```

## Current Status

✅ **Completed:**

- Backend API endpoint for user notifications
- URL routing configured
- Frontend fetch function implemented
- UI updated with refresh button
- Notification cards enhanced with tracking numbers
- Type-specific icons and colors
- HTML message rendering
- Fallback to localStorage for offline mode

⏳ **Future Enhancements:**

- Mark individual notifications as read (backend endpoint needed)
- Delete notifications (currently UI only)
- Real-time notifications with WebSocket
- Notification preferences/settings
- Email notification preview before sending
- Notification categories/filters

## Files Modified

1. `backend/buysellapi/views.py` - Added UserNotificationsView
2. `backend/buysellapi/urls.py` - Added notifications/me route
3. `frontend/src/components/MyProfile.jsx` - Added fetchUserNotifications, updated UI

## Environment Variables

Make sure these are set in `backend/.env`:

```env
EMAIL_HOST_USER=yeboahboanubernard1997@gmail.com
EMAIL_HOST_PASSWORD=sibaztqnwgtmtwbu
DEFAULT_FROM_EMAIL=BuySell Support <yeboahboanubernard1997@gmail.com>
EMAIL_PORT=465
EMAIL_USE_SSL=True
```

## Related Documentation

- `EMAIL_SETUP.md` - Gmail SMTP configuration guide
- `EMAIL_QUICK_REFERENCE.md` - Email system quick reference
- `backend/check_emails.py` - Script to verify email sending

## Known Issues

1. **Mark as Read:** Currently updates localStorage only, not synced with backend
2. **Delete Notifications:** Frontend only, doesn't delete from database
3. **Polling:** No automatic refresh, user must click refresh button

## Next Steps

1. Implement backend endpoint for marking notifications as read
2. Implement backend endpoint for deleting notifications
3. Add WebSocket support for real-time notifications
4. Add notification sound/desktop notifications
5. Implement notification preferences (email vs in-app)
