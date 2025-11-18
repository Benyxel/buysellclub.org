from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .analytics_views import AdminAnalyticsView
from .views import (
    UserListView,
    UserDetailView,
    UserDeleteView,
    UserUpdateView,
    CurrentUserView,
    TrackingListCreateView,
    TrackingDetailView,
    TrackingRetrieveByNumberView,
    MyShippingMarkView,
    EnsureProfileView,
    ShippingRateView,
    ShippingRateListView,
    AdminSendNotificationView,
    AdminBroadcastNotificationView,
    NotificationHistoryView,
    UserNotificationsView,
    AdminNotificationsView,
    MarkNotificationReadView,
    MarkAllNotificationsReadView,
    RequestOTPView,
    VerifyOTPView,
    RequestPasswordResetView,
    VerifyPasswordResetView,
    ChangePasswordView,
    DeleteNotificationView,
    ClearAllNotificationsView,
    ShippingMarkListView,
    InvoicePreviewView,
    InvoiceSendView,
    InvoiceListCreateView,
    InvoiceDetailView,
    CurrencyRateView,
    CurrencyRateHistoryView,
    AlipayExchangeRateView,
    AlipayExchangeRateHistoryView,
    DashboardTabsView,
    DashboardTabsAllView,
    DashboardTabsUserView,
    DashboardTabAssignUserView,
    DashboardTabDetailView,
    DashboardTabsSyncView,
    DashboardTabAssignRoleView,
    ProductListView,
    ProductDetailView,
    ProductReviewListView,
    ProductReviewDetailView,
    OrderListView,
    OrderDetailView,
    AdminOrderListView,
    CategoryListView,
    CategoryDetailView,
    ProductTypeListView,
    ProductTypeDetailView,
    UserBuy4meRequestListView,
    UserBuy4meRequestDetailView,
    AdminBuy4meRequestListView,
    AdminBuy4meRequestDetailView,
    AdminBuy4meRequestStatusView,
    AdminBuy4meRequestTrackingView,
    AdminBuy4meRequestInvoiceView,
    QuickOrderProductListView,
    AdminQuickOrderProductListView,
    AdminQuickOrderProductDetailView,
)


urlpatterns = [
    # Auth
    path("auth/request-otp/", RequestOTPView.as_view(), name="auth-request-otp"),
    path("auth/verify-otp/", VerifyOTPView.as_view(), name="auth-verify-otp"),
    path(
        "auth/request-password-reset/",
        RequestPasswordResetView.as_view(),
        name="auth-request-password-reset",
    ),
    path(
        "auth/verify-password-reset/",
        VerifyPasswordResetView.as_view(),
        name="auth-verify-password-reset",
    ),
    path("users/me/", CurrentUserView.as_view(), name="user-me"),
    path(
        "users/change-password/",
        ChangePasswordView.as_view(),
        name="user-change-password",
    ),
    path("users/", UserListView.as_view(), name="user-list"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="user-detail"),
    path("users/<int:pk>/update/", UserUpdateView.as_view(), name="user-update"),
    path("users/<int:pk>/delete/", UserDeleteView.as_view(), name="user-delete"),
    path("users/ensure-profile/", EnsureProfileView.as_view(), name="ensure-profile"),
    # Tracking endpoints
    path("trackings/", TrackingListCreateView.as_view(), name="tracking-list-create"),
    path("trackings/<int:pk>/", TrackingDetailView.as_view(), name="tracking-detail"),
    path(
        "trackings/by-number/<str:tracking_number>/",
        TrackingRetrieveByNumberView.as_view(),
        name="tracking-by-number",
    ),
    # Shipping mark (permanent, one per user)
    path("shipping-marks/me/", MyShippingMarkView.as_view(), name="my-shipping-mark"),
    path("shipping-marks/", ShippingMarkListView.as_view(), name="shipping-mark-list"),
    # Dashboard tabs
    path("dashboard-tabs/", DashboardTabsView.as_view(), name="dashboard-tabs"),
    path(
        "dashboard-tabs/all/", DashboardTabsAllView.as_view(), name="dashboard-tabs-all"
    ),
    path(
        "dashboard-tabs/user/<int:user_id>/",
        DashboardTabsUserView.as_view(),
        name="dashboard-tabs-user",
    ),
    path(
        "dashboard-tabs/assign-user/",
        DashboardTabAssignUserView.as_view(),
        name="dashboard-tabs-assign-user",
    ),
    path(
        "dashboard-tabs/assign-role/",
        DashboardTabAssignRoleView.as_view(),
        name="dashboard-tabs-assign-role",
    ),
    path(
        "dashboard-tabs/sync-defaults/",
        DashboardTabsSyncView.as_view(),
        name="dashboard-tabs-sync",
    ),
    path(
        "dashboard-tabs/<slug:slug>/",
        DashboardTabDetailView.as_view(),
        name="dashboard-tabs-detail",
    ),
    # Product endpoints for storefront
    path("products/", ProductListView.as_view(), name="product-list"),
    path("products/<slug:slug>/", ProductDetailView.as_view(), name="product-detail"),
    # Product review endpoints
    path("product-reviews/", ProductReviewListView.as_view(), name="product-review-list"),
    path("product-reviews/<int:pk>/", ProductReviewDetailView.as_view(), name="product-review-detail"),
    # Order endpoints
    path("orders/", OrderListView.as_view(), name="order-list"),
    path("orders/<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
    # Admin order endpoints
    path("admin/analytics/", AdminAnalyticsView.as_view(), name="admin-analytics"),
    path("admin/orders/", AdminOrderListView.as_view(), name="admin-order-list"),
    # Category endpoints
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path("categories/<slug:slug>/", CategoryDetailView.as_view(), name="category-detail"),
    # Product Type endpoints
    path("product-types/", ProductTypeListView.as_view(), name="product-type-list"),
    path("product-types/<slug:slug>/", ProductTypeDetailView.as_view(), name="product-type-detail"),
    # Buy4me Request endpoints (User)
    path("buy4me-requests/", UserBuy4meRequestListView.as_view(), name="buy4me-request-list"),
    path("buy4me-requests/<int:pk>/", UserBuy4meRequestDetailView.as_view(), name="buy4me-request-detail"),
    # Buy4me Request endpoints (Admin)
    path("admin/buy4me-requests/", AdminBuy4meRequestListView.as_view(), name="admin-buy4me-request-list"),
    path("admin/buy4me-requests/<int:pk>/", AdminBuy4meRequestDetailView.as_view(), name="admin-buy4me-request-detail"),
    path("admin/buy4me-requests/<int:pk>/status/", AdminBuy4meRequestStatusView.as_view(), name="admin-buy4me-request-status"),
    path("admin/buy4me-requests/<int:pk>/tracking/", AdminBuy4meRequestTrackingView.as_view(), name="admin-buy4me-request-tracking"),
    path("admin/buy4me-requests/<int:pk>/invoice/", AdminBuy4meRequestInvoiceView.as_view(), name="admin-buy4me-request-invoice"),
    # Quick Order Product endpoints (Public)
    path("quick-order-products/", QuickOrderProductListView.as_view(), name="quick-order-product-list"),
    # Quick Order Product endpoints (Admin)
    path("admin/quick-order-products/", AdminQuickOrderProductListView.as_view(), name="admin-quick-order-product-list"),
    path("admin/quick-order-products/<int:pk>/", AdminQuickOrderProductDetailView.as_view(), name="admin-quick-order-product-detail"),
    # Shipping rates
    path("shipping-rates/", ShippingRateView.as_view(), name="shipping-rate"),
    path(
        "shipping-rates/all/", ShippingRateListView.as_view(), name="shipping-rate-list"
    ),
    # Admin notification endpoints
    path(
        "admin/notifications/send/",
        AdminSendNotificationView.as_view(),
        name="admin-send-notification",
    ),
    path(
        "admin/notifications/broadcast/",
        AdminBroadcastNotificationView.as_view(),
        name="admin-broadcast-notification",
    ),
    path(
        "admin/notifications/history/",
        NotificationHistoryView.as_view(),
        name="notification-history",
    ),
    path(
        "admin/notifications/me/",
        AdminNotificationsView.as_view(),
        name="admin-notifications",
    ),
    # User notification endpoint
    path(
        "notifications/me/",
        UserNotificationsView.as_view(),
        name="user-notifications",
    ),
    path(
        "notifications/<int:notification_id>/mark-read/",
        MarkNotificationReadView.as_view(),
        name="mark-notification-read",
    ),
    path(
        "notifications/<int:notification_id>/",
        DeleteNotificationView.as_view(),
        name="delete-notification",
    ),
    path(
        "notifications/mark-all-read/",
        MarkAllNotificationsReadView.as_view(),
        name="mark-all-notifications-read",
    ),
    path(
        "notifications/clear-all/",
        ClearAllNotificationsView.as_view(),
        name="clear-all-notifications",
    ),
    # Invoice (preview and send by mark and container)
    path(
        "invoices/preview/",
        InvoicePreviewView.as_view(),
        name="invoice-preview",
    ),
    path(
        "invoices/send/",
        InvoiceSendView.as_view(),
        name="invoice-send",
    ),
    # Invoice persistence
    path("invoices/", InvoiceListCreateView.as_view(), name="invoice-list-create"),
    path("invoices/<int:pk>/", InvoiceDetailView.as_view(), name="invoice-detail"),
    # Currency exchange rate
    path("currency-rate/", CurrencyRateView.as_view(), name="currency-rate"),
    path(
        "currency-rate/history/",
        CurrencyRateHistoryView.as_view(),
        name="currency-rate-history",
    ),
    # Alipay exchange rate
    path(
        "alipay-exchange-rate/",
        AlipayExchangeRateView.as_view(),
        name="alipay-exchange-rate",
    ),
    path(
        "alipay-exchange-rate/history/",
        AlipayExchangeRateHistoryView.as_view(),
        name="alipay-exchange-rate-history",
    ),
]
