"""
Email notification utilities for sending emails to users.
Integrates with Gmail SMTP and tracks all email notifications in the database.
"""

from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from django.utils import timezone
from django.template.loader import render_to_string
from buysellapi.models import EmailNotification, UserModel, Tracking
import logging

logger = logging.getLogger(__name__)


def send_notification_email(
    user, notification_type, subject, message, html_message=None, tracking=None, pdf_attachment=None, pdf_filename=None
):
    """
    Send an email notification and track it in the database.

    Args:
        user: UserModel instance
        notification_type: Type of notification (from EmailNotification.NOTIFICATION_TYPES)
        subject: Email subject
        message: Plain text message
        html_message: Optional HTML version of message
        tracking: Optional Tracking instance if related to a shipment
        pdf_attachment: Optional PDF file content (bytes) to attach
        pdf_filename: Optional filename for PDF attachment

    Returns:
        EmailNotification instance
    """
    # Create notification record
    notification = EmailNotification.objects.create(
        user=user,
        notification_type=notification_type,
        subject=subject,
        message=message,
        html_message=html_message,
        tracking=tracking,
        status="pending",
    )

    try:
        # Send email
        if html_message:
            # Send HTML email with text fallback
            email = EmailMultiAlternatives(
                subject=subject,
                body=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email],
            )
            email.attach_alternative(html_message, "text/html")
            
            # Attach PDF if provided
            if pdf_attachment and pdf_filename:
                email.attach(pdf_filename, pdf_attachment, 'application/pdf')
            
            email.send()
        else:
            # Send plain text email
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )

        # Mark as sent
        notification.status = "sent"
        notification.sent_at = timezone.now()
        notification.save()

        logger.info(f"Email sent successfully: {notification_type} to {user.email}")

    except Exception as e:
        # Mark as failed and log error
        notification.status = "failed"
        notification.error_message = str(e)
        notification.save()

        logger.error(
            f"Failed to send email {notification_type} to {user.email}: {str(e)}"
        )

    return notification


def send_tracking_status_update(tracking):
    """
    Send email when tracking status is updated.

    Args:
        tracking: Tracking instance
    """
    if not tracking.owner:
        return None

    user = tracking.owner
    status_label = dict(Tracking.STATUS_CHOICES).get(tracking.status, tracking.status)

    subject = f"Tracking Update: {tracking.tracking_number}"

    # Plain text version
    message = f"""
Hello {user.full_name},

Your shipment status has been updated.

Tracking Number: {tracking.tracking_number}
New Status: {status_label}
Shipping Mark: {tracking.shipping_mark}
"""

    if tracking.eta:
        message += f"Estimated Arrival: {tracking.eta.strftime('%B %d, %Y')}\n"

    message += f"""
You can track your shipment at: {settings.SITE_URL}/tracking

Thank you for using {settings.SITE_NAME}!

Best regards,
{settings.SITE_NAME} Team
"""

    # HTML version
    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #2563eb;">Tracking Update</h2>
            <p>Hello <strong>{user.full_name}</strong>,</p>
            <p>Your shipment status has been updated.</p>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Tracking Number:</strong> {tracking.tracking_number}</p>
                <p style="margin: 5px 0;"><strong>New Status:</strong> <span style="color: #2563eb;">{status_label}</span></p>
                <p style="margin: 5px 0;"><strong>Shipping Mark:</strong> {tracking.shipping_mark}</p>
                {f'<p style="margin: 5px 0;"><strong>Estimated Arrival:</strong> {tracking.eta.strftime("%B %d, %Y")}</p>' if tracking.eta else ''}
            </div>
            
            <p>
                <a href="{settings.SITE_URL}/tracking" 
                   style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">
                    Track Your Shipment
                </a>
            </p>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Thank you for using {settings.SITE_NAME}!<br>
                Best regards,<br>
                <strong>{settings.SITE_NAME} Team</strong>
            </p>
        </div>
    </body>
    </html>
    """

    return send_notification_email(
        user=user,
        notification_type="tracking_update",
        subject=subject,
        message=message,
        html_message=html_message,
        tracking=tracking,
    )


def send_welcome_email(user):
    """
    Send welcome email to new user.

    Args:
        user: UserModel instance
    """
    subject = f"Welcome to {settings.SITE_NAME}!"

    message = f"""
Hello {user.full_name},

Welcome to {settings.SITE_NAME}! We're excited to have you on board.

Your account has been successfully created. You can now:
- Track your shipments in real-time
- Generate shipping marks and addresses
- View invoices and order history
- Manage your profile

Get started at: {settings.SITE_URL}

If you have any questions, feel free to reach out to our support team.

Best regards,
{settings.SITE_NAME} Team
"""

    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #2563eb;">Welcome to {settings.SITE_NAME}!</h2>
            <p>Hello <strong>{user.full_name}</strong>,</p>
            <p>We're excited to have you on board!</p>
            
            <p>Your account has been successfully created. You can now:</p>
            <ul style="color: #555;">
                <li>Track your shipments in real-time</li>
                <li>Generate shipping marks and addresses</li>
                <li>View invoices and order history</li>
                <li>Manage your profile</li>
            </ul>
            
            <p>
                <a href="{settings.SITE_URL}" 
                   style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">
                    Get Started
                </a>
            </p>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                If you have any questions, feel free to reach out to our support team.<br><br>
                Best regards,<br>
                <strong>{settings.SITE_NAME} Team</strong>
            </p>
        </div>
    </body>
    </html>
    """

    return send_notification_email(
        user=user,
        notification_type="welcome",
        subject=subject,
        message=message,
        html_message=html_message,
    )


def send_shipping_mark_created_email(user, shipping_mark):
    """
    Send email when user's shipping mark is created.

    Args:
        user: UserModel instance
        shipping_mark: ShippingMark instance
    """
    subject = f"Your Shipping Mark Has Been Created - {shipping_mark.mark_id}"

    message = f"""
Hello {user.full_name},

Your permanent shipping mark has been created successfully!

Mark ID: {shipping_mark.mark_id}
Name: {shipping_mark.name}

You can view and copy your full shipping address from your profile at:
{settings.SITE_URL}/profile

Use this shipping mark for all your future shipments to ensure they are correctly identified as yours.

Best regards,
{settings.SITE_NAME} Team
"""

    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #2563eb;">🎉 Your Shipping Mark Has Been Created!</h2>
            <p>Hello <strong>{user.full_name}</strong>,</p>
            <p>Your permanent shipping mark has been created successfully!</p>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Mark ID:</strong> {shipping_mark.mark_id}</p>
                <p style="margin: 5px 0;"><strong>Name:</strong> {shipping_mark.name}</p>
            </div>
            
            <p style="background-color: #fef3c7; padding: 10px; border-left: 4px solid #f59e0b; border-radius: 4px;">
                ⚠️ <strong>Important:</strong> Use this shipping mark for all your future shipments to ensure they are correctly identified as yours.
            </p>
            
            <p>
                <a href="{settings.SITE_URL}/profile" 
                   style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">
                    View Full Address
                </a>
            </p>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Best regards,<br>
                <strong>{settings.SITE_NAME} Team</strong>
            </p>
        </div>
    </body>
    </html>
    """

    return send_notification_email(
        user=user,
        notification_type="shipping_mark_created",
        subject=subject,
        message=message,
        html_message=html_message,
    )


def send_admin_announcement(user, announcement_subject, announcement_message):
    """
    Send custom announcement email from admin to user.

    Args:
        user: UserModel instance
        announcement_subject: Email subject
        announcement_message: Email body
    """
    subject = announcement_subject

    message = f"""
Hello {user.full_name},

{announcement_message}

Best regards,
{settings.SITE_NAME} Team
"""

    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #2563eb;">📢 Announcement</h2>
            <p>Hello <strong>{user.full_name}</strong>,</p>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                {announcement_message.replace(chr(10), '<br>')}
            </div>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Best regards,<br>
                <strong>{settings.SITE_NAME} Team</strong>
            </p>
        </div>
    </body>
    </html>
    """

    return send_notification_email(
        user=user,
        notification_type="admin_announcement",
        subject=subject,
        message=message,
        html_message=html_message,
    )


def send_login_otp_email(user: UserModel, otp_code: str):
    """Send a One-Time Password to the user's email for login."""
    subject = f"Your {settings.SITE_NAME} Login Code"
    message = f"""
Hello {user.full_name},

Use the following one-time code to log in to your account:

Code: {otp_code}
This code will expire in 5 minutes.

If you did not request this code, you can safely ignore this email.

Best regards,
{settings.SITE_NAME} Team
"""

    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #2563eb;">Your Login Code</h2>
            <p>Hello <strong>{user.full_name}</strong>,</p>
            <p>Use the following one-time code to log in to your account. This code expires in <strong>5 minutes</strong>.</p>

            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; text-align: center; font-size: 22px; letter-spacing: 4px; font-weight: bold;">
                {otp_code}
            </div>

            <p style="margin-top: 20px; color: #666; font-size: 14px;">
                If you did not request this code, you can safely ignore this email.
            </p>

            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Best regards,<br>
                <strong>{settings.SITE_NAME} Team</strong>
            </p>
        </div>
    </body>
    </html>
    """

    return send_notification_email(
        user=user,
        notification_type="otp_login",
        subject=subject,
        message=message,
        html_message=html_message,
    )


def send_password_reset_otp_email(user: UserModel, otp_code: str):
    """Send a one-time code for password reset."""
    subject = f"{settings.SITE_NAME} Password Reset Code"
    message = f"""
Hello {user.full_name},

Use the following one-time code to reset your password:

Code: {otp_code}
This code will expire in 10 minutes.

If you did not request this, you can safely ignore this email.

Best regards,
{settings.SITE_NAME} Team
"""

    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #ef4444;">Password Reset Code</h2>
            <p>Hello <strong>{user.full_name}</strong>,</p>
            <p>Use the following one-time code to reset your password. This code expires in <strong>10 minutes</strong>.</p>

            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; text-align: center; font-size: 22px; letter-spacing: 4px; font-weight: bold;">
                {otp_code}
            </div>

            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                If you did not request this, you can safely ignore this email.
            </p>
        </div>
    </body>
    </html>
    """

    return send_notification_email(
        user=user,
        notification_type="password_reset",
        subject=subject,
        message=message,
        html_message=html_message,
    )


def notify_admin_new_user_signup(new_user):
    """
    Notify all admin users when a new user signs up.

    Args:
        new_user: UserModel instance of the newly registered user
    """
    # Get all admin users
    admin_users = UserModel.objects.filter(role="admin")

    if not admin_users.exists():
        logger.warning("No admin users found to notify about new signup")
        return []

    subject = f"🆕 New User Registration: {new_user.full_name}"

    notifications = []
    for admin in admin_users:
        message = f"""
Hello Admin,

A new user has registered on {settings.SITE_NAME}:

User Details:
- Name: {new_user.full_name}
- Email: {new_user.email}
- Contact: {new_user.contact or 'N/A'}
- Username: {new_user.username}
- Registered: {new_user.date_joined.strftime('%B %d, %Y at %I:%M %p') if hasattr(new_user, 'date_joined') else 'Just now'}

You can manage this user from the admin panel.

Best regards,
{settings.SITE_NAME} System
"""

        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #16a34a;">🆕 New User Registration</h2>
                <p>Hello <strong>Admin</strong>,</p>
                
                <p>A new user has registered on <strong>{settings.SITE_NAME}</strong>:</p>
                
                <div style="background-color: #f0fdf4; padding: 20px; border-left: 4px solid #16a34a; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #16a34a;">User Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; width: 120px;">Name:</td>
                            <td style="padding: 8px 0;">{new_user.full_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Email:</td>
                            <td style="padding: 8px 0;">{new_user.email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Contact:</td>
                            <td style="padding: 8px 0;">{new_user.contact or 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Username:</td>
                            <td style="padding: 8px 0;">{new_user.username}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Registered:</td>
                            <td style="padding: 8px 0;">{new_user.date_joined.strftime('%B %d, %Y at %I:%M %p') if hasattr(new_user, 'date_joined') else 'Just now'}</td>
                        </tr>
                    </table>
                </div>
                
                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    You can manage this user from the admin panel.<br><br>
                    Best regards,<br>
                    <strong>{settings.SITE_NAME} System</strong>
                </p>
            </div>
        </body>
        </html>
        """

        try:
            notification = send_notification_email(
                user=admin,
                notification_type="admin_notification",
                subject=subject,
                message=message,
                html_message=html_message,
            )
            notifications.append(notification)
        except Exception as e:
            logger.error(
                f"Failed to notify admin {admin.email} about new user: {str(e)}"
            )

    return notifications


def notify_admin_new_shipment(tracking):
    """
    Notify all admin users when a user adds a new shipment/tracking.

    Args:
        tracking: Tracking instance
    """
    # Get all admin users
    admin_users = UserModel.objects.filter(role="admin")

    if not admin_users.exists():
        logger.warning("No admin users found to notify about new shipment")
        return []

    user = tracking.owner
    if not user:
        return []

    subject = f"📦 New Shipment Added: {tracking.tracking_number}"
    status_label = dict(Tracking.STATUS_CHOICES).get(tracking.status, tracking.status)

    notifications = []
    for admin in admin_users:
        message = f"""
Hello Admin,

User {user.full_name} has added a new shipment:

Shipment Details:
- Tracking Number: {tracking.tracking_number}
- User: {user.full_name} ({user.email})
- Status: {status_label}
- Shipping Mark: {tracking.shipping_mark or 'Not assigned'}
- CBM: {tracking.cbm or 'N/A'}
- ETA: {tracking.eta.strftime('%B %d, %Y') if tracking.eta else 'Not set'}
- Added: {tracking.created_at.strftime('%B %d, %Y at %I:%M %p') if hasattr(tracking, 'created_at') else 'Just now'}

You can manage this shipment from the admin panel.

Best regards,
{settings.SITE_NAME} System
"""

        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #2563eb;">📦 New Shipment Added</h2>
                <p>Hello <strong>Admin</strong>,</p>
                
                <p>User <strong>{user.full_name}</strong> has added a new shipment:</p>
                
                <div style="background-color: #eff6ff; padding: 20px; border-left: 4px solid #2563eb; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #2563eb;">Shipment Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; width: 150px;">Tracking Number:</td>
                            <td style="padding: 8px 0; font-family: monospace; background-color: #dbeafe; padding: 4px 8px; border-radius: 3px;">{tracking.tracking_number}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">User:</td>
                            <td style="padding: 8px 0;">{user.full_name} ({user.email})</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Contact:</td>
                            <td style="padding: 8px 0;">{user.contact or 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                            <td style="padding: 8px 0;"><span style="background-color: #fef3c7; padding: 2px 8px; border-radius: 3px; color: #92400e;">{status_label}</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Shipping Mark:</td>
                            <td style="padding: 8px 0;">{tracking.shipping_mark or 'Not assigned'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">CBM:</td>
                            <td style="padding: 8px 0;">{tracking.cbm or 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">ETA:</td>
                            <td style="padding: 8px 0;">{tracking.eta.strftime('%B %d, %Y') if tracking.eta else 'Not set'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Added:</td>
                            <td style="padding: 8px 0;">{tracking.created_at.strftime('%B %d, %Y at %I:%M %p') if hasattr(tracking, 'created_at') else 'Just now'}</td>
                        </tr>
                    </table>
                </div>
                
                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    You can manage this shipment from the admin panel.<br><br>
                    Best regards,<br>
                    <strong>{settings.SITE_NAME} System</strong>
                </p>
            </div>
        </body>
        </html>
        """

        try:
            notification = send_notification_email(
                user=admin,
                notification_type="admin_notification",
                subject=subject,
                message=message,
                html_message=html_message,
                tracking=tracking,
            )
            notifications.append(notification)
        except Exception as e:
            logger.error(
                f"Failed to notify admin {admin.email} about new shipment: {str(e)}"
            )

    return notifications


def send_order_confirmation_email(order):
    """
    Send order confirmation email to the customer who placed the order.

    Args:
        order: Order instance
    """
    if not order.user:
        logger.warning(f"Order {order.id} has no associated user, skipping email")
        return None

    user = order.user
    subject = f"Order Confirmation - Order #{order.id}"

    # Build items list
    items_text = ""
    items_html = ""
    for item in order.items:
        items_text += f"- {item.get('name', 'Item')} (Qty: {item.get('quantity', 0)}) - ₵{item.get('price', 0)}\n"
        items_html += f"""
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                    <img src="{item.get('image', '/placeholder-image.png')}" 
                         alt="{item.get('name', 'Item')}" 
                         style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                    <strong>{item.get('name', 'Item')}</strong>
                    {f'<br><span style="color: #6b7280; font-size: 12px;">Size: {item.get("size", "N/A")}</span>' if item.get('size') and item.get('size') != 'default' else ''}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">{item.get('quantity', 0)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₵{float(item.get('price', 0)):.2f}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">
                    ₵{(item.get('quantity', 0) * float(item.get('price', 0))):.2f}
                </td>
            </tr>
        """

    # Plain text version
    message = f"""
Hello {order.customer_name},

Thank you for your order! We've received your order and it's being processed.

Order Details:
Order Number: #{order.id}
Order Date: {order.created_at.strftime('%B %d, %Y at %I:%M %p')}
Status: {order.status.title()}
Payment Status: {order.payment_status.title()}

Order Items:
{items_text}

Order Summary:
Subtotal: ₵{float(order.subtotal):.2f}
Shipping: ₵{float(order.shipping_cost):.2f}
Tax: ₵{float(order.tax):.2f}
Total: ₵{float(order.total):.2f}

Shipping Address:
{order.shipping_address}
{order.shipping_city}, {order.shipping_state} {order.shipping_zip_code}
{order.shipping_country}

You can track your order status at: {settings.SITE_URL}/Orders

If you have any questions, please don't hesitate to contact us.

Best regards,
{settings.SITE_NAME} Team
"""

    # HTML version
    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
            <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">Order Confirmation</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Order #{order.id}</p>
            </div>
            
            <div style="padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-top: none;">
                <p>Hello <strong>{order.customer_name}</strong>,</p>
                <p>Thank you for your order! We've received your order and it's being processed.</p>
                
                <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Order Date:</strong> {order.created_at.strftime('%B %d, %Y at %I:%M %p')}</p>
                    <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #2563eb;">{order.status.title()}</span></p>
                    <p style="margin: 5px 0;"><strong>Payment Status:</strong> <span style="color: {'#16a34a' if order.payment_status == 'paid' else '#f59e0b'}">{order.payment_status.title()}</span></p>
                </div>
                
                <h3 style="color: #2563eb; margin-top: 30px;">Order Items</h3>
                <table style="width: 100%; border-collapse: collapse; background-color: white; border-radius: 5px; overflow: hidden;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Image</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Product</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                    </tbody>
                </table>
                
                <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="color: #2563eb; margin-top: 0;">Order Summary</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0;">Subtotal:</td>
                            <td style="padding: 8px 0; text-align: right;">₵{float(order.subtotal):.2f}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;">Shipping:</td>
                            <td style="padding: 8px 0; text-align: right;">₵{float(order.shipping_cost):.2f}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;">Tax:</td>
                            <td style="padding: 8px 0; text-align: right;">₵{float(order.tax):.2f}</td>
                        </tr>
                        <tr style="border-top: 2px solid #e5e7eb; font-weight: bold; font-size: 18px;">
                            <td style="padding: 12px 0;">Total:</td>
                            <td style="padding: 12px 0; text-align: right; color: #2563eb;">₵{float(order.total):.2f}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="color: #2563eb; margin-top: 0;">Shipping Address</h3>
                    <p style="margin: 5px 0;">{order.shipping_address}</p>
                    <p style="margin: 5px 0;">{order.shipping_city}, {order.shipping_state} {order.shipping_zip_code}</p>
                    <p style="margin: 5px 0;">{order.shipping_country}</p>
                </div>
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{settings.SITE_URL}/Orders" 
                       style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Track Your Order
                    </a>
                </p>
                
                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    If you have any questions, please don't hesitate to contact us.<br><br>
                    Best regards,<br>
                    <strong>{settings.SITE_NAME} Team</strong>
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_notification_email(
        user=user,
        notification_type="order_confirmation",
        subject=subject,
        message=message,
        html_message=html_message,
    )


def notify_admin_new_order(order):
    """
    Notify all admin users when a new order is placed.

    Args:
        order: Order instance
    """
    # Get all admin users
    admin_users = UserModel.objects.filter(role="admin")

    if not admin_users.exists():
        logger.warning("No admin users found to notify about new order")
        return []

    user = order.user
    subject = f"🛒 New Order Placed - Order #{order.id}"

    # Build items list
    items_text = ""
    items_html = ""
    for item in order.items:
        items_text += f"- {item.get('name', 'Item')} (Qty: {item.get('quantity', 0)}) - ₵{item.get('price', 0)}\n"
        items_html += f"""
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{item.get('name', 'Item')}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">{item.get('quantity', 0)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">₵{float(item.get('price', 0)):.2f}</td>
            </tr>
        """

    notifications = []
    for admin in admin_users:
        message = f"""
Hello Admin,

A new order has been placed on {settings.SITE_NAME}:

Order Details:
- Order Number: #{order.id}
- Customer: {order.customer_name} ({order.customer_email})
- Phone: {order.customer_phone or 'N/A'}
- User: {user.full_name if user else 'N/A'} ({user.email if user else 'N/A'})
- Order Date: {order.created_at.strftime('%B %d, %Y at %I:%M %p')}
- Status: {order.status.title()}
- Payment Status: {order.payment_status.title()}
- Payment Method: {order.payment_method or 'N/A'}

Order Items:
{items_text}

Order Summary:
- Subtotal: ₵{float(order.subtotal):.2f}
- Shipping: ₵{float(order.shipping_cost):.2f}
- Tax: ₵{float(order.tax):.2f}
- Total: ₵{float(order.total):.2f}

Shipping Address:
{order.shipping_address}
{order.shipping_city}, {order.shipping_state} {order.shipping_zip_code}
{order.shipping_country}

You can manage this order from the admin panel.

Best regards,
{settings.SITE_NAME} System
"""

        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #16a34a;">🛒 New Order Placed</h2>
                <p>Hello <strong>Admin</strong>,</p>
                
                <p>A new order has been placed on <strong>{settings.SITE_NAME}</strong>:</p>
                
                <div style="background-color: #f0fdf4; padding: 20px; border-left: 4px solid #16a34a; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #16a34a;">Order Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; width: 150px;">Order Number:</td>
                            <td style="padding: 8px 0; font-family: monospace; background-color: #d1fae5; padding: 4px 8px; border-radius: 3px;">#{order.id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Customer:</td>
                            <td style="padding: 8px 0;">{order.customer_name} ({order.customer_email})</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
                            <td style="padding: 8px 0;">{order.customer_phone or 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">User Account:</td>
                            <td style="padding: 8px 0;">{user.full_name if user else 'N/A'} ({user.email if user else 'N/A'})</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Order Date:</td>
                            <td style="padding: 8px 0;">{order.created_at.strftime('%B %d, %Y at %I:%M %p')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                            <td style="padding: 8px 0;"><span style="background-color: #fef3c7; padding: 2px 8px; border-radius: 3px; color: #92400e;">{order.status.title()}</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Payment Status:</td>
                            <td style="padding: 8px 0;"><span style="background-color: {'#d1fae5' if order.payment_status == 'paid' else '#fef3c7'}; padding: 2px 8px; border-radius: 3px; color: {'#166534' if order.payment_status == 'paid' else '#92400e'};">{order.payment_status.title()}</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Payment Method:</td>
                            <td style="padding: 8px 0;">{order.payment_method or 'N/A'}</td>
                        </tr>
                    </table>
                </div>
                
                <h3 style="color: #2563eb; margin-top: 30px;">Order Items</h3>
                <table style="width: 100%; border-collapse: collapse; background-color: white; border-radius: 5px; overflow: hidden;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Product</th>
                            <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">Quantity</th>
                            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                    </tbody>
                </table>
                
                <div style="background-color: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="color: #2563eb; margin-top: 0;">Order Summary</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0;">Subtotal:</td>
                            <td style="padding: 8px 0; text-align: right;">₵{float(order.subtotal):.2f}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;">Shipping:</td>
                            <td style="padding: 8px 0; text-align: right;">₵{float(order.shipping_cost):.2f}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;">Tax:</td>
                            <td style="padding: 8px 0; text-align: right;">₵{float(order.tax):.2f}</td>
                        </tr>
                        <tr style="border-top: 2px solid #2563eb; font-weight: bold;">
                            <td style="padding: 12px 0;">Total:</td>
                            <td style="padding: 12px 0; text-align: right; color: #2563eb; font-size: 18px;">₵{float(order.total):.2f}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="color: #2563eb; margin-top: 0;">Shipping Address</h3>
                    <p style="margin: 5px 0;">{order.shipping_address}</p>
                    <p style="margin: 5px 0;">{order.shipping_city}, {order.shipping_state} {order.shipping_zip_code}</p>
                    <p style="margin: 5px 0;">{order.shipping_country}</p>
                </div>
                
                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    You can manage this order from the admin panel.<br><br>
                    Best regards,<br>
                    <strong>{settings.SITE_NAME} System</strong>
                </p>
            </div>
        </body>
        </html>
        """

        try:
            notification = send_notification_email(
                user=admin,
                notification_type="admin_notification",
                subject=subject,
                message=message,
                html_message=html_message,
            )
            notifications.append(notification)
        except Exception as e:
            logger.error(
                f"Failed to notify admin {admin.email} about new order: {str(e)}"
            )

    return notifications


def send_buy4me_order_confirmation_email(buy4me_request):
    """
    Send order confirmation email to the customer who placed a Buy4Me order.

    Args:
        buy4me_request: Buy4meRequest instance
    """
    if not buy4me_request.user:
        logger.warning(f"Buy4Me Request {buy4me_request.id} has no associated user, skipping email")
        return None

    user = buy4me_request.user
    subject = f"Buy4Me Order Confirmation - Request #{buy4me_request.id}"

    # Build links list
    links_text = ""
    links_html = ""
    
    # Main product link
    if buy4me_request.product_url:
        links_text += f"- Main Product: {buy4me_request.product_url}\n"
        links_html += f"""
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                    <a href="{buy4me_request.product_url}" target="_blank" style="color: #2563eb; text-decoration: none;">
                        Main Product Link
                    </a>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">{buy4me_request.quantity}</td>
            </tr>
        """
    
    # Additional links
    if buy4me_request.additional_links:
        for link in buy4me_request.additional_links:
            link_url = link.get('url') if isinstance(link, dict) else link
            link_qty = link.get('quantity', 1) if isinstance(link, dict) else 1
            links_text += f"- Additional Link: {link_url} (Qty: {link_qty})\n"
            links_html += f"""
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                        <a href="{link_url}" target="_blank" style="color: #2563eb; text-decoration: none;">
                            Additional Product Link
                        </a>
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">{link_qty}</td>
                </tr>
            """

    # Plain text version
    message = f"""
Hello {user.full_name or user.username},

Thank you for your Buy4Me order! We've received your request and it's being processed.

Order Details:
Request Number: #{buy4me_request.id}
Order Date: {buy4me_request.created_at.strftime('%B %d, %Y at %I:%M %p')}
Status: {buy4me_request.status.title()}

Product Information:
Title: {buy4me_request.title}
Description: {buy4me_request.description or 'N/A'}
Total Quantity: {buy4me_request.quantity}

Product Links:
{links_text}

You can track your order status at: {settings.SITE_URL}/profile?tab=buy4me

If you have any questions, please don't hesitate to contact us.

Best regards,
{settings.SITE_NAME} Team
"""

    # HTML version
    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
            <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">Buy4Me Order Confirmation</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Request #{buy4me_request.id}</p>
            </div>
            
            <div style="padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-top: none;">
                <p>Hello <strong>{user.full_name or user.username}</strong>,</p>
                <p>Thank you for your Buy4Me order! We've received your request and it's being processed.</p>
                
                <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Order Date:</strong> {buy4me_request.created_at.strftime('%B %d, %Y at %I:%M %p')}</p>
                    <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #2563eb;">{buy4me_request.status.title()}</span></p>
                </div>
                
                <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #2563eb;">Product Information</h3>
                    <p style="margin: 5px 0;"><strong>Title:</strong> {buy4me_request.title}</p>
                    <p style="margin: 5px 0;"><strong>Description:</strong> {buy4me_request.description or 'N/A'}</p>
                    <p style="margin: 5px 0;"><strong>Total Quantity:</strong> {buy4me_request.quantity}</p>
                </div>
                
                <h3 style="color: #2563eb; margin-top: 30px;">Product Links</h3>
                <table style="width: 100%; border-collapse: collapse; background-color: white; border-radius: 5px; overflow: hidden;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Product Link</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e5e7eb;">Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        {links_html if links_html else '<tr><td colspan="2" style="padding: 10px; text-align: center; color: #6b7280;">No links provided</td></tr>'}
                    </tbody>
                </table>
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{settings.SITE_URL}/profile?tab=buy4me" 
                       style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Track Your Order
                    </a>
                </p>
                
                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    If you have any questions, please don't hesitate to contact us.<br><br>
                    Best regards,<br>
                    <strong>{settings.SITE_NAME} Team</strong>
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_notification_email(
        user=user,
        notification_type="buy4me_order_confirmation",
        subject=subject,
        message=message,
        html_message=html_message,
    )


def notify_admin_new_buy4me_order(buy4me_request):
    """
    Notify all admin users when a new Buy4Me order is placed.

    Args:
        buy4me_request: Buy4meRequest instance
    """
    # Get all admin users
    admin_users = UserModel.objects.filter(role="admin")

    if not admin_users.exists():
        logger.warning("No admin users found to notify about new Buy4Me order")
        return []

    user = buy4me_request.user
    subject = f"🛒 New Buy4Me Order Placed - Request #{buy4me_request.id}"

    # Build links list
    links_text = ""
    links_html = ""
    
    # Main product link
    if buy4me_request.product_url:
        links_text += f"- Main Product: {buy4me_request.product_url} (Qty: {buy4me_request.quantity})\n"
        links_html += f"""
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
                    <a href="{buy4me_request.product_url}" target="_blank" style="color: #2563eb; text-decoration: none;">
                        Main Product Link
                    </a>
                </td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">{buy4me_request.quantity}</td>
            </tr>
        """
    
    # Additional links
    if buy4me_request.additional_links:
        for link in buy4me_request.additional_links:
            link_url = link.get('url') if isinstance(link, dict) else link
            link_qty = link.get('quantity', 1) if isinstance(link, dict) else 1
            links_text += f"- Additional Link: {link_url} (Qty: {link_qty})\n"
            links_html += f"""
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
                        <a href="{link_url}" target="_blank" style="color: #2563eb; text-decoration: none;">
                            Additional Product Link
                        </a>
                    </td>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">{link_qty}</td>
                </tr>
            """

    notifications = []
    for admin in admin_users:
        message = f"""
Hello Admin,

A new Buy4Me order has been placed on {settings.SITE_NAME}:

Order Details:
- Request Number: #{buy4me_request.id}
- Customer: {user.full_name or user.username} ({user.email})
- Phone: {user.contact or 'N/A'}
- Order Date: {buy4me_request.created_at.strftime('%B %d, %Y at %I:%M %p')}
- Status: {buy4me_request.status.title()}

Product Information:
- Title: {buy4me_request.title}
- Description: {buy4me_request.description or 'N/A'}
- Total Quantity: {buy4me_request.quantity}

Product Links:
{links_text if links_text else 'No links provided'}

You can manage this order from the admin panel.

Best regards,
{settings.SITE_NAME} System
"""

        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #16a34a;">🛒 New Buy4Me Order Placed</h2>
                <p>Hello <strong>Admin</strong>,</p>
                
                <p>A new Buy4Me order has been placed on <strong>{settings.SITE_NAME}</strong>:</p>
                
                <div style="background-color: #f0fdf4; padding: 20px; border-left: 4px solid #16a34a; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #16a34a;">Order Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; width: 150px;">Request Number:</td>
                            <td style="padding: 8px 0; font-family: monospace; background-color: #d1fae5; padding: 4px 8px; border-radius: 3px;">#{buy4me_request.id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Customer:</td>
                            <td style="padding: 8px 0;">{user.full_name or user.username} ({user.email})</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
                            <td style="padding: 8px 0;">{user.contact or 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Order Date:</td>
                            <td style="padding: 8px 0;">{buy4me_request.created_at.strftime('%B %d, %Y at %I:%M %p')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                            <td style="padding: 8px 0;"><span style="background-color: #fef3c7; padding: 2px 8px; border-radius: 3px; color: #92400e;">{buy4me_request.status.title()}</span></td>
                        </tr>
                    </table>
                </div>
                
                <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #2563eb;">Product Information</h3>
                    <p style="margin: 5px 0;"><strong>Title:</strong> {buy4me_request.title}</p>
                    <p style="margin: 5px 0;"><strong>Description:</strong> {buy4me_request.description or 'N/A'}</p>
                    <p style="margin: 5px 0;"><strong>Total Quantity:</strong> {buy4me_request.quantity}</p>
                </div>
                
                <h3 style="color: #2563eb; margin-top: 30px;">Product Links</h3>
                <table style="width: 100%; border-collapse: collapse; background-color: white; border-radius: 5px; overflow: hidden;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Product Link</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e5e7eb;">Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        {links_html if links_html else '<tr><td colspan="2" style="padding: 10px; text-align: center; color: #6b7280;">No links provided</td></tr>'}
                    </tbody>
                </table>
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{settings.SITE_URL}/admin/buy4me" 
                       style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Manage Order
                    </a>
                </p>
                
                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    Best regards,<br>
                    <strong>{settings.SITE_NAME} System</strong>
                </p>
            </div>
        </body>
        </html>
        """

        try:
            notification = send_notification_email(
                user=admin,
                notification_type="buy4me_order_placed",
                subject=subject,
                message=message,
                html_message=html_message,
            )
            if notification:
                notifications.append(notification)
        except Exception as e:
            logger.error(
                f"Failed to notify admin {admin.email} about new Buy4Me order: {str(e)}"
            )

    return notifications