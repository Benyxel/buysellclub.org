"""
Normalize owner and shipping_mark across duplicate Tracking rows that share the same
tracking_number. This is a one-off/backfill tool to clean historical inconsistencies.

Rules:
- Pick a canonical non-admin owner if any exists (prefer most recent by date_added).
- Canonical shipping_mark is the ShippingMark linked to the canonical owner, if present;
  otherwise the most common non-empty mark in the group; otherwise leave marks as-is.
- Update all rows in the group to use the canonical owner.
- Update shipping_mark to the canonical mark only if it is non-empty.
"""

from collections import Counter
from django.core.management.base import BaseCommand
from buysellapi.models import Tracking, ShippingMark


class Command(BaseCommand):
    help = "Normalize owner and shipping_mark across duplicate tracking_numbers"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would change without writing to the database",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Limit number of tracking_number groups to process (for testing)",
        )

    def handle(self, *args, **options):
        dry = options.get("dry_run", False)
        limit = options.get("limit")

        numbers_qs = Tracking.objects.values_list(
            "tracking_number", flat=True
        ).distinct()
        if limit:
            numbers_qs = numbers_qs[:limit]

        total = 0
        changed_groups = 0
        for tn in numbers_qs:
            total += 1
            qs = Tracking.objects.filter(tracking_number=tn).order_by("-date_added")
            if not qs.exists():
                continue

            # Determine canonical owner: most recent non-admin owner
            canonical_owner = None
            for t in qs:
                if t.owner and t.owner.role != "admin":
                    canonical_owner = t.owner
                    break

            # Determine canonical mark
            canonical_mark = ""
            if canonical_owner:
                try:
                    sm = ShippingMark.objects.get(owner=canonical_owner)
                    canonical_mark = sm.mark_id or ""
                except ShippingMark.DoesNotExist:
                    pass

            if not canonical_mark:
                marks = [m for m in qs.values_list("shipping_mark", flat=True) if m]
                if marks:
                    canonical_mark = Counter(marks).most_common(1)[0][0]

            updates = {}
            if canonical_owner:
                updates["owner_id"] = canonical_owner.id
            if canonical_mark:
                updates["shipping_mark"] = canonical_mark

            if updates:
                changed_groups += 1
                if dry:
                    self.stdout.write(
                        f"[DRY] {tn}: set "
                        + ", ".join(f"{k}={v}" for k, v in updates.items())
                    )
                else:
                    Tracking.objects.filter(tracking_number=tn).update(**updates)
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Normalized {tn}: "
                            + ", ".join(f"{k}={v}" for k, v in updates.items())
                        )
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f"Processed {total} tracking_number groups; normalized {changed_groups} groups"
            )
        )
