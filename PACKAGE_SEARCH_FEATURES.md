# Individual Package Search Features

## Overview

Enhanced the container system with powerful search capabilities for finding individual packages within containers and across the entire tracking system.

## Features Added

### 1. Search Packages Within Container Details

**Location**: Container Details Modal

**How It Works**:

- When viewing a container's details, a search box appears above the tracking list
- Search filters packages in real-time as you type
- Shows filtered count: "X of Y packages"

**Search Capabilities**:

- Search by tracking number
- Search by mark ID (shipping mark)
- Case-insensitive search
- Instant filtering without page reload

**UI Features**:

- Search box with icon positioned in top-right
- "No packages found" message when search yields no results
- Hover effect on rows
- Search term is cleared when modal closes
- Responsive design

**Example Use Cases**:

1. Find specific tracking number: Type "ABC123" to see only that package
2. Find all packages for a mark: Type "M856-FIM001" to see all packages with that mark
3. Quick verification: Search for partial tracking numbers

---

### 2. Filter Tracking Numbers by Container

**Location**: Main Tracking Management Page

**How It Works**:

- Added "Container" filter dropdown next to "Status" filter
- Filter options:
  - **All Containers**: Show all tracking numbers (default)
  - **No Container**: Show only unassigned packages
  - **[Container Number]**: Show packages in specific container

**Search Enhancement**:

- Main search box now searches container numbers too
- Updated placeholder: "Search by tracking number, shipping mark, container, or ETA..."

**Table Enhancement**:

- Added "Container" column to tracking table
- Shows container number as blue badge
- Shows "-" for unassigned packages

**Example Use Cases**:

1. View unassigned packages: Select "No Container" to see which packages need assignment
2. View specific container contents: Select "CONT-2025-001" to see all its packages
3. Search across containers: Type container number in search to find all related packages
4. Combine filters: Filter by container AND status (e.g., all pending packages in a container)

---

## Usage Examples

### Scenario 1: Find a Specific Package in a Container

1. Go to Shipping → Containers
2. Click eye icon on container "CONT-2025-001"
3. In the tracking list, type "ABC123" in search box
4. Package is instantly highlighted in the filtered list

### Scenario 2: Find All Unassigned Packages

1. Go to Shipping → Tracking Numbers
2. Select "No Container" from container filter dropdown
3. View all packages that haven't been assigned to a container yet
4. Assign them to containers as needed

### Scenario 3: Verify Mark ID Packages in Container

1. Open container details
2. Search for mark ID "M856-FIM001"
3. See all packages with that mark
4. Compare with statistics table above to verify count

### Scenario 4: Search Container Across System

1. Go to Tracking Numbers
2. Type "CONT-2025-001" in main search box
3. See all packages linked to that container
4. Can also see other matching terms (tracking numbers, marks)

### Scenario 5: Filter by Container and Status

1. Go to Tracking Numbers
2. Select container from "Container" dropdown
3. Select status from "Status" dropdown
4. See only packages matching both criteria (e.g., pending packages in CONT-2025-001)

---

## Technical Implementation

### Frontend State

```javascript
// ContainerManagement.jsx
const [trackingSearchTerm, setTrackingSearchTerm] = useState("");

// TrackingManagement.jsx
const [filterContainer, setFilterContainer] = useState("all");
```

### Filtering Logic

**Container Details Search**:

```javascript
containerDetails.trackings.filter(
  (tracking) =>
    !trackingSearchTerm ||
    tracking.tracking_number
      .toLowerCase()
      .includes(trackingSearchTerm.toLowerCase()) ||
    (tracking.shipping_mark &&
      tracking.shipping_mark
        .toLowerCase()
        .includes(trackingSearchTerm.toLowerCase()))
);
```

**Main Tracking Filter**:

```javascript
// Container filter
if (filterContainer !== "all") {
  if (filterContainer === "none") {
    result = result.filter((item) => !item.Container);
  } else {
    result = result.filter(
      (item) => item.Container && item.Container.toString() === filterContainer
    );
  }
}

// Search includes container number
result = result.filter(
  (item) =>
    (item.TrackingNum && item.TrackingNum.toLowerCase().includes(term)) ||
    (item.ShippingMark && item.ShippingMark.toLowerCase().includes(term)) ||
    (item.ContainerNumber &&
      item.ContainerNumber.toLowerCase().includes(term)) ||
    (item.ETA && item.ETA.toLowerCase().includes(term))
);
```

### UI Components

**Search Box in Container Details**:

- Width: 16rem (w-64)
- Icon: FaSearch
- Positioned in flex layout with heading
- Text size: small (text-sm)
- Dark mode compatible

**Container Filter Dropdown**:

- Width: 14rem (w-56) on desktop
- Full width on mobile
- Consistent styling with status dropdown
- Populates from fetched containers list

**Container Badge in Table**:

- Blue background (bg-blue-100)
- Small text (text-xs)
- Padding: px-2 py-1
- Rounded corners
- Dark mode: dark:bg-blue-900

---

## Benefits

### For Admins:

1. **Quick Verification**: Instantly verify if specific packages are in a container
2. **Bulk Management**: Filter unassigned packages to bulk assign to containers
3. **Customer Service**: Quickly find customer packages by mark ID within container
4. **Auditing**: Search across all containers to find specific tracking numbers
5. **Container Analysis**: View only packages in specific container for review

### For Operations:

1. **Container Preparation**: Filter unassigned packages to prepare new container
2. **Loading Verification**: Search within container to verify all expected packages present
3. **Problem Resolution**: Quickly locate problematic packages across all containers
4. **Status Updates**: Filter by container and status to update groups of packages

### System Benefits:

1. **No Performance Impact**: Client-side filtering is instant
2. **Scalability**: Works efficiently even with hundreds of packages
3. **Flexibility**: Multiple filter combinations possible
4. **User-Friendly**: Familiar search patterns (instant filtering, clear UI)

---

## Future Enhancements

Potential additions:

1. **Multi-select containers**: Filter by multiple containers at once
2. **Advanced search**: Use operators (AND, OR, NOT)
3. **Save filters**: Save commonly used filter combinations
4. **Export filtered results**: Download CSV of search results
5. **Highlight search terms**: Highlight matching text in results
6. **Search history**: Remember recent searches
7. **Quick filters**: One-click filters for common scenarios

---

## Files Modified

### Frontend:

- `frontend/src/components/ContainerManagement.jsx`

  - Added `trackingSearchTerm` state
  - Added search input in tracking list
  - Added filtering logic for package search
  - Clear search on modal close

- `frontend/src/pages/admin/TrackingManagement.jsx`
  - Added `filterContainer` state
  - Added container filter dropdown
  - Added container filtering logic to useEffect
  - Updated search to include container numbers
  - Added Container column to table
  - Display container number as badge

---

## Summary

The system now provides comprehensive search and filtering capabilities:

✅ **Search packages within a specific container** (real-time, as you type)
✅ **Filter all tracking by container** (dropdown with all/none/specific)
✅ **Search across containers** (main search includes container numbers)
✅ **View unassigned packages** (filter by "No Container")
✅ **Combine multiple filters** (container + status + search)
✅ **Visual container indicators** (badge in table)

These features make it easy to find individual packages whether they're in a container or not, supporting efficient package management and customer service operations.
