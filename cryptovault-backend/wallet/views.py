import decimal
from django.db import transaction as db_transaction
from rest_framework import generics, permissions, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.request import Request
from .models import UserWallet, BuyRequest, PaymentSettings
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
    """GET /api/wallet/buy-requests/ — user sees their own buy request history"""
    serializer_class   = BuyRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class   = None

    def get_queryset(self):
        return BuyRequest.objects.filter(user=self.request.user)


# Replace ONLY the get_payment_settings view in wallet/views.py

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_payment_settings(request):
    """
    GET /api/wallet/payment-settings/
    Returns UPI + Bank details for frontend payment page.
    """
    from django.conf import settings as django_settings

    settings_obj = PaymentSettings.get_settings()

    # Build absolute QR URL using the backend's own domain
    qr_url = None
    if settings_obj.qr_image:
        backend_url = getattr(django_settings, 'BACKEND_URL', '').rstrip('/')
        if backend_url:
            # Production: use BACKEND_URL env variable
            qr_url = f"{backend_url}{settings_obj.qr_image.url}"
        else:
            # Fallback: build from request (works on localhost)
            qr_url = request.build_absolute_uri(settings_obj.qr_image.url)

    return Response({
        # UPI
        'upi_id':       settings_obj.upi_id,
        'upi_name':     settings_obj.upi_name,
        'phone_number': settings_obj.phone_number,
        'qr_image_url': qr_url,
        # Bank
        'bank_name':            settings_obj.bank_name,
        'bank_branch':          settings_obj.bank_branch,
        'account_holder_name':  settings_obj.account_holder_name,
        'account_number':       settings_obj.account_number,
        'ifsc_code':            settings_obj.ifsc_code,
        # General
        'payment_note': settings_obj.payment_note,
        'is_active':    settings_obj.is_active,
    })

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_buy_request(request):
    """
    POST /api/wallet/buy/
    Multipart form: coin_id, usd_amount, inr_amount, transaction_id, screenshot
    """
    user = request.user

    coin_id        = request.data.get('coin_id')
    usd_amount     = decimal.Decimal(str(request.data.get('usd_amount', 0)))
    inr_amount     = decimal.Decimal(str(request.data.get('inr_amount', 0)))
    transaction_id = request.data.get('transaction_id', '').strip()
    screenshot     = request.FILES.get('screenshot')

    if not coin_id:
        return Response({'error': 'coin_id is required'}, status=400)
    if usd_amount <= 0:
        return Response({'error': 'usd_amount must be greater than 0'}, status=400)
    if not transaction_id:
        return Response({'error': 'transaction_id is required'}, status=400)
    if not screenshot:
        return Response({'error': 'Payment screenshot is required'}, status=400)

    if BuyRequest.objects.filter(transaction_id=transaction_id).exists():
        return Response({'error': 'This transaction ID has already been submitted'}, status=400)

    try:
        coin = Coin.objects.get(id=coin_id, is_active=True)
    except Coin.DoesNotExist:
        return Response({'error': 'Coin not found'}, status=404)

    price_usd = decimal.Decimal(str(coin_price_usd(coin)))
    fee       = usd_amount * decimal.Decimal('0.001')
    net_usd   = usd_amount - fee
    coin_qty  = net_usd / price_usd if price_usd > 0 else decimal.Decimal('0')

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
def sell_coin(request):
    """
    POST /api/wallet/sell/
    Body: { "coin_id": <int>, "coin_amount": <float> }
    Sells coins → adds USD to user's usd_balance
    """
    user        = request.user
    coin_id     = request.data.get('coin_id')
    coin_amount = decimal.Decimal(str(request.data.get('coin_amount', 0)))

    if coin_amount <= 0:
        return Response({'error': 'Amount must be greater than 0.'}, status=400)

    try:
        coin   = Coin.objects.get(id=coin_id, is_active=True)
        wallet = UserWallet.objects.get(user=user, coin=coin)
    except Coin.DoesNotExist:
        return Response({'error': 'Coin not found.'}, status=404)
    except UserWallet.DoesNotExist:
        return Response({'error': f"You don't hold any {coin.symbol}."}, status=404)

    if wallet.balance < coin_amount:
        return Response({
            'error': f'Insufficient {coin.symbol}. You have {float(wallet.balance):.6f}.'
        }, status=400)

    price_usd = decimal.Decimal(str(coin_price_usd(coin)))
    if price_usd <= 0:
        return Response({
            'error': f'{coin.name} has no price. Ask admin to set price.'
        }, status=400)

    usd_gross = coin_amount * price_usd
    fee       = usd_gross * decimal.Decimal('0.001')
    usd_net   = usd_gross - fee

    with db_transaction.atomic():
        wallet.balance -= coin_amount
        wallet.save(update_fields=['balance'])

        user.usd_balance += usd_net
        user.save(update_fields=['usd_balance'])

        Transaction.objects.create(
            user              = user,
            type              = 'sell',
            coin              = coin,
            coin_amount       = coin_amount,
            usd_amount        = usd_gross,
            inr_amount        = usd_gross * decimal.Decimal(str(coin_rate(coin))),
            price_at_time_usd = price_usd,
            fee_usd           = fee,
            status            = 'completed',
        )

    return Response({
        'message':         f'✅ Sold {float(coin_amount):.6f} {coin.symbol}',
        'usd_received':    str(round(usd_net, 4)),
        'new_usd_balance': str(round(user.usd_balance, 4)),
    })


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
    """POST /api/wallet/withdraw-inr/"""
    user       = request.user
    usd_amount = decimal.Decimal(str(request.data.get('usd_amount', 0)))
    method     = request.data.get('method', 'upi')
    account    = request.data.get('bank_account', '')

    if usd_amount <= 0:
        return Response({'error': 'Amount must be greater than $0.'}, status=400)

    if user.usd_balance < usd_amount:
        return Response({
            'error': f'Insufficient USD balance. You have ${float(user.usd_balance):.2f}.'
        }, status=400)

    if not account.strip():
        return Response({'error': 'Bank account / UPI ID is required.'}, status=400)

    coin    = Coin.objects.filter(is_active=True, usd_to_inr_rate__gt=0).first()
    rate    = decimal.Decimal(str(coin_rate(coin) if coin else 83.5))
    inr_amt = usd_amount * rate
    fee_inr = inr_amt * decimal.Decimal('0.002')
    net_inr = inr_amt - fee_inr

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