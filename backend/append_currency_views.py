# Script to append currency rate views to views.py

code_to_append = '''

class CurrencyRateView(APIView):
    """
    GET: Get current exchange rate
    POST: Update exchange rate (admin only)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get the current USD to GHS exchange rate."""
        from .models import CurrencyRate
        from .serializers import CurrencyRateSerializer
        
        latest = CurrencyRate.objects.first()
        if latest:
            serializer = CurrencyRateSerializer(latest)
            return Response(serializer.data)
        else:
            # Return default rate if none exists
            return Response({
                'usd_to_ghs': 12.0,
                'notes': 'Default rate - no rate set yet'
            })
    
    def post(self, request):
        """Update the exchange rate (admin only)."""
        # Admin check
        django_user = getattr(request, "user", None)
        is_admin = bool(
            getattr(django_user, "is_staff", False)
            or getattr(django_user, "is_superuser", False)
        )
        if (
            not is_admin
            and django_user
            and getattr(django_user, "is_authenticated", False)
        ):
            try:
                profile = UserModel.objects.get(username=django_user.username)
                is_admin = profile.role == "admin"
            except UserModel.DoesNotExist:
                is_admin = False
        if not is_admin:
            raise PermissionDenied("Admin access required")
        
        from .models import CurrencyRate
        from .serializers import CurrencyRateSerializer
        
        # Get UserModel instance for updated_by
        updated_by_user = None
        if django_user and getattr(django_user, "is_authenticated", False):
            try:
                updated_by_user = UserModel.objects.get(username=django_user.username)
            except UserModel.DoesNotExist:
                pass
        
        # Create new rate
        serializer = CurrencyRateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(updated_by=updated_by_user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CurrencyRateHistoryView(APIView):
    """GET: Get history of exchange rate changes (admin only)."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Admin check
        django_user = getattr(request, "user", None)
        is_admin = bool(
            getattr(django_user, "is_staff", False)
            or getattr(django_user, "is_superuser", False)
        )
        if (
            not is_admin
            and django_user
            and getattr(django_user, "is_authenticated", False)
        ):
            try:
                profile = UserModel.objects.get(username=django_user.username)
                is_admin = profile.role == "admin"
            except UserModel.DoesNotExist:
                is_admin = False
        if not is_admin:
            raise PermissionDenied("Admin access required")
        
        from .models import CurrencyRate
        from .serializers import CurrencyRateSerializer
        
        rates = CurrencyRate.objects.all()[:20]  # Last 20 changes
        serializer = CurrencyRateSerializer(rates, many=True)
        return Response(serializer.data)
'''

# Append to views.py
with open("buysellapi/views.py", "a", encoding="utf-8") as f:
    f.write(code_to_append)

print("Currency rate views appended successfully!")
