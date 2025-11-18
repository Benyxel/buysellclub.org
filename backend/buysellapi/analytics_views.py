"""
Analytics views for admin dashboard.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.db.models import Sum, Count, Q, DecimalField
from django.db.models.functions import TruncDate, TruncMonth, TruncYear
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal

from .models import (
    Invoice,
    Container,
    AlipayPayment,
    Buy4meRequest,
    Order,
    UserModel,
)


def is_admin_user(user):
    """Check if user is admin."""
    is_admin = bool(
        getattr(user, "is_staff", False) or getattr(user, "is_superuser", False)
    )
    if not is_admin:
        try:
            profile = UserModel.objects.get(username=user.username)
            is_admin = profile.role == "admin"
        except UserModel.DoesNotExist:
            is_admin = False
    return is_admin


class AdminAnalyticsView(APIView):
    """
    GET /buysellapi/admin/analytics/
    Returns comprehensive analytics data for admin dashboard.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_admin_user(request.user):
            raise PermissionDenied("Admin access required")

        # Get date range filters (optional)
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        # Parse dates if provided
        date_filter = {}
        if start_date:
            try:
                date_filter["created_at__gte"] = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            except:
                pass
        if end_date:
            try:
                date_filter["created_at__lte"] = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            except:
                pass

        # 1. Shipping Management Analytics (Invoices by Container)
        shipping_analytics = self._get_shipping_analytics(date_filter)

        # 2. Alipay Management Analytics
        alipay_analytics = self._get_alipay_analytics(date_filter)

        # 3. Buy4me Analytics
        buy4me_analytics = self._get_buy4me_analytics(date_filter)

        # 4. Orders Analytics
        orders_analytics = self._get_orders_analytics(date_filter)

        # 5. Training Analytics (placeholder for future)
        training_analytics = {
            "total_bookings": 0,
            "total_revenue": 0,
            "message": "Training analytics will be available soon"
        }

        return Response({
            "shipping": shipping_analytics,
            "alipay": alipay_analytics,
            "buy4me": buy4me_analytics,
            "orders": orders_analytics,
            "training": training_analytics,
        })

    def _get_shipping_analytics(self, date_filter):
        """Get shipping/invoice analytics grouped by container."""
        # Get all invoices
        invoices = Invoice.objects.all()
        if date_filter:
            invoices = invoices.filter(**date_filter)

        # Total amount to be collected (all invoices)
        total_to_collect = invoices.aggregate(
            total=Sum("total_amount", output_field=DecimalField())
        )["total"] or Decimal("0.00")

        # Collected amount (paid invoices)
        collected = invoices.filter(status="paid").aggregate(
            total=Sum("total_amount", output_field=DecimalField())
        )["total"] or Decimal("0.00")

        # Remaining amount
        remaining = total_to_collect - collected

        # Group by container
        containers_data = []
        containers = Container.objects.all().order_by("-created_at")
        
        for container in containers:
            container_invoices = invoices.filter(container=container)
            container_total = container_invoices.aggregate(
                total=Sum("total_amount", output_field=DecimalField())
            )["total"] or Decimal("0.00")
            
            container_collected = container_invoices.filter(status="paid").aggregate(
                total=Sum("total_amount", output_field=DecimalField())
            )["total"] or Decimal("0.00")
            
            container_remaining = container_total - container_collected
            
            if container_total > 0:  # Only include containers with invoices
                containers_data.append({
                    "container_id": container.id,
                    "container_number": container.container_number,
                    "total_amount": float(container_total),
                    "collected": float(container_collected),
                    "remaining": float(container_remaining),
                    "invoice_count": container_invoices.count(),
                    "paid_count": container_invoices.filter(status="paid").count(),
                })

        return {
            "total_to_collect": float(total_to_collect),
            "collected": float(collected),
            "remaining": float(remaining),
            "containers": containers_data,
            "total_containers": len(containers_data),
        }

    def _get_alipay_analytics(self, date_filter):
        """Get Alipay payment analytics (daily, monthly, yearly)."""
        payments = AlipayPayment.objects.all()
        if date_filter:
            payments = payments.filter(**date_filter)

        # Filter completed payments for revenue calculations
        completed_payments = payments.filter(status="completed")

        # Daily payments (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        daily_payments = completed_payments.filter(
            completion_date__gte=thirty_days_ago
        ).annotate(
            date=TruncDate("completion_date")
        ).values("date").annotate(
            count=Count("id"),
            total_amount=Sum("converted_amount", output_field=DecimalField()),
            total_original=Sum("original_amount", output_field=DecimalField()),
        ).order_by("date")

        # Monthly payments (last 12 months)
        twelve_months_ago = timezone.now() - timedelta(days=365)
        monthly_payments = completed_payments.filter(
            completion_date__gte=twelve_months_ago
        ).annotate(
            month=TruncMonth("completion_date")
        ).values("month").annotate(
            count=Count("id"),
            total_amount=Sum("converted_amount", output_field=DecimalField()),
            total_original=Sum("original_amount", output_field=DecimalField()),
        ).order_by("month")

        # Yearly payments (all time)
        yearly_payments = completed_payments.annotate(
            year=TruncYear("completion_date")
        ).values("year").annotate(
            count=Count("id"),
            total_amount=Sum("converted_amount", output_field=DecimalField()),
            total_original=Sum("original_amount", output_field=DecimalField()),
        ).order_by("year")

        # Overall stats
        total_payments = payments.count()
        completed_count = completed_payments.count()
        pending_count = payments.filter(status="pending").count()
        processing_count = payments.filter(status="processing").count()
        rejected_count = payments.filter(status="rejected").count()

        total_revenue = completed_payments.aggregate(
            total=Sum("converted_amount", output_field=DecimalField())
        )["total"] or Decimal("0.00")

        return {
            "daily": [
                {
                    "date": str(item["date"]),
                    "count": item["count"],
                    "total_amount": float(item["total_amount"] or 0),
                    "total_original": float(item["total_original"] or 0),
                }
                for item in daily_payments
            ],
            "monthly": [
                {
                    "month": str(item["month"]),
                    "count": item["count"],
                    "total_amount": float(item["total_amount"] or 0),
                    "total_original": float(item["total_original"] or 0),
                }
                for item in monthly_payments
            ],
            "yearly": [
                {
                    "year": str(item["year"]),
                    "count": item["count"],
                    "total_amount": float(item["total_amount"] or 0),
                    "total_original": float(item["total_original"] or 0),
                }
                for item in yearly_payments
            ],
            "summary": {
                "total_payments": total_payments,
                "completed": completed_count,
                "pending": pending_count,
                "processing": processing_count,
                "rejected": rejected_count,
                "total_revenue": float(total_revenue),
            },
        }

    def _get_buy4me_analytics(self, date_filter):
        """Get Buy4me request analytics."""
        requests = Buy4meRequest.objects.all()
        if date_filter:
            requests = requests.filter(**date_filter)

        # Status breakdown
        status_counts = requests.values("status").annotate(
            count=Count("id")
        )

        # Total requests
        total_requests = requests.count()

        # Requests with invoices
        requests_with_invoices = requests.filter(invoice_created=True)
        total_invoiced = requests_with_invoices.count()
        
        # Total invoice amount
        total_invoice_amount = requests_with_invoices.aggregate(
            total=Sum("invoice_amount", output_field=DecimalField())
        )["total"] or Decimal("0.00")

        # Paid invoices
        paid_invoices = requests_with_invoices.filter(
            invoice_status="paid"
        )
        paid_count = paid_invoices.count()
        paid_amount = paid_invoices.aggregate(
            total=Sum("invoice_amount", output_field=DecimalField())
        )["total"] or Decimal("0.00")

        return {
            "total_requests": total_requests,
            "status_breakdown": {
                item["status"]: item["count"]
                for item in status_counts
            },
            "invoices": {
                "total_invoiced": total_invoiced,
                "total_amount": float(total_invoice_amount),
                "paid_count": paid_count,
                "paid_amount": float(paid_amount),
                "pending_amount": float(total_invoice_amount - paid_amount),
            },
        }

    def _get_orders_analytics(self, date_filter):
        """Get shop orders analytics."""
        orders = Order.objects.all()
        if date_filter:
            orders = orders.filter(**date_filter)

        # Status breakdown
        status_counts = orders.values("status").annotate(
            count=Count("id")
        )

        # Payment status breakdown
        payment_status_counts = orders.values("payment_status").annotate(
            count=Count("id")
        )

        # Total orders
        total_orders = orders.count()

        # Total revenue (paid orders)
        paid_orders = orders.filter(payment_status="paid")
        total_revenue = paid_orders.aggregate(
            total=Sum("total", output_field=DecimalField())
        )["total"] or Decimal("0.00")

        # Average order value
        avg_order_value = (
            float(total_revenue) / paid_orders.count()
            if paid_orders.count() > 0
            else 0.00
        )

        return {
            "total_orders": total_orders,
            "status_breakdown": {
                item["status"]: item["count"]
                for item in status_counts
            },
            "payment_status_breakdown": {
                item["payment_status"]: item["count"]
                for item in payment_status_counts
            },
            "revenue": {
                "total": float(total_revenue),
                "paid_orders": paid_orders.count(),
                "average_order_value": avg_order_value,
            },
        }

