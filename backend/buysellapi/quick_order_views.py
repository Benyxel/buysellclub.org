# Quick Order Product Views
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from .models import QuickOrderProduct
from .serializers import QuickOrderProductSerializer


def is_admin_user(user):
    """Check if a user is an admin (either is_staff or has role='admin' in UserModel)."""
    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return True
    try:
        from .models import UserModel
        profile = UserModel.objects.get(username=user.username)
        return profile.role == "admin"
    except UserModel.DoesNotExist:
        return False


class QuickOrderProductListView(generics.ListAPIView):
    """Public view to list active quick order products (no authentication required)."""
    
    serializer_class = QuickOrderProductSerializer
    
    def get_queryset(self):
        """Return only active quick order products."""
        return QuickOrderProduct.objects.filter(is_active=True).order_by('-created_at')


class AdminQuickOrderProductListView(generics.ListCreateAPIView):
    """Admin view to list and create quick order products."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = QuickOrderProductSerializer
    
    def get_queryset(self):
        """Return all quick order products for admin."""
        if not is_admin_user(self.request.user):
            return QuickOrderProduct.objects.none()
        return QuickOrderProduct.objects.all().order_by('-created_at')
    
    def perform_create(self, serializer):
        """Create a new quick order product."""
        if not is_admin_user(self.request.user):
            raise ValidationError({"error": "Admin access required"})
        serializer.save()


class AdminQuickOrderProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin view to retrieve, update, or delete a quick order product."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = QuickOrderProductSerializer
    
    def get_queryset(self):
        """Return all quick order products for admin."""
        if not is_admin_user(self.request.user):
            return QuickOrderProduct.objects.none()
        return QuickOrderProduct.objects.all()
    
    def perform_update(self, serializer):
        """Update a quick order product."""
        if not is_admin_user(self.request.user):
            raise ValidationError({"error": "Admin access required"})
        serializer.save()
    
    def perform_destroy(self, instance):
        """Delete a quick order product."""
        if not is_admin_user(self.request.user):
            raise ValidationError({"error": "Admin access required"})
        instance.delete()

