# wallet/views.py — ADD buy_request view + fix withdraw validation

import decimal
from django.db import transaction as db_transaction
from rest_framework import generics, permissions, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import UserWallet, BuyRequest
from coins.models import Coin
from transactions.models import Transaction


# ── Helpers ───────────────────────────────────────────────────
def coin_price_usd(coin):
    try: return float(coin.current_price_usd)
    except: return 0.0

def coin_rate(coin):
    try:
        r = float(coin.usd_to_inr_rate)
        return r if r > 0 else 83.5
    except: return 83.5


# ── Serializers ───────────────────────────────────────────────
class CoinInWalletSerializer(serializers.ModelSerializer):
    current_price_usd = serializers.SerializerMethodField()
    current_price_inr = serializers.SerializerMethodField()
    usd_to_inr_rate   = serializers.SerializerMethodField()

    class Meta:
        model  = Coin
        fields = ('id', 'symbol', 'name', 'image_url',
                  'current_price_usd', 'current_price_inr',
                  'price_change_24h_pct', 'usd_to_inr_rate')

    def get_current_price_usd(self, obj): return coin_price_usd(obj)
    def get_current_price_inr(self, obj): return round(coin_price_usd(obj) * coin_rate(obj), 2)
    def get_usd_to_inr_rate(self, obj):   return coin_rate(obj)


class WalletSerializer(serializers.ModelSerializer):
    coin         = CoinInWalletSerializer(read_only=True)
    value_in_usd = serializers.SerializerMethodField()
    value_in_inr = serializers.SerializerMethodField()

    class Meta:
        model  = UserWallet
        fields = ('id', 'coin', 'balance', 'value_in_usd', 'value_in_inr')

    def get_value_in_usd(self, obj):
        try: return round(float(obj.balance) * coin_price_usd(obj.coin), 4)
        except: return 0.0

    def get_value_in_inr(self, obj):
        try: return round(float(obj.balance) * coin_price_usd(obj.coin) * coin_rate(obj.coin), 2)
        except: return 0.0


class BuyRequestSerializer(serializers.ModelSerializer):
    coin_symbol = serializers.SerializerMethodField()
    coin_name   = serializers.SerializerMethodField()
    coin_image  = serializers.SerializerMethodField()

    class Meta:
        model  = BuyRequest
        fields = (
            'id', 'coin_symbol', 'coin_name', 'coin_image',
            'usd_amount', 'inr_amount', 'coin_quantity', 'coin_price_usd',
            'transaction_id', 'status', 'admin_note', 'created_at',
        )

    def get_coin_symbol(self, obj): return obj.coin.symbol
    def get_coin_name(self, obj):   return obj.coin.name
    def get_coin_image(self, obj):  return obj.coin.image_url


# ── Views ─────────────────────────────────────────────────────
class WalletListView(generics.ListAPIView):
    """GET /api/wallet/"""
    serializer_class   = WalletSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class   = None

    def get_queryset(self):
        return (
            UserWallet.objects
            .filter(user=self.request.user, balance__gt=0)
            .select_related('coin')
            .order_by('-balance')
        )


class BuyRequestListView(generics.ListAPIView):
    """GET /api/wallet/buy-requests/ — user's buy request history"""
    serializer_class   = BuyRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class   = None

    def get_queryset(self):
        return BuyRequest.objects.filter(user=self.request.user)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_buy_request(request):
    """
    POST /api/wallet/buy-request/
    Multipart form: coin_id, usd_amount, inr_amount, transaction_id, screenshot
    """
    user = request.user

    coin_id        = request.data.get('coin_id')
    usd_amount     = decimal.Decimal(str(request.data.get('usd_amount', 0)))
    inr_amount     = decimal.Decimal(str(request.data.get('inr_amount', 0)))
    transaction_id = request.data.get('transaction_id', '').strip()
    screenshot     = request.FILES.get('screenshot')

    # Validations
    if not coin_id:
        return Response({'error': 'coin_id is required'}, status=400)
    if usd_amount <= 0:
        return Response({'error': 'usd_amount must be greater than 0'}, status=400)
    if not transaction_id:
        return Response({'error': 'transaction_id is required'}, status=400)
    if not screenshot:
        return Response({'error': 'Payment screenshot is required'}, status=400)

    # Check for duplicate transaction ID
    if BuyRequest.objects.filter(transaction_id=transaction_id).exists():
        return Response({'error': 'This transaction ID has already been submitted'}, status=400)

    try:
        coin = Coin.objects.get(id=coin_id, is_active=True)
    except Coin.DoesNotExist:
        return Response({'error': 'Coin not found'}, status=404)

    price_usd    = decimal.Decimal(str(coin_price_usd(coin)))
    fee          = usd_amount * decimal.Decimal('0.001')
    net_usd      = usd_amount - fee
    coin_qty     = net_usd / price_usd if price_usd > 0 else decimal.Decimal('0')

    buy_req = BuyRequest.objects.create(
        user           = user,
        coin           = coin,
        usd_amount     = usd_amount,
        inr_amount     = inr_amount,
        coin_quantity  = coin_qty,
        coin_price_usd = price_usd,
        transaction_id = transaction_id,
        screenshot     = screenshot,
        status         = 'pending',
    )

    return Response({
        'id':            buy_req.id,
        'message':       f'Buy request submitted. You will receive {float(coin_qty):.6f} {coin.symbol} after admin approval.',
        'coin_quantity': str(coin_qty),
        'coin_symbol':   coin.symbol,
        'status':        'pending',
    }, status=201)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def convert_to_inr(request):
    """POST /api/wallet/convert-to-inr/"""
    usd_amount = float(request.data.get('usd_amount', 0))
    coin       = Coin.objects.filter(is_active=True, usd_to_inr_rate__gt=0).first()
    rate       = coin_rate(coin) if coin else 83.5
    return Response({
        'usd_amount': usd_amount,
        'inr_amount': round(usd_amount * rate, 2),
        'rate':       rate,
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def withdraw_inr(request):
    """
    POST /api/wallet/withdraw-inr/
    Validates user has enough USD balance before creating withdrawal
    """
    user       = request.user
    usd_amount = decimal.Decimal(str(request.data.get('usd_amount', 0)))
    method     = request.data.get('method', 'upi')
    account    = request.data.get('bank_account', '')

    if usd_amount <= 0:
        return Response({'error': 'Amount must be greater than $0.'}, status=400)

    # ── STRICT BALANCE CHECK ──────────────────────────────────
    if user.usd_balance < usd_amount:
        return Response({
            'error': f'Insufficient USD balance. You have ${float(user.usd_balance):.2f} but requested ${float(usd_amount):.2f}.'
        }, status=400)

    if not account.strip():
        return Response({'error': 'Bank account / UPI ID is required.'}, status=400)

    coin     = Coin.objects.filter(is_active=True, usd_to_inr_rate__gt=0).first()
    rate     = decimal.Decimal(str(coin_rate(coin) if coin else 83.5))
    inr_amt  = usd_amount * rate
    fee_inr  = inr_amt * decimal.Decimal('0.002')
    net_inr  = inr_amt - fee_inr

    with db_transaction.atomic():
        user.usd_balance -= usd_amount
        user.save(update_fields=['usd_balance'])

        Transaction.objects.create(
            user       = user,
            type       = 'withdraw',
            usd_amount = usd_amount,
            inr_amount = inr_amt,
            fee_usd    = usd_amount * decimal.Decimal('0.002'),
            status     = 'pending',
            notes      = f'Withdraw via {method} to: {account}',
        )

    return Response({
        'message':        '✅ Withdrawal request submitted',
        'usd_debited':    str(usd_amount),
        'inr_to_receive': str(round(net_inr, 2)),
        'rate_used':      str(rate),
        'status':         'pending',
    })