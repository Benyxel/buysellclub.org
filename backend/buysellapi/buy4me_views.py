# Buy4me Request Views
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from .models import UserModel, Buy4meRequest
from .serializers import Buy4meRequestSerializer


def is_admin_user(user):
    """Check if a user is an admin (either is_staff or has role='admin' in UserModel)."""
    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return True
    try:
        profile = UserModel.objects.get(username=user.username)
        return profile.role == "admin"
    except UserModel.DoesNotExist:
        return False


class UserBuy4meRequestListView(generics.ListCreateAPIView):
    """List and create buy4me requests. Users can only see their own requests."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = Buy4meRequestSerializer
    
    def get_queryset(self):
        """Users can only see their own requests."""
        user = self.request.user
        try:
            user_profile = UserModel.objects.get(username=user.username)
            return Buy4meRequest.objects.filter(user=user_profile).order_by('-created_at')
        except UserModel.DoesNotExist:
            return Buy4meRequest.objects.none()
    
    def perform_create(self, serializer):
        """Associate the request with the current user and send email notifications."""
        user = self.request.user
        try:
            user_profile = UserModel.objects.get(username=user.username)
            buy4me_request = serializer.save(user=user_profile)
            
            # Send email notifications
            try:
                from buysellapi.email_utils import send_buy4me_order_confirmation_email, notify_admin_new_buy4me_order
                import logging
                
                logger = logging.getLogger(__name__)
                
                # Send confirmation email to user
                send_buy4me_order_confirmation_email(buy4me_request)
                logger.info(f"Buy4Me order confirmation email sent to {user_profile.email}")
                
                # Notify admins
                notify_admin_new_buy4me_order(buy4me_request)
                logger.info("Admin notification emails sent for new Buy4Me order")
            except Exception as e:
                logger.error(f"Failed to send Buy4Me order notification emails: {str(e)}", exc_info=True)
            
            return buy4me_request
        except UserModel.DoesNotExist:
            raise ValidationError({"user": "User profile not found"})


class UserBuy4meRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a buy4me request. Users can only access their own requests."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = Buy4meRequestSerializer
    
    def get_queryset(self):
        """Users can only access their own requests."""
        user = self.request.user
        try:
            user_profile = UserModel.objects.get(username=user.username)
            return Buy4meRequest.objects.filter(user=user_profile)
        except UserModel.DoesNotExist:
            return Buy4meRequest.objects.none()
    
    def put(self, request, *args, **kwargs):
        """Users can only update their own requests and only certain fields."""
        instance = self.get_object()
        data = request.data.copy()
        
        # Users can only update: title, description, product_url, additional_links, images, quantity, notes
        # They cannot update status, invoice fields
        allowed_fields = ['title', 'description', 'product_url', 'additional_links', 'images', 'quantity', 'notes']
        data = {k: v for k, v in data.items() if k in allowed_fields}
        
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def delete(self, request, *args, **kwargs):
        """Users can only delete their own requests if status is pending."""
        instance = self.get_object()
        if instance.status != 'pending':
            return Response(
                {"error": "Only pending requests can be deleted"},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().delete(request, *args, **kwargs)


class AdminBuy4meRequestListView(APIView):
    """Admin view to list all buy4me requests."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all buy4me requests (admin only)."""
        if not is_admin_user(request.user):
            return Response(
                {"error": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        requests = Buy4meRequest.objects.all().order_by('-created_at')
        serializer = Buy4meRequestSerializer(requests, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminBuy4meRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin view to retrieve, update, or delete any buy4me request."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = Buy4meRequestSerializer
    queryset = Buy4meRequest.objects.all()
    
    def get(self, request, *args, **kwargs):
        """Admin can retrieve any request."""
        if not is_admin_user(request.user):
            return Response(
                {"error": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().get(request, *args, **kwargs)
    
    def put(self, request, *args, **kwargs):
        """Admin can update any field."""
        if not is_admin_user(request.user):
            return Response(
                {"error": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().put(request, *args, **kwargs)
    
    def delete(self, request, *args, **kwargs):
        """Admin can delete any request."""
        if not is_admin_user(request.user):
            return Response(
                {"error": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().delete(request, *args, **kwargs)


class AdminBuy4meRequestStatusView(APIView):
    """Admin view to update buy4me request status."""
    
    permission_classes = [IsAuthenticated]
    
    def put(self, request, pk):
        """Update request status."""
        if not is_admin_user(request.user):
            return Response(
                {"error": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            buy4me_request = Buy4meRequest.objects.get(pk=pk)
        except Buy4meRequest.DoesNotExist:
            return Response(
                {"error": "Request not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        new_status = request.data.get('status')
        if not new_status:
            return Response(
                {"error": "Status is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        valid_statuses = [choice[0] for choice in Buy4meRequest.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        buy4me_request.status = new_status
        buy4me_request.save()
        
        serializer = Buy4meRequestSerializer(buy4me_request)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminBuy4meRequestTrackingView(APIView):
    """Admin view to update buy4me request tracking status."""
    
    permission_classes = [IsAuthenticated]
    
    def put(self, request, pk):
        """Update tracking status."""
        if not is_admin_user(request.user):
            return Response(
                {"error": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            buy4me_request = Buy4meRequest.objects.get(pk=pk)
        except Buy4meRequest.DoesNotExist:
            return Response(
                {"error": "Request not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        new_tracking_status = request.data.get('tracking_status')
        if not new_tracking_status:
            return Response(
                {"error": "tracking_status is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        valid_statuses = [choice[0] for choice in Buy4meRequest.TRACKING_STATUS_CHOICES]
        if new_tracking_status not in valid_statuses:
            return Response(
                {"error": f"Invalid tracking status. Must be one of: {', '.join(valid_statuses)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        buy4me_request.tracking_status = new_tracking_status
        buy4me_request.save()
        
        serializer = Buy4meRequestSerializer(buy4me_request)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminBuy4meRequestInvoiceView(APIView):
    """Admin view to create or update invoice for buy4me request."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        """Create invoice for a buy4me request."""
        if not is_admin_user(request.user):
            return Response(
                {"error": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            buy4me_request = Buy4meRequest.objects.get(pk=pk)
        except Buy4meRequest.DoesNotExist:
            return Response(
                {"error": "Request not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if buy4me_request.status != 'approved':
            return Response(
                {"error": "Invoice can only be created for approved requests"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        invoice_amount = request.data.get('amount')
        if not invoice_amount:
            return Response(
                {"error": "Invoice amount is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            invoice_amount = float(invoice_amount)
            if invoice_amount <= 0:
                raise ValueError("Amount must be positive")
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid invoice amount"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate invoice number
        import datetime
        invoice_number = f"INV-{datetime.datetime.now().strftime('%Y%m%d')}-{buy4me_request.id:04d}"
        
        buy4me_request.invoice_created = True
        buy4me_request.invoice_number = invoice_number
        buy4me_request.invoice_amount = invoice_amount
        buy4me_request.invoice_status = 'pending'
        buy4me_request.save()
        
        serializer = Buy4meRequestSerializer(buy4me_request)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def put(self, request, pk):
        """Update invoice status."""
        if not is_admin_user(request.user):
            return Response(
                {"error": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            buy4me_request = Buy4meRequest.objects.get(pk=pk)
        except Buy4meRequest.DoesNotExist:
            return Response(
                {"error": "Request not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not buy4me_request.invoice_created:
            return Response(
                {"error": "Invoice not created yet"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        new_status = request.data.get('status')
        if not new_status:
            return Response(
                {"error": "Invoice status is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        valid_statuses = [choice[0] for choice in Buy4meRequest.INVOICE_STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {"error": f"Invalid invoice status. Must be one of: {', '.join(valid_statuses)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        buy4me_request.invoice_status = new_status
        buy4me_request.save()
        
        serializer = Buy4meRequestSerializer(buy4me_request)
        return Response(serializer.data, status=status.HTTP_200_OK)

