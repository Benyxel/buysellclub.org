"""
Management command to test email sending functionality.

Usage:
    python manage.py test_email user@example.com
    python manage.py test_email user@example.com --type=welcome
    python manage.py test_email user@example.com --type=tracking --tracking-id=1
"""

from django.core.management.base import BaseCommand, CommandError
from buysellapi.models import UserModel, Tracking
from buysellapi.email_utils import (
    send_welcome_email,
    send_tracking_status_update,
    send_admin_announcement,
)


class Command(BaseCommand):
    help = "Test email sending functionality"

    def add_arguments(self, parser):
        parser.add_argument(
            "email",
            type=str,
            help="Email address to send test email to",
        )
        parser.add_argument(
            "--type",
            type=str,
            default="test",
            choices=["welcome", "tracking", "announcement", "test"],
            help="Type of test email to send",
        )
        parser.add_argument(
            "--tracking-id",
            type=int,
            help="Tracking ID for tracking update email",
        )

    def handle(self, *args, **options):
        email = options["email"]
        email_type = options["type"]

        # Get or create test user
        try:
            user = UserModel.objects.get(email=email)
            self.stdout.write(f"Found existing user: {user.username}")
        except UserModel.DoesNotExist:
            self.stdout.write(
                self.style.WARNING(
                    f"User with email {email} not found. Using first available user."
                )
            )
            user = UserModel.objects.filter(role="customer").first()
            if not user:
                raise CommandError("No users found in database. Create a user first.")
            self.stdout.write(f"Using user: {user.username} ({user.email})")

        try:
            if email_type == "welcome":
                self.stdout.write("Sending welcome email...")
                send_welcome_email(user)
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Welcome email sent to {user.email}")
                )

            elif email_type == "tracking":
                tracking_id = options.get("tracking_id")
                if tracking_id:
                    tracking = Tracking.objects.get(id=tracking_id)
                else:
                    tracking = Tracking.objects.filter(owner=user).first()
                    if not tracking:
                        raise CommandError(
                            "No tracking found for user. Specify --tracking-id or create a tracking first."
                        )

                self.stdout.write(
                    f"Sending tracking update for: {tracking.tracking_number}"
                )
                send_tracking_status_update(tracking)
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Tracking update email sent to {user.email}")
                )

            elif email_type == "announcement":
                self.stdout.write("Sending test announcement...")
                send_admin_announcement(
                    user,
                    announcement_subject="Test Announcement from Admin",
                    announcement_message="This is a test announcement to verify email functionality is working correctly. If you're reading this, the email system is working!",
                )
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Announcement email sent to {user.email}")
                )

            else:  # test
                self.stdout.write("Sending test email using announcement function...")
                send_admin_announcement(
                    user,
                    announcement_subject="Test Email - Please Ignore",
                    announcement_message="This is a test email to verify your email configuration is working correctly.\n\nIf you received this email, your Gmail SMTP setup is successful!",
                )
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Test email sent to {user.email}")
                )

            self.stdout.write(
                "\nCheck your email inbox and the EmailNotification table."
            )
            self.stdout.write(
                "To view notifications: python manage.py shell, then run:"
            )
            self.stdout.write("  from buysellapi.models import EmailNotification")
            self.stdout.write(
                "  EmailNotification.objects.latest('created_at').__dict__"
            )

        except Tracking.DoesNotExist:
            raise CommandError(f"Tracking with ID {tracking_id} not found")
        except Exception as e:
            raise CommandError(f"Failed to send email: {str(e)}")
