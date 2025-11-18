from django.apps import AppConfig


class BuysellapiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "buysellapi"

    def ready(self):
        import buysellapi.signals
