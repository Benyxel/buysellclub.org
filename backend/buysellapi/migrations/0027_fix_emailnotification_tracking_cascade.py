# Generated manually to fix EmailNotification.tracking foreign key constraint
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("buysellapi", "0026_fix_emailnotification_tracking_fk"),
    ]

    operations = [
        # SQLite requires recreating the table to change FK constraints
        migrations.RunSQL(
            # Create new table with correct constraint
            """
            CREATE TABLE buysellapi_emailnotification_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                notification_type VARCHAR(50) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                html_message TEXT,
                status VARCHAR(20) NOT NULL,
                sent_at DATETIME,
                error_message TEXT,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                user_id BIGINT NOT NULL REFERENCES buysellapi_usermodel(id) ON DELETE CASCADE,
                tracking_id BIGINT REFERENCES buysellapi_tracking(id) ON DELETE SET NULL
            );
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            # Copy data from old table
            """
            INSERT INTO buysellapi_emailnotification_new 
                (id, notification_type, subject, message, html_message, status, 
                 sent_at, error_message, created_at, updated_at, user_id, tracking_id)
            SELECT id, notification_type, subject, message, html_message, status,
                   sent_at, error_message, created_at, updated_at, user_id, tracking_id
            FROM buysellapi_emailnotification;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            # Drop old table and rename new one
            """
            DROP TABLE buysellapi_emailnotification;
            ALTER TABLE buysellapi_emailnotification_new RENAME TO buysellapi_emailnotification;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            # Recreate indexes
            """
            CREATE INDEX buysellapi_emailnotification_user_id_status_idx 
                ON buysellapi_emailnotification(user_id, status);
            CREATE INDEX buysellapi_emailnotification_notification_type_created_at_idx 
                ON buysellapi_emailnotification(notification_type, created_at);
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
