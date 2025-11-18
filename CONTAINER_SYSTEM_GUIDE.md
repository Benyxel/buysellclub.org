# Container-Based Tracking System Implementation

## Overview

This document describes the container-based tracking system that allows grouping individual tracking numbers (packages) into shipping containers for transport from China to Ghana.

## System Architecture

### Database Models

#### Container Model (`backend/buysellapi/models.py`)

```python
class Container(models.Model):
    container_number = CharField(unique=True)  # e.g., "CONT-2025-001"
    port_of_loading = CharField(default="China")
    port_of_discharge = CharField(default="Ghana")
    status = CharField(choices=STATUS_CHOICES)
    departure_date = DateField(nullable)
    arrival_date = DateField(nullable)
    notes = TextField
    created_at = DateTimeField(auto)
    updated_at = DateTimeField(auto)
```

**Status Choices:**

- preparing
- loading
- in_transit
- arrived_port
- clearing
- completed

**Methods:**

- `get_tracking_count()`: Returns total packages in container
- `get_unique_mark_ids()`: Returns list of unique shipping marks
- `get_mark_id_stats()`: Returns grouped statistics by mark ID

#### Updated Tracking Model

```python
class Tracking(models.Model):
    # Existing fields...
    container = ForeignKey(Container, nullable=True, on_delete=SET_NULL)
```

### API Endpoints

#### Container Management

- `GET /api/admin/containers` - List all containers (paginated)

  - Query params: `page`, `limit`, `search`, `sortBy`
  - Returns: Container list with tracking counts and unique marks

- `POST /api/admin/containers` - Create new container

  - Body: container_number, port_of_loading, port_of_discharge, status, departure_date, arrival_date, notes

- `GET /api/admin/containers/<id>` - Get container details

  - Returns: Full container info with nested trackings and mark ID statistics

- `PUT /api/admin/containers/<id>` - Update container

  - Body: Any container fields to update

- `DELETE /api/admin/containers/<id>` - Delete container

  - Note: Trackings are set to NULL (not deleted)

- `GET /api/admin/containers/<id>/mark-stats` - Get mark ID statistics
  - Returns: Grouped stats by shipping mark with counts, total CBM, total fees

#### Updated Tracking Endpoints

- `POST /buysellapi/trackings/` - Now accepts `container` field (ID)
- `PUT /buysellapi/trackings/<id>/` - Can update container assignment

### Frontend Components

#### ContainerManagement Component

Location: `frontend/src/components/ContainerManagement.jsx`

**Features:**

- Create/Edit/Delete containers
- View container list with:
  - Container number and status
  - Route (port of loading → discharge)
  - Total packages and unique marks
  - Departure and arrival dates
- Search and sort functionality
- Detailed view modal showing:
  - Container information
  - Statistics grouped by mark ID
  - Full list of tracking numbers

#### Updated TrackingManagement

Location: `frontend/src/pages/admin/TrackingManagement.jsx`

**Changes:**

- Added container dropdown in add/edit form
- Dropdown shows: "Container Number - Status"
- Container field is optional
- Fetches active containers on component load

#### Admin Dashboard Integration

Location: `frontend/src/pages/admin/AdminDashboard.jsx`

**Changes:**

- Added "Containers" tab to Shipping section
- Tab appears after "Shipping Marks Viewer"
- Icon: FaBox

## Usage Workflow

### Creating a Container

1. Navigate to Admin Dashboard → Shipping → Containers
2. Click "Add Container"
3. Fill in:
   - Container Number (required, unique)
   - Ports of Loading/Discharge
   - Status
   - Departure/Arrival dates (optional)
   - Notes (optional)
4. Click "Create"

### Linking Tracking Numbers to Container

1. Go to Admin Dashboard → Shipping → Tracking Numbers
2. Click "Add New Tracking" or edit existing
3. Fill tracking details
4. Select container from dropdown (optional)
5. Save tracking

### Viewing Container Statistics

1. Go to Containers tab
2. Click eye icon on any container
3. View modal shows:
   - Container info (status, dates, route)
   - Statistics by Mark ID:
     - Number of packages per mark
     - Total CBM per mark
     - Total shipping fee per mark
   - Complete list of all trackings in container

### Searching by Mark ID

1. Open container details
2. Check "Statistics by Mark ID" table
3. See which marks have packages in this container
4. View count, CBM, and fees for each mark

## Data Flow

### Adding Tracking with Container:

```
User Input → Frontend Form
    ↓
API POST /buysellapi/trackings/
{
  tracking_number: "ABC123",
  container: 5,  // Container ID
  shipping_mark: "M856-FIM001",
  status: "pending",
  cbm: 1.5,
  ...
}
    ↓
Backend saves Tracking with container FK
    ↓
Container stats automatically updated via model methods
```

### Viewing Container Stats:

```
User clicks "View Details"
    ↓
API GET /api/admin/containers/<id>
    ↓
Backend serializer calls:
  - container.get_tracking_count()
  - container.get_mark_id_stats()
    ↓
Returns JSON with:
  - Container info
  - Nested trackings array
  - Mark ID statistics array
    ↓
Frontend displays in modal
```

## Key Features

### 1. Flexible Container Assignment

- Containers are optional for tracking numbers
- Can assign/unassign containers at any time
- Existing trackings not affected by container deletion (FK set to NULL)

### 2. Real-Time Statistics

- Container stats calculated on-demand
- Mark ID grouping uses Django aggregation
- Shows:
  - Total packages in container
  - Unique mark IDs count
  - Per-mark statistics (count, CBM, fees)

### 3. Search and Filter

- Search containers by:
  - Container number
  - Port names
  - Status
- Sort by:
  - Creation date
  - Container number
  - Departure date

### 4. Status Tracking

- Containers have 6 status levels
- Status updates independent of tracking statuses
- Color-coded badges for quick visual identification

## Migration Information

Migration file: `backend/buysellapi/migrations/0024_add_container_model.py`

**Changes:**

1. Creates Container table
2. Adds container FK to Tracking table (nullable)
3. No data migration needed (backward compatible)

## Best Practices

### Container Numbering

Use a consistent format:

- `CONT-YYYY-XXX` (e.g., CONT-2025-001)
- Or your company's existing format

### Workflow Recommendations

1. Create container first
2. Set container to "preparing" status
3. Add/assign tracking numbers
4. Update status to "loading" when ready
5. Set departure date before "in_transit"
6. Update to "arrived_port" when container arrives
7. Mark "completed" when all packages delivered

### Using Mark ID Statistics

- Before finalizing container, review mark ID stats
- Ensure each customer's packages are properly tracked
- Use stats to generate customer invoices
- Verify total CBM against container capacity

## Frontend Persistence

Container tab state is persisted:

- localStorage key: `adminShippingSubMenu`
- URL parameter: `?shippingSubMenu=containers`
- Survives page refresh

## Security

All container endpoints require admin authentication:

- User must have `is_staff`, `is_superuser`, or `role='admin'`
- 403 Forbidden returned for non-admin users
- Token validation via API wrapper

## Testing

### Manual Test Steps:

1. Create a test container
2. Add 3-5 tracking numbers with different mark IDs
3. Assign 2-3 to the container
4. View container details
5. Verify statistics show correct counts
6. Search for mark ID in stats table
7. Update container status
8. Delete a tracking, verify container stats update

### API Testing:

```bash
# List containers
curl -X GET http://localhost:8000/api/admin/containers \
  -H "Authorization: Bearer <admin-token>"

# Create container
curl -X POST http://localhost:8000/api/admin/containers \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "container_number": "CONT-2025-001",
    "status": "preparing"
  }'

# Get container details
curl -X GET http://localhost:8000/api/admin/containers/1 \
  -H "Authorization: Bearer <admin-token>"
```

## Future Enhancements

Potential improvements:

1. Bulk assign trackings to container
2. Container capacity warnings
3. Export container manifests (PDF)
4. Container tracking history/timeline
5. Email notifications on status changes
6. Container templates for recurring routes
7. Integration with shipping carrier APIs
8. Barcode/QR code generation for containers

## Troubleshooting

### Issue: Container dropdown empty in tracking form

**Solution:** Ensure containers exist and API endpoint is accessible

### Issue: Statistics not updating

**Solution:** Stats are calculated on-demand, refresh container details view

### Issue: Can't delete container

**Solution:** Check if user has admin permissions

### Issue: Tracking not showing container info

**Solution:** Re-fetch trackings list, ensure container FK is in serializer

## Files Modified/Created

### Backend:

- `backend/buysellapi/models.py` - Added Container model
- `backend/buysellapi/serializers.py` - Added Container serializers
- `backend/buysellapi/views.py` - Added Container views
- `backend/bsbackend/urls.py` - Added Container routes
- `backend/buysellapi/migrations/0024_add_container_model.py` - Migration

### Frontend:

- `frontend/src/components/ContainerManagement.jsx` - NEW
- `frontend/src/pages/admin/AdminDashboard.jsx` - Updated
- `frontend/src/pages/admin/TrackingManagement.jsx` - Updated

## Summary

This implementation provides a complete container management system that:

- Groups tracking numbers into containers
- Tracks container journey from China to Ghana
- Provides statistics by mark ID for billing/reporting
- Integrates seamlessly with existing tracking system
- Maintains backward compatibility (containers are optional)
- Offers intuitive admin interface

The system is production-ready and follows Django/React best practices.
