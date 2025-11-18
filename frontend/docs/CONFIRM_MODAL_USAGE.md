# Using ConfirmModal for Delete Operations

The `ConfirmModal` component is a reusable, styled confirmation dialog that should be used for all delete operations across both frontend and backend admin panels.

## Location

`frontend/src/components/shared/ConfirmModal.jsx`

## Features

- Beautiful, accessible modal with backdrop blur
- Three types: `danger` (red), `warning` (yellow), `info` (blue)
- Dark mode support
- Consistent styling across the application
- Proper keyboard and focus handling

## Usage Example

### 1. Import the component

```javascript
import ConfirmModal from "./shared/ConfirmModal";
// or from pages: import ConfirmModal from "../components/shared/ConfirmModal";
```

### 2. Add state for modal

```javascript
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [deleteTarget, setDeleteTarget] = useState(null);
```

### 3. Create delete handler and confirm function

```javascript
// When user clicks delete button
const handleDelete = (itemId) => {
  setDeleteTarget(itemId);
  setShowDeleteModal(true);
};

// Actual delete logic
const confirmDelete = async () => {
  try {
    await API.delete(`/api/endpoint/${deleteTarget}`);
    toast.success("Item deleted successfully");
    // Refresh data or update state
  } catch (error) {
    toast.error("Failed to delete item");
  } finally {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  }
};
```

### 4. Add the modal component to your JSX

```javascript
<ConfirmModal
  isOpen={showDeleteModal}
  onClose={() => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  }}
  onConfirm={confirmDelete}
  title="Delete Item"
  message="Are you sure you want to delete this item? This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  type="danger"
/>
```

## Props

| Prop          | Type     | Default                             | Description                                  |
| ------------- | -------- | ----------------------------------- | -------------------------------------------- |
| `isOpen`      | boolean  | -                                   | Controls modal visibility (required)         |
| `onClose`     | function | -                                   | Called when modal should close (required)    |
| `onConfirm`   | function | -                                   | Called when user confirms action (required)  |
| `title`       | string   | "Confirm Action"                    | Modal title                                  |
| `message`     | string   | "Are you sure you want to proceed?" | Confirmation message                         |
| `confirmText` | string   | "Confirm"                           | Text for confirm button                      |
| `cancelText`  | string   | "Cancel"                            | Text for cancel button                       |
| `type`        | string   | "danger"                            | Visual style: "danger", "warning", or "info" |

## Replace window.confirm

**DO NOT USE:**

```javascript
if (window.confirm("Are you sure?")) {
  // delete logic
}
```

**USE THIS INSTEAD:**

```javascript
// Show modal
setDeleteTarget(itemId);
setShowDeleteModal(true);
```

## Benefits

1. **Consistent UX**: All delete confirmations look and behave the same
2. **Better accessibility**: Proper modal with focus management
3. **Mobile-friendly**: Works well on all screen sizes
4. **Dark mode support**: Automatically adapts to dark theme
5. **Customizable**: Can change colors, text, and icons per use case
6. **Non-blocking**: Doesn't use browser's blocking confirm dialog

## Examples in Codebase

- **MyProfile.jsx**: Deleting tracking numbers
- **ShippingAddressesAdmin.jsx**: Deleting shipping addresses
- Add more locations as you migrate from `window.confirm`

## Migration Checklist

When updating old code:

1. ✅ Import ConfirmModal
2. ✅ Add modal state (showDeleteModal, deleteTarget)
3. ✅ Split delete handler into two functions (trigger + confirm)
4. ✅ Add ConfirmModal JSX
5. ✅ Remove window.confirm calls
6. ✅ Test delete flow
