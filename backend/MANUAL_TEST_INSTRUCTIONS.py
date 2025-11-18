"""
Quick manual test instructions for tracking sync.

Since we don't know your actual passwords, here's how to test manually:
"""

print("=" * 80)
print("MANUAL TEST INSTRUCTIONS FOR TRACKING SYNC")
print("=" * 80)

print(
    """
SCENARIO 1: User adds first, admin adds later
----------------------------------------------
1. Log into your frontend as a REGULAR USER (one with a shipping mark)
2. Add a new tracking number, e.g., "MANUAL_TEST_001"
3. Note the owner and shipping mark assigned
4. Log into Django admin (/admin/)
5. Add the SAME tracking number "MANUAL_TEST_001" as admin
6. Go back to buysellapi > Trackings
7. Filter by tracking_number = "MANUAL_TEST_001"
8. ✓ EXPECTED: BOTH records should show:
   - Same owner (the regular user)
   - Same shipping mark (user's mark)

SCENARIO 2: Admin adds first, user adds later
----------------------------------------------
1. Log into Django admin (/admin/)
2. Add a new tracking number, e.g., "MANUAL_TEST_002"
   - Leave owner blank or set to admin
   - Leave shipping_mark blank
3. Note that it has no owner/mark
4. Log into frontend as a REGULAR USER (one with a shipping mark)
5. Add the SAME tracking number "MANUAL_TEST_002"
6. Go back to Django admin
7. Filter by tracking_number = "MANUAL_TEST_002"
8. ✓ EXPECTED: BOTH records should show:
   - Same owner (the regular user)
   - Same shipping mark (user's mark)

If BOTH scenarios work, the sync is fixed! ✅

If either fails, check:
- Django server terminal for error messages
- Run: py -3 manage.py shell
  >>> from buysellapi.models import Tracking
  >>> Tracking.objects.filter(tracking_number="MANUAL_TEST_001").values('id', 'owner__username', 'shipping_mark')
"""
)

print("=" * 80)
