"""
Management command to match unassigned trackings to users based on shipping marks.

This fixes trackings that have shipping_mark but no owner by finding the user
who owns that shipping mark and assigning them as the owner.
"""

from django.core.management.base import BaseCommand
from buysellapi.models import Tracking, ShippingMark


class Command(BaseCommand):
    help = "Match unassigned trackings to users based on their shipping marks"

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.WARNING("Starting to match unassigned trackings to users...")
        )

        # Find all trackings with shipping_mark but no owner
        unassigned = Tracking.objects.filter(owner__isnull=True).exclude(
            shipping_mark=""
        )

        total_count = unassigned.count()
        self.stdout.write(
            f"Found {total_count} unassigned trackings with shipping marks"
        )

        if total_count == 0:
            self.stdout.write(self.style.SUCCESS("No trackings need matching!"))
            return

        matched_count = 0
        failed_count = 0

        for tracking in unassigned:
            try:
                # Find the shipping mark owner
                shipping_mark = ShippingMark.objects.get(mark_id=tracking.shipping_mark)

                # Assign the owner
                tracking.owner = shipping_mark.owner
                tracking.save()

                matched_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ Matched {tracking.tracking_number} → {shipping_mark.owner.username} ({tracking.shipping_mark})"
                    )
                )
            except ShippingMark.DoesNotExist:
                failed_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"✗ No user found for mark '{tracking.shipping_mark}' (tracking: {tracking.tracking_number})"
                    )
                )
            except Exception as e:
                failed_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"✗ Error matching {tracking.tracking_number}: {str(e)}"
                    )
                )

        # Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(
            self.style.SUCCESS(f"✓ Successfully matched: {matched_count}")
        )
        if failed_count > 0:
            self.stdout.write(self.style.ERROR(f"✗ Failed to match: {failed_count}"))
        self.stdout.write("=" * 60)
