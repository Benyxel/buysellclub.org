from django.db import models
from django.contrib.auth.models import User
from django.contrib.auth.models import Group
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.utils import timezone
import django.utils.timezone

# Create your models here.


class UserModel(models.Model):

    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("suspended", "Suspended"),
    ]

    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("user", "User"),
        ("moderator", "Moderator"),
    ]

    id = models.BigAutoField(primary_key=True)
    username = models.CharField(max_length=10, unique=True)
    full_name = models.CharField(max_length=30)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="user")
    login_attempts = models.IntegerField(default=0)
    last_login = models.DateField(
        default=django.utils.timezone.now, verbose_name="last login"
    )
    created_at = models.DateField(auto_now_add=True)
    contact = models.CharField(max_length=20, unique=True)
    location = models.CharField(max_length=20)
    # Notification preferences
    notify_email = models.BooleanField(
        default=True, help_text="Receive general email notifications"
    )
    notify_order_updates = models.BooleanField(
        default=True, help_text="Receive order/shipment update emails"
    )
    notify_promotions = models.BooleanField(
        default=False, help_text="Receive promotional/marketing emails"
    )

    def save(self, *args, **kwargs):
        # Auto-suspend after 3 failed login attempts
        if self.login_attempts >= 3:
            self.status = "suspended"

        # Auto-activate on first login (if was inactive)
        if self.last_login and self.status == "inactive":
            self.status = "active"

        super().save(*args, **kwargs)

    def __str__(self):
        return self.username


class Container(models.Model):
    """Represents a shipping container for grouping tracking numbers.

    Container holds multiple tracking numbers that will be shipped together
    from China to Ghana. Each container has a unique number and tracks
    the shipment journey.
    """

    STATUS_CHOICES = [
        ("preparing", "Preparing"),
        ("loading", "Loading"),
        ("in_transit", "In Transit"),
        ("arrived_port", "Arrived at Port"),
        ("clearing", "Clearing"),
        ("completed", "Completed"),
    ]

    container_number = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text="Unique container identifier (e.g., CONT-2025-001)",
    )
    port_of_loading = models.CharField(
        max_length=100, default="China", help_text="Port where container is loaded"
    )
    port_of_discharge = models.CharField(
        max_length=100, default="Ghana", help_text="Destination port"
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="preparing"
    )
    departure_date = models.DateField(
        null=True, blank=True, help_text="When the container departs from China"
    )
    arrival_date = models.DateField(
        null=True, blank=True, help_text="Expected/actual arrival date in Ghana"
    )
    notes = models.TextField(
        blank=True, default="", help_text="Additional notes or comments"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Container"
        verbose_name_plural = "Containers"

    def __str__(self):
        return f"{self.container_number} ({self.status})"

    def get_tracking_count(self):
        """Returns the total number of tracking entries in this container."""
        return self.trackings.count()

    def get_unique_mark_ids(self):
        """Returns a list of unique shipping mark IDs in this container."""
        return list(
            self.trackings.exclude(shipping_mark="")
            .values_list("shipping_mark", flat=True)
            .distinct()
        )

    def get_mark_id_stats(self):
        """Returns statistics grouped by shipping mark ID."""
        from django.db.models import Count, Sum

        return (
            self.trackings.exclude(shipping_mark="")
            .values("shipping_mark")
            .annotate(
                count=Count("id"), total_cbm=Sum("cbm"), total_fee=Sum("shipping_fee")
            )
            .order_by("-count")
        )


class Tracking(models.Model):
    """Represents a shipment tracking record.

    Fields
    - tracking_number: Unique tracking code/number (indexed, unique)
    - shipping_mark: Free-text or code identifying the shipping mark
    - status: Current shipment status (choice field)
    - cbm: Cubic meter volume for the shipment (Decimal)
    - shipping_fee: Shipping fee amount (Decimal)
    - date_added: When the tracking entry was created
    - eta: Estimated Time of Arrival (date)
    - container: Optional link to a shipping container

    Note: The request mentioned "cmb"; here we use the common term "cbm"
    (cubic meters). If you prefer the field name to be "cmb", rename the
    field and regenerate migrations.
    """

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_transit", "In Transit"),
        ("arrived", "Arrived(China)"),
        ("cancelled", "Cancelled"),
        ("rejected", "Rejected"),
        ("not_received", "Not Received"),
        ("vessel", "On The Vessel"),
        ("clearing", "Clearing"),
        ("arrived_ghana", "Arrived(Ghana)"),
        ("off_loading", "Of Loading"),
        ("pick_up", "Pick up"),
    ]

    tracking_number = models.CharField(max_length=64, unique=True, db_index=True)
    container = models.ForeignKey(
        Container,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="trackings",
        help_text="Container this tracking belongs to",
    )
    owner = models.ForeignKey(
        UserModel,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="trackings",
        help_text="Owner of this tracking entry (if created by an authenticated user)",
    )
    shipping_mark = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    cbm = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        help_text="Cubic meters (e.g., 1.234)",
    )
    shipping_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Shipping fee amount",
    )
    GOODS_TYPE_CHOICES = [
        ("normal", "Normal Goods"),
        ("special", "Special Goods"),
    ]
    goods_type = models.CharField(
        max_length=10,
        choices=GOODS_TYPE_CHOICES,
        null=True,
        blank=True,
        help_text="Selected rate category for fee calculation",
    )
    date_added = models.DateTimeField(auto_now_add=True)
    eta = models.DateField(
        null=True,
        blank=True,
        help_text="Estimated Time of Arrival",
    )

    class Meta:
        ordering = ["-date_added"]
        verbose_name = "Tracking"
        verbose_name_plural = "Trackings"

    def __str__(self):
        return f"{self.tracking_number} ({self.status})"

    def sync_duplicates(self):
        """
        Synchronize owner and shipping_mark across ALL Tracking records
        with the same tracking_number.

        Logic:
        1. Find the canonical non-admin owner (most recent by date_added)
        2. Get that owner's shipping mark from ShippingMark table
        3. Update ALL records with this tracking_number to use that owner and mark

        This is called explicitly after save in views/admin to ensure consistency
        regardless of who adds the tracking first (user or admin).
        """
        from django.db.models import Q

        # Find all trackings with this number
        all_trackings = Tracking.objects.filter(tracking_number=self.tracking_number)

        # Find the canonical owner: most recent non-admin owner
        canonical_owner = None
        for t in all_trackings.order_by("-date_added"):
            if t.owner and t.owner.role != "admin":
                canonical_owner = t.owner
                break

        if not canonical_owner:
            # No non-admin owner found, try to infer from shipping_mark
            for t in all_trackings:
                if t.shipping_mark:
                    try:
                        sm = ShippingMark.objects.get(mark_id=t.shipping_mark)
                        canonical_owner = sm.owner
                        break
                    except ShippingMark.DoesNotExist:
                        continue

        if not canonical_owner:
            # No owner to sync to
            return

        # Get canonical shipping mark from owner's ShippingMark
        canonical_mark = ""
        try:
            sm = ShippingMark.objects.get(owner=canonical_owner)
            canonical_mark = sm.mark_id or ""
        except ShippingMark.DoesNotExist:
            pass

        # Update all records with this tracking_number
        updates = {"owner_id": canonical_owner.id}
        if canonical_mark:
            updates["shipping_mark"] = canonical_mark

        all_trackings.update(**updates)


class ShippingMark(models.Model):
    """Permanent per-user shipping mark used for address generation.

    Constraints
    - One mark per user (owner is unique)
    - mark_id is globally unique (e.g., M856-FIM123)

    Only the `name` is user-editable after creation; the mark_id is permanent.
    """

    owner = models.OneToOneField(
        UserModel,
        on_delete=models.CASCADE,
        related_name="shipping_mark",
        help_text="User who owns this permanent shipping mark",
    )
    mark_id = models.CharField(max_length=32, unique=True, db_index=True)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Shipping Mark"
        verbose_name_plural = "Shipping Marks"

    def __str__(self):
        return f"{self.mark_id}:{self.name}"


class ShippingRate(models.Model):
    """Shipping rates for different goods types.

    This model stores the per-CBM rates for different types of goods.
    Only one active rate record should exist at a time.
    """

    normal_goods_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Rate per CBM for normal goods in dollars",
    )
    special_goods_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Rate per CBM for special goods in dollars",
    )
    # Rates applicable when shipment volume is less than 1 CBM
    normal_goods_rate_lt1 = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Rate for normal goods when CBM < 1 (flat or per-CBM as business rules)",
        null=True,
        blank=True,
    )
    special_goods_rate_lt1 = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Rate for special goods when CBM < 1 (flat or per-CBM as business rules)",
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this rate is currently active",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Shipping Rate"
        verbose_name_plural = "Shipping Rates"

    def __str__(self):
        return f"Normal: ${self.normal_goods_rate}/CBM | Special: ${self.special_goods_rate}/CBM"

    def save(self, *args, **kwargs):
        # Ensure only one active rate exists
        if self.is_active:
            ShippingRate.objects.filter(is_active=True).update(is_active=False)
        super().save(*args, **kwargs)


class DashboardTab(models.Model):
    """Represents a configurable dashboard tab that can be assigned to groups or users.

    Superusers can create/edit DashboardTab entries in Django admin and assign them to
    auth.Groups and/or specific Django auth Users. The frontend will request the
    active tabs available to the requesting user via an API endpoint.
    """

    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    groups = models.ManyToManyField(
        Group, blank=True, help_text="Groups that can see this tab"
    )
    users = models.ManyToManyField(
        User, blank=True, help_text="Users that can see this tab"
    )
    order = models.IntegerField(
        default=100, help_text="Ordering weight for the tab (lower appears first)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "name"]
        verbose_name = "Dashboard Tab"
        verbose_name_plural = "Dashboard Tabs"

    def __str__(self):
        return self.name


class Category(models.Model):
    """Product category model for managing shop categories."""
    
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=100, help_text="Ordering weight (lower appears first)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ["order", "name"]
        verbose_name = "Category"
        verbose_name_plural = "Categories"
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class ProductType(models.Model):
    """Product type model for managing product types."""
    
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=100, help_text="Ordering weight (lower appears first)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ["order", "name"]
        verbose_name = "Product Type"
        verbose_name_plural = "Product Types"
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Product(models.Model):
    """Simple product model for the storefront.

    Images are stored as a JSON list of URL strings in `images` to keep
    the model simple for this project. Admins will add products via the
    Django admin interface or custom backend admin views.
    """

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True, default="")
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    images = models.JSONField(default=list, blank=True)
    category = models.CharField(max_length=120, blank=True, default="")
    product_type = models.CharField(max_length=120, blank=True, default="")
    inventory = models.IntegerField(default=0)
    trending = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Product"
        verbose_name_plural = "Products"

    def __str__(self):
        return f"{self.name} ({self.slug})"

    def get_average_rating(self):
        """Calculate average rating from reviews."""
        try:
            reviews = self.reviews.filter(is_approved=True)
            if reviews.exists():
                avg = reviews.aggregate(models.Avg('rating'))['rating__avg']
                return round(avg or 0, 1)
            return 0.0
        except Exception:
            # Handle case where reviews table might not exist or other errors
            return 0.0

    def get_review_count(self):
        """Get count of approved reviews."""
        try:
            return self.reviews.filter(is_approved=True).count()
        except Exception:
            # Handle case where reviews table might not exist or other errors
            return 0


class Order(models.Model):
    """Order model for store purchases."""
    
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("shipped", "Shipped"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("failed", "Failed"),
        ("refunded", "Refunded"),
    ]
    
    user = models.ForeignKey(
        UserModel,
        on_delete=models.CASCADE,
        related_name="orders",
        help_text="User who placed this order"
    )
    
    # Order items stored as JSON for simplicity
    items = models.JSONField(
        default=list,
        help_text="List of order items with product info, quantity, price, etc."
    )
    
    # Customer information
    customer_name = models.CharField(max_length=255)
    customer_email = models.EmailField()
    customer_phone = models.CharField(max_length=20, blank=True, default="")
    
    # Shipping information
    shipping_address = models.TextField()
    shipping_city = models.CharField(max_length=100)
    shipping_state = models.CharField(max_length=100)
    shipping_zip_code = models.CharField(max_length=20)
    shipping_country = models.CharField(max_length=100, default="Ghana")
    
    # Financial information
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default="pending")
    payment_method = models.CharField(max_length=50, blank=True, default="")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Order"
        verbose_name_plural = "Orders"
    
    def __str__(self):
        return f"Order #{self.id} by {self.customer_name}"


class Buy4meRequest(models.Model):
    """Buy4me request model for custom product purchase requests."""
    
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
        ("rejected", "Rejected"),
    ]
    
    INVOICE_STATUS_CHOICES = [
        ("draft", "Draft"),
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("cancelled", "Cancelled"),
    ]
    
    TRACKING_STATUS_CHOICES = [
        ("sourcing", "Sourcing"),
        ("buying", "Buying"),
        ("sent_to_warehouse", "Sent to Warehouse"),
        ("shipped", "Shipped"),
        ("at_the_port", "At the Port"),
        ("off_loading", "Off Loading"),
        ("pickup", "Pickup"),
    ]
    
    user = models.ForeignKey(
        UserModel,
        on_delete=models.CASCADE,
        related_name="buy4me_requests",
        help_text="User who made this request"
    )
    
    # Product information
    title = models.CharField(max_length=255, help_text="Product title/name")
    description = models.TextField(blank=True, default="", help_text="Product description")
    product_url = models.URLField(blank=True, null=True, help_text="Link to the product")
    additional_links = models.JSONField(
        default=list,
        blank=True,
        help_text="Additional product links with quantities"
    )
    images = models.JSONField(
        default=list,
        blank=True,
        help_text="Product images URLs"
    )
    quantity = models.PositiveIntegerField(default=1, help_text="Requested quantity")
    
    # Status and workflow
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        help_text="Current status of the request"
    )
    tracking_status = models.CharField(
        max_length=20,
        choices=TRACKING_STATUS_CHOICES,
        blank=True,
        null=True,
        help_text="Current tracking status of the request"
    )
    notes = models.TextField(
        blank=True,
        default="",
        help_text="Admin notes or customer notes"
    )
    
    # Invoice information
    invoice_created = models.BooleanField(default=False, help_text="Whether invoice has been created")
    invoice_number = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        help_text="Invoice number if invoice was created"
    )
    invoice_status = models.CharField(
        max_length=20,
        choices=INVOICE_STATUS_CHOICES,
        default="draft",
        help_text="Invoice payment status"
    )
    invoice_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Invoice amount"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Buy4me Request"
        verbose_name_plural = "Buy4me Requests"
    
    def __str__(self):
        return f"Buy4me Request #{self.id} - {self.title} by {self.user.username}"


class QuickOrderProduct(models.Model):
    """Quick order products that admins can add for users to place orders quickly."""
    
    title = models.CharField(max_length=255, help_text="Product title/name")
    description = models.TextField(blank=True, default="", help_text="Product description")
    product_url = models.URLField(help_text="Link to the product")
    images = models.JSONField(
        default=list,
        blank=True,
        help_text="Product images URLs"
    )
    min_quantity = models.PositiveIntegerField(default=20, help_text="Minimum quantity for this product")
    is_active = models.BooleanField(default=True, help_text="Whether this product is active and visible to users")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Quick Order Product"
        verbose_name_plural = "Quick Order Products"
    
    def __str__(self):
        return f"{self.title} (Active: {self.is_active})"


class ProductReview(models.Model):
    """Product reviews and ratings from buyers."""
    
    RATING_CHOICES = [
        (1, '1 Star'),
        (2, '2 Stars'),
        (3, '3 Stars'),
        (4, '4 Stars'),
        (5, '5 Stars'),
    ]
    
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    user = models.ForeignKey(
        UserModel,
        on_delete=models.CASCADE,
        related_name='product_reviews'
    )
    rating = models.IntegerField(choices=RATING_CHOICES, default=5)
    title = models.CharField(max_length=200, blank=True)
    comment = models.TextField()
    is_approved = models.BooleanField(
        default=True,
        help_text="Admin can moderate reviews"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Product Review"
        verbose_name_plural = "Product Reviews"
        constraints = [
            models.UniqueConstraint(
                fields=['product', 'user'],
                name='unique_product_user_review'
            )
        ]  # One review per user per product
    
    def __str__(self):
        return f"{self.user.full_name} - {self.product.name} ({self.rating} stars)"


class ShippingAddress(models.Model):
    """Admin-managed shipping addresses for users.

    Each address represents a generated shipping address with:
    - mark_id: Unique identifier (e.g., M856-FIM001)
    - name: Recipient name
    - full_address: Complete formatted address
    - shipping_mark: Formatted as "markId:name"
    - tracking_number: Optional associated tracking number
    """

    mark_id = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text="Unique mark identifier (e.g., M856-FIM001)",
    )
    name = models.CharField(max_length=100, help_text="Recipient name")
    full_address = models.TextField(help_text="Complete formatted shipping address")
    shipping_mark = models.CharField(
        max_length=200, help_text="Formatted as 'markId:name'"
    )
    tracking_number = models.CharField(
        max_length=64,
        blank=True,
        default="",
        help_text="Optional associated tracking number",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        UserModel,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_shipping_addresses",
        help_text="Admin who created this address",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Shipping Address"
        verbose_name_plural = "Shipping Addresses"
        indexes = [
            models.Index(fields=["mark_id"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.mark_id}: {self.name}"


class DefaultBaseAddress(models.Model):
    """Stores the default base address template used for generating shipping addresses.

    Only one active record should exist at a time.
    """

    base_address = models.TextField(
        help_text="Default base address template for address generation"
    )
    is_active = models.BooleanField(
        default=True, help_text="Whether this is the currently active base address"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        UserModel,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="updated_base_addresses",
        help_text="Admin who last updated this address",
    )

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Default Base Address"
        verbose_name_plural = "Default Base Addresses"

    def __str__(self):
        return f"Base Address (Active: {self.is_active})"

    def save(self, *args, **kwargs):
        # Ensure only one active base address exists
        if self.is_active:
            DefaultBaseAddress.objects.filter(is_active=True).exclude(
                pk=self.pk
            ).update(is_active=False)
        super().save(*args, **kwargs)


class EmailNotification(models.Model):
    """Tracks email notifications sent to users"""

    NOTIFICATION_TYPES = [
        ("tracking_update", "Tracking Status Update"),
        ("tracking_created", "New Tracking Created"),
        ("welcome", "Welcome Email"),
        ("password_reset", "Password Reset"),
        ("invoice_ready", "Invoice Ready"),
        ("invoice_paid", "Invoice Payment Received"),
        ("admin_announcement", "Admin Announcement"),
        ("admin_notification", "Admin Notification"),
        ("shipping_mark_created", "Shipping Mark Created"),
        ("otp_login", "Login OTP"),
        ("alipay_payment_submitted", "Alipay Payment Submitted"),
        ("alipay_payment_status", "Alipay Payment Status Update"),
        ("order_placed", "Order Placed"),
        ("order_confirmation", "Order Confirmation"),
        ("buy4me_order_placed", "Buy4Me Order Placed"),
        ("buy4me_order_confirmation", "Buy4Me Order Confirmation"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("sent", "Sent"),
        ("read", "Read"),
        ("failed", "Failed"),
        ("bounced", "Bounced"),
    ]

    user = models.ForeignKey(
        UserModel,
        on_delete=models.CASCADE,
        related_name="email_notifications",
        help_text="User who should receive this email",
    )
    notification_type = models.CharField(
        max_length=50, choices=NOTIFICATION_TYPES, help_text="Type of notification"
    )
    subject = models.CharField(max_length=255, help_text="Email subject line")
    message = models.TextField(help_text="Email body content")
    html_message = models.TextField(
        blank=True, null=True, help_text="HTML version of the email"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    sent_at = models.DateTimeField(
        null=True, blank=True, help_text="When email was sent"
    )
    error_message = models.TextField(
        blank=True, null=True, help_text="Error message if send failed"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Optional: Link to related objects
    tracking = models.ForeignKey(
        "Tracking",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="notifications",
        help_text="Related tracking if applicable",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Email Notification"
        verbose_name_plural = "Email Notifications"
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["notification_type", "created_at"]),
        ]

    def __str__(self):
        return f"{self.notification_type} to {self.user.email} - {self.status}"


class LoginOTP(models.Model):
    """One-time passwords for email-based login."""

    user = models.ForeignKey(
        UserModel,
        on_delete=models.CASCADE,
        related_name="login_otps",
    )
    email = models.EmailField(help_text="Delivery email for this OTP")
    code_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveIntegerField(default=0)
    is_used = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["email", "created_at"]),
            models.Index(fields=["user", "is_used"]),
        ]
        ordering = ["-created_at"]

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    def __str__(self):
        return f"OTP for {self.email} at {self.created_at:%Y-%m-%d %H:%M:%S}"


class PasswordResetOTP(models.Model):
    """OTP used for password reset via email."""

    user = models.ForeignKey(
        UserModel, on_delete=models.CASCADE, related_name="password_reset_otps"
    )
    email = models.EmailField(help_text="Delivery email for this reset OTP")
    code_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveIntegerField(default=0)
    is_used = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["email", "created_at"]),
            models.Index(fields=["user", "is_used"]),
        ]
        ordering = ["-created_at"]

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    def __str__(self):
        return f"Reset OTP for {self.email} at {self.created_at:%Y-%m-%d %H:%M:%S}"


# Invoicing models


class Invoice(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("overdue", "Overdue"),
        ("cancelled", "Cancelled"),
    ]

    invoice_number = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text="Unique invoice number (e.g., INV-2025-001)",
    )
    shipping_mark = models.CharField(
        max_length=255, db_index=True, help_text="Customer's shipping mark ID"
    )
    customer_name = models.CharField(
        max_length=255, blank=True, help_text="Customer name for display"
    )
    customer_email = models.EmailField(
        blank=True, help_text="Customer email for invoice delivery"
    )

    subtotal = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, help_text="Sum of all line items"
    )
    tax_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, help_text="Tax amount"
    )
    discount_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, help_text="Discount amount"
    )
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Final amount to be paid in USD",
    )

    exchange_rate = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="USD to GHS exchange rate at time of invoice creation",
    )
    total_amount_ghs = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Total amount in GHS (Ghanaian Cedis)",
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    issue_date = models.DateField(
        null=True, blank=True, help_text="Date invoice was issued"
    )
    due_date = models.DateField(null=True, blank=True, help_text="Payment due date")
    paid_date = models.DateField(
        null=True, blank=True, help_text="Date payment was received"
    )

    payment_method = models.CharField(
        max_length=50,
        blank=True,
        help_text="Method of payment (e.g., Bank Transfer, Cash)",
    )
    payment_reference = models.CharField(
        max_length=100, blank=True, help_text="Payment transaction reference"
    )
    notes = models.TextField(blank=True, help_text="Additional notes or comments")

    container = models.ForeignKey(
        Container,
        on_delete=models.CASCADE,
        related_name="invoices",
        help_text="Container this invoice is for",
    )
    created_by = models.ForeignKey(
        UserModel,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_invoices",
        help_text="Admin who created this invoice",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Invoice"
        verbose_name_plural = "Invoices"
        indexes = [
            models.Index(fields=["container", "shipping_mark"]),
            models.Index(fields=["status", "due_date"]),
        ]

    def __str__(self):
        return self.invoice_number


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="items",
        help_text="Invoice this item belongs to",
    )
    tracking = models.ForeignKey(
        Tracking,
        on_delete=models.CASCADE,
        related_name="invoice_items",
        help_text="Tracking number this item is for",
    )
    description = models.CharField(max_length=255, help_text="Item description")
    tracking_number = models.CharField(
        max_length=64, help_text="Tracking number for reference"
    )
    cbm = models.DecimalField(max_digits=10, decimal_places=3, help_text="Cubic meters")
    rate_per_cbm = models.DecimalField(
        max_digits=10, decimal_places=2, help_text="Rate per CBM at time of invoicing"
    )
    goods_type = models.CharField(
        max_length=10, blank=True, help_text="Normal or Special goods"
    )
    total_amount = models.DecimalField(
        max_digits=10, decimal_places=2, help_text="Total for this line item"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "Invoice Item"
        verbose_name_plural = "Invoice Items"

    def __str__(self):
        return f"{self.tracking_number} - {self.total_amount}"


class CurrencyRate(models.Model):
    """Stores the USD to GHS exchange rate for invoice conversions."""

    usd_to_ghs = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        help_text="Current exchange rate: 1 USD = X GHS",
    )
    updated_by = models.ForeignKey(
        UserModel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Admin who last updated the rate",
    )
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(
        blank=True, help_text="Optional notes about this rate update"
    )

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Currency Exchange Rate"
        verbose_name_plural = "Currency Exchange Rates"

    def __str__(self):
        return f"1 USD = {self.usd_to_ghs} GHS (Updated: {self.updated_at.strftime('%Y-%m-%d %H:%M')})"

    @classmethod
    def get_current_rate(cls):
        """Get the most recent exchange rate, or return a default."""
        latest = cls.objects.first()
        return latest.usd_to_ghs if latest else 12.0  # Default fallback rate


class AlipayPayment(models.Model):
    """Represents an Alipay payment record managed by admins.

    Stored amounts and currencies capture both the original currency and the converted
    currency based on an exchange rate at the time of submission. Admins can update
    the status and optionally add a transaction ID and notes.
    """

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("rejected", "Rejected"),
    ]

    user = models.ForeignKey(
        UserModel,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="alipay_payments",
        help_text="User who submitted/owns this payment (optional)",
    )

    # Account and identity
    account_type = models.CharField(max_length=32, blank=True, default="personal")
    alipay_account = models.CharField(max_length=128, blank=True, default="")
    real_name = models.CharField(max_length=128, blank=True, default="")
    qr_code_image = models.TextField(
        blank=True, default="", help_text="URL or base64 image"
    )
    platform_source = models.CharField(max_length=64, blank=True, default="Alipay")

    # Proof of payment image uploaded by user
    proof_of_payment = models.TextField(
        blank=True, default="", help_text="URL or base64 image of payment proof"
    )

    # Amounts and currency
    original_currency = models.CharField(max_length=16, default="CNY")
    original_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    converted_currency = models.CharField(max_length=16, default="CEDI")
    converted_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    exchange_rate = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        help_text="Rate used for conversion",
    )

    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="pending")
    transaction_id = models.CharField(max_length=128, blank=True, default="")
    admin_notes = models.TextField(blank=True, default="")

    payment_date = models.DateTimeField(null=True, blank=True)
    completion_date = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
        ]
        verbose_name = "Alipay Payment"
        verbose_name_plural = "Alipay Payments"

    def __str__(self) -> str:
        base = f"{self.real_name or (self.user.full_name if self.user else '')}".strip()
        return (
            f"{base} - {self.original_currency} {self.original_amount} ({self.status})"
        )


class AlipayExchangeRate(models.Model):
    """Stores CNY<->GHS exchange rates for Alipay conversions.

    We store both directions for clarity:
    - ghs_to_cny: how many CNY per 1 GHS
    - cny_to_ghs: how many GHS per 1 CNY (inverse)
    """

    ghs_to_cny = models.DecimalField(
        max_digits=10, decimal_places=3, help_text="CNY per 1 GHS"
    )
    cny_to_ghs = models.DecimalField(
        max_digits=10, decimal_places=3, help_text="GHS per 1 CNY"
    )
    updated_by = models.ForeignKey(
        UserModel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Admin who last updated the Alipay rate",
    )
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(
        blank=True, help_text="Optional notes about this rate update"
    )

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Alipay Exchange Rate"
        verbose_name_plural = "Alipay Exchange Rates"

    def __str__(self):
        return f"1 GHS = {self.ghs_to_cny} CNY | 1 CNY = {self.cny_to_ghs} GHS"

    @classmethod
    def get_current(cls):
        """Get latest Alipay rate or defaults (approximate)."""
        latest = cls.objects.first()
        if latest:
            return latest
        # Default fallback: 1 GHS ~ 0.440 CNY (so 1 CNY ~ 2.273 GHS)
        return cls(
            ghs_to_cny=0.440,
            cny_to_ghs=2.273,
        )
