"""
Auto-sync service to periodically match unassigned trackings to users.

This can be run as a scheduled task (cron/Task Scheduler) or called from views.
"""

import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from buysellapi.models import Tracking, ShippingMark

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Auto-sync: Match unassigned trackings to users based on shipping marks (runs silently)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--verbose",
            action="store_true",
            help="Show detailed output",
        )

    def handle(self, *args, **options):
        verbose = options.get("verbose", False)

        if verbose:
            self.stdout.write(f"[{timezone.now()}] Running auto-sync for trackings...")

        # Find all trackings with shipping_mark but no owner
        unassigned = Tracking.objects.filter(owner__isnull=True).exclude(
            shipping_mark=""
        )

        total_count = unassigned.count()

        if total_count == 0:
            if verbose:
                self.stdout.write(self.style.SUCCESS("No trackings need syncing."))
            logger.info("Auto-sync: No trackings to match")
            return

        matched_count = 0
        failed_count = 0
        results = []

        for tracking in unassigned:
            try:
                # Find the shipping mark owner
                shipping_mark = ShippingMark.objects.get(mark_id=tracking.shipping_mark)

                # Assign the owner
                tracking.owner = shipping_mark.owner
                tracking.save()

                matched_count += 1
                msg = f"Matched {tracking.tracking_number} → {shipping_mark.owner.username}"
                results.append(msg)

                if verbose:
                    self.stdout.write(self.style.SUCCESS(f"✓ {msg}"))

                logger.info(f"Auto-sync: {msg}")

            except ShippingMark.DoesNotExist:
                failed_count += 1
                msg = f"No user for mark '{tracking.shipping_mark}' (tracking: {tracking.tracking_number})"

                if verbose:
                    self.stdout.write(self.style.WARNING(f"⚠ {msg}"))

                logger.warning(f"Auto-sync: {msg}")

            except Exception as e:
                failed_count += 1
                msg = f"Error matching {tracking.tracking_number}: {str(e)}"

                if verbose:
                    self.stdout.write(self.style.ERROR(f"✗ {msg}"))

                logger.error(f"Auto-sync: {msg}")

        # Log summary
        summary = f"Auto-sync completed: {matched_count} matched, {failed_count} failed"
        logger.info(summary)

        if verbose:
            self.stdout.write(self.style.SUCCESS(f"\n{summary}"))
