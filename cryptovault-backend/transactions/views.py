# transactions/views.py

from rest_framework import generics, permissions, serializers
from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    coin_symbol = serializers.SerializerMethodField()
    coin_name   = serializers.SerializerMethodField()
    coin_image  = serializers.SerializerMethodField()

    class Meta:
        model  = Transaction
        fields = (
            'id', 'type',
            'coin_symbol', 'coin_name', 'coin_image',
            'coin_amount', 'usd_amount', 'inr_amount',
            'price_at_time_usd', 'fee_usd',
            'status', 'notes', 'created_at',
        )

    def get_coin_symbol(self, obj):
        return obj.coin.symbol if obj.coin else None

    def get_coin_name(self, obj):
        return obj.coin.name if obj.coin else None

    def get_coin_image(self, obj):
        return obj.coin.image_url if obj.coin else None


class TransactionListView(generics.ListAPIView):
    """GET /api/transactions/"""
    serializer_class   = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(
            user=self.request.user
        ).select_related('coin').order_by('-created_at')