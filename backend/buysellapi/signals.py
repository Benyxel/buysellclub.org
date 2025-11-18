from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import Q
from .models import Tracking, ShippingMark, UserModel
from .email_utils import (
    send_tracking_status_update,
    send_welcome_email,
    send_shipping_mark_created_email,
    notify_admin_new_user_signup,
    notify_admin_new_shipment,
)


# DISABLED: Signal-based sync replaced with explicit sync_duplicates() calls
# in views and admin to avoid conflicts and ensure reliable synchronization
# Old signal auto_update_shipping_mark has been removed and replaced with
# explicit sync_duplicates() method calls in views.py and admin.py


@receiver(post_save, sender=Tracking)
def send_tracking_notification(sender, instance, created, **kwargs):
    """
    Send email notification when:
    1. A new tracking is created (welcome notification)
    2. An existing tracking status changes (update notification)

    Skip notifications for admin users.
    Also notify admins when a user adds a new shipment.
    Note: For status change detection, we check if the tracking was just created.
    For updates, the signal is called when status changes via API.
    """
    # Skip if raw save (used in migrations)
    if kwargs.get("raw", False):
        return

    # Handle user notifications
    if instance.owner and instance.owner.role != "admin":
        try:
            if created:
                # New tracking created - send notification to user
                send_tracking_status_update(instance)

                # Notify all admins about the new shipment
                notify_admin_new_shipment(instance)
            else:
                # For existing tracking, we'll send notification on any save
                # (typically happens when admin updates status or other fields)
                # To avoid too many emails, consider adding a check or only trigger
                # on specific field changes if needed
                send_tracking_status_update(instance)
        except Exception as e:
            # Log error but don't break the save operation
            print(f"Failed to send tracking notification: {str(e)}")


# NOTE: propagate_owner_to_related_trackings and unify_owner_and_mark_across_duplicates
# have been CONSOLIDATED into auto_update_shipping_mark above for better reliability


@receiver(post_save, sender=UserModel)
def send_welcome_notification(sender, instance, created, **kwargs):
    """
    Send welcome email when a new user registers.
    Skip for admin users.
    Also notify admins about new user signup.
    """
    if created and instance.role != "admin":
        try:
            # Send welcome email to the new user
            send_welcome_email(instance)

            # Notify all admins about the new user
            notify_admin_new_user_signup(instance)
        except Exception as e:
            print(f"Failed to send welcome email: {str(e)}")


@receiver(post_save, sender=ShippingMark)
def send_shipping_mark_notification(sender, instance, created, **kwargs):
    """
    Send email when a shipping mark is created for a user.
    Skip for admin users.
    """
    if created and instance.owner and instance.owner.role != "admin":
        try:
            send_shipping_mark_created_email(instance.owner, instance)
        except Exception as e:
            print(f"Failed to send shipping mark notification: {str(e)}")
