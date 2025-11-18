from django.contrib import admin
from .models import (
    UserModel,
    Tracking,
    ShippingMark,
    ShippingRate,
    ShippingAddress,
    DefaultBaseAddress,
    DashboardTab,
    Product,
    ProductReview,
    Order,
    Category,
    ProductType,
    Buy4meRequest,
    QuickOrderProduct,
)


@admin.register(UserModel)
class UserModelAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "username",
        "full_name",
        "email",
        "status",
        "role",
        "created_at",
        "last_login",
    )
    list_filter = ("status", "role", "created_at")
    search_fields = ("username", "full_name", "email")


@admin.register(Tracking)
class TrackingAdmin(admin.ModelAdmin):
    list_display = (
        "tracking_number",
        "status",
        "cbm",
        "date_added",
    )
    list_filter = ("status", "date_added")
    search_fields = ("tracking_number", "shipping_mark")
    ordering = ("-date_added",)

    def save_model(self, request, obj, form, change):
        """Override save to call sync_duplicates after saving in admin."""
        super().save_model(request, obj, form, change)
        obj.sync_duplicates()


@admin.register(ShippingMark)
class ShippingMarkAdmin(admin.ModelAdmin):
    list_display = ("mark_id", "name", "owner", "created_at")
    list_filter = ("created_at",)
    search_fields = ("mark_id", "name", "owner__username")
    ordering = ("-created_at",)


@admin.register(ShippingRate)
class ShippingRateAdmin(admin.ModelAdmin):
    list_display = (
        "normal_goods_rate",
        "special_goods_rate",
        "is_active",
        "created_at",
        "updated_at",
    )
    list_filter = ("is_active", "created_at")
    ordering = ("-created_at",)


@admin.register(ShippingAddress)
class ShippingAddressAdmin(admin.ModelAdmin):
    list_display = (
        "mark_id",
        "name",
        "tracking_number",
        "created_by",
        "created_at",
        "updated_at",
    )
    list_filter = ("created_at", "updated_at")
    search_fields = (
        "mark_id",
        "name",
        "full_address",
        "shipping_mark",
        "tracking_number",
    )
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(DefaultBaseAddress)
class DefaultBaseAddressAdmin(admin.ModelAdmin):
    list_display = ("is_active", "updated_by", "updated_at")
    list_filter = ("is_active", "updated_at")
    ordering = ("-updated_at",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(DashboardTab)
class DashboardTabAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "order", "created_at")
    list_filter = ("is_active", "groups")
    search_fields = ("name", "slug", "description")
    filter_horizontal = ("groups", "users")
    ordering = ("order", "name")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "slug",
        "price",
        "inventory",
        "is_active",
        "created_at",
    )
    list_filter = ("is_active", "category", "product_type", "trending")
    search_fields = ("name", "slug", "description")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "product",
        "user",
        "rating",
        "title",
        "is_approved",
        "created_at",
    )
    list_filter = ("is_approved", "rating", "created_at")
    search_fields = ("product__name", "user__full_name", "title", "comment")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")
    list_editable = ("is_approved",)  # Allow quick approval toggle


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "customer_name",
        "customer_email",
        "total",
        "status",
        "payment_status",
        "created_at",
    )
    list_filter = ("status", "payment_status", "created_at", "shipping_country")
    search_fields = ("customer_name", "customer_email", "customer_phone", "id")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")
    list_editable = ("status", "payment_status")  # Allow quick status updates


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "order", "created_at")
    list_filter = ("is_active", "created_at")
    search_fields = ("name", "slug", "description")
    ordering = ("order", "name")
    readonly_fields = ("created_at", "updated_at")
    list_editable = ("is_active", "order")


@admin.register(ProductType)
class ProductTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "order", "created_at")
    list_filter = ("is_active", "created_at")
    search_fields = ("name", "slug", "description")
    ordering = ("order", "name")
    readonly_fields = ("created_at", "updated_at")
    list_editable = ("is_active", "order")


@admin.register(QuickOrderProduct)
class QuickOrderProductAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "is_active",
        "min_quantity",
        "created_at",
    )
    list_filter = ("is_active", "created_at")
    search_fields = ("title", "description", "product_url")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")
    list_editable = ("is_active",)
    fieldsets = (
        ("Product Information", {
            "fields": ("title", "description", "product_url", "images", "min_quantity")
        }),
        ("Status", {
            "fields": ("is_active",)
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at")
        }),
    )


@admin.register(Buy4meRequest)
class Buy4meRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "user",
        "status",
        "tracking_status",
        "invoice_status",
        "invoice_amount",
        "created_at",
    )
    list_filter = ("status", "tracking_status", "invoice_status", "created_at", "invoice_created")
    search_fields = ("title", "description", "user__username", "user__email", "invoice_number")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at", "invoice_number")
    list_editable = ("status", "tracking_status", "invoice_status")
    fieldsets = (
        ("Request Information", {
            "fields": ("user", "title", "description", "product_url", "additional_links", "images", "quantity")
        }),
        ("Status", {
            "fields": ("status", "tracking_status", "notes")
        }),
        ("Invoice", {
            "fields": ("invoice_created", "invoice_number", "invoice_status", "invoice_amount")
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at")
        }),
    )
