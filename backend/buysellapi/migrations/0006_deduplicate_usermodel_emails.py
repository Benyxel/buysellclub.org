from django.db import migrations


def dedupe_emails(apps, schema_editor):
    UserModel = apps.get_model("buysellapi", "UserModel")
    # Build a map of email to list of user ids
    from collections import defaultdict

    email_map = defaultdict(list)
    for u in UserModel.objects.all().only("id", "email"):
        email_map[(u.email or "").strip().lower()].append(u.id)

    for email, ids in email_map.items():
        if not email:
            continue
        if len(ids) <= 1:
            continue
        # Keep the first, adjust the rest
        base_email = email
        local, sep, domain = base_email.partition("@")
        if not sep:
            # Not a valid email format; append domain
            local, domain = base_email, "example.com"

        # Start suffixing from 1
        suffix = 1
        # The first id remains unchanged
        for dup_id in ids[1:]:
            # Find a unique variant
            while True:
                candidate = f"{local}+dedupe{suffix}@{domain}"
                suffix += 1
                if not UserModel.objects.filter(email=candidate).exists():
                    break
            UserModel.objects.filter(id=dup_id).update(email=candidate)


class Migration(migrations.Migration):
    dependencies = [
        ("buysellapi", "0005_alter_tracking_cbm_alter_tracking_shipping_mark"),
    ]

    operations = [
        migrations.RunPython(dedupe_emails, migrations.RunPython.noop),
    ]
