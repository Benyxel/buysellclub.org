from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from buysellapi.views import (
    UserCreateView,
    CustomTokenObtainPairView,
    AdminShippingAddressListCreateView,
    AdminShippingAddressDetailView,
    AdminDefaultBaseAddressView,
    AdminShippingMarksListView,
    AdminContainerListView,
    AdminContainerDetailView,
    ContainerMarkStatsView,
    AdminAlipayPaymentsView,
    AdminAlipayPaymentDetailView,
    AdminAlipayPaymentStatusView,
    PublicAlipayPaymentCreateView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("buysellapi/user/register/", UserCreateView.as_view(), name="user-register"),
    path("buysellapi/token/", CustomTokenObtainPairView.as_view(), name="get_token"),
    path("buysellapi/token/refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("buysellapi-auth/", include("rest_framework.urls")),
    path("buysellapi/", include("buysellapi.urls")),
    # Admin shipping address management endpoints
    path(
        "api/admin/shipping-marks",
        AdminShippingAddressListCreateView.as_view(),
        name="admin-shipping-marks",
    ),
    path(
        "api/admin/shipping-marks/<int:pk>",
        AdminShippingAddressDetailView.as_view(),
        name="admin-shipping-marks-detail",
    ),
    path(
        "api/admin/default-base-address",
        AdminDefaultBaseAddressView.as_view(),
        name="admin-default-base-address",
    ),
    path(
        "api/admin/shipping-marks-list",
        AdminShippingMarksListView.as_view(),
        name="admin-shipping-marks-list",
    ),
    # Container management endpoints
    path(
        "api/admin/containers",
        AdminContainerListView.as_view(),
        name="admin-containers",
    ),
    path(
        "api/admin/containers/<int:container_id>",
        AdminContainerDetailView.as_view(),
        name="admin-container-detail",
    ),
    path(
        "api/admin/containers/<int:container_id>/mark-stats",
        ContainerMarkStatsView.as_view(),
        name="container-mark-stats",
    ),
    # Alipay admin endpoints
    path(
        "api/admin/alipay-payments",
        AdminAlipayPaymentsView.as_view(),
        name="admin-alipay-payments",
    ),
    path(
        "api/admin/alipay-payments/<int:pk>",
        AdminAlipayPaymentDetailView.as_view(),
        name="admin-alipay-payment-detail",
    ),
    path(
        "api/admin/alipay-payments/<int:pk>/status",
        AdminAlipayPaymentStatusView.as_view(),
        name="admin-alipay-payment-status",
    ),
    # Public Alipay submission
    path(
        "api/alipay-payments",
        PublicAlipayPaymentCreateView.as_view(),
        name="public-alipay-payment-create",
    ),
]
