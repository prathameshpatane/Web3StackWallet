# wallet/views.py — REPLACE your entire file

import decimal
from django.db import transaction as db_transaction
from rest_framework import generics, permissions, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import UserWallet
from coins.models import Coin
from transactions.models import Transaction


# ── Helpers ───────────────────────────────────────────────────
def coin_price_usd(coin: Coin) -> float:
    """Returns USD price of coin. Works for both CoinGecko and manual coins."""
    try:
        return float(coin.current_price_usd)
    except Exception:
        return 0.0


def coin_rate(coin: Coin) -> float:
    try:
        r = float(coin.usd_to_inr_rate)
        return r if r > 0 else 83.5
    except Exception:
        return 83.5


# ── Serializers ───────────────────────────────────────────────
class CoinInWalletSerializer(serializers.ModelSerializer):
    current_price_usd = serializers.SerializerMethodField()
    current_price_inr = serializers.SerializerMethodField()
    usd_to_inr_rate   = serializers.SerializerMethodField()

    class Meta:
        model  = Coin
        fields = (
            'id', 'symbol', 'name', 'image_url',
            'current_price_usd', 'current_price_inr',
            'price_change_24h_pct', 'usd_to_inr_rate',
        )

    def get_current_price_usd(self, obj):
        return coin_price_usd(obj)

    def get_current_price_inr(self, obj):
        return round(coin_price_usd(obj) * coin_rate(obj), 2)

    def get_usd_to_inr_rate(self, obj):
        return coin_rate(obj)


class WalletSerializer(serializers.ModelSerializer):
    coin         = CoinInWalletSerializer(read_only=True)
    value_in_usd = serializers.SerializerMethodField()
    value_in_inr = serializers.SerializerMethodField()

    class Meta:
        model  = UserWallet
        fields = ('id', 'coin', 'balance', 'value_in_usd', 'value_in_inr')

    def get_value_in_usd(self, obj):
        try:
            return round(float(obj.balance) * coin_price_usd(obj.coin), 4)
        except Exception:
            return 0.0

    def get_value_in_inr(self, obj):
        try:
            usd = float(obj.balance) * coin_price_usd(obj.coin)
            return round(usd * coin_rate(obj.coin), 2)
        except Exception:
            return 0.0


# ── Views ─────────────────────────────────────────────────────
class WalletListView(generics.ListAPIView):
    """GET /api/wallet/ — user coin holdings, includes ALL coins even price=0"""
    serializer_class   = WalletSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class   = None

    def get_queryset(self):
        # Show all coins with balance > 0 regardless of price
        return (
            UserWallet.objects
            .filter(user=self.request.user, balance__gt=0)
            .select_related('coin')
            .order_by('-balance')
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def buy_coin(request):
    """
    POST /api/wallet/buy/
    Body: { "coin_id": <int>, "usd_amount": <float> }
    """
    user       = request.user
    coin_id    = request.data.get('coin_id')
    usd_amount = decimal.Decimal(str(request.data.get('usd_amount', 0)))

    if usd_amount <= 0:
        return Response({'error': 'Amount must be greater than $0.'}, status=400)

    try:
        coin = Coin.objects.get(id=coin_id, is_active=True)
    except Coin.DoesNotExist:
        return Response({'error': 'Coin not found.'}, status=404)

    price_usd = decimal.Decimal(str(coin_price_usd(coin)))
    if price_usd <= 0:
        return Response({
            'error': f'{coin.name} has no price set. Ask admin to set the price in admin panel.'
        }, status=400)

    fee        = usd_amount * decimal.Decimal('0.001')   # 0.1%
    total_cost = usd_amount + fee

    if user.usd_balance < total_cost:
        return Response({
            'error': f'Insufficient balance. Need ${float(total_cost):.2f}, have ${float(user.usd_balance):.2f}. Ask admin to add funds.'
        }, status=400)

    coin_qty = usd_amount / price_usd

    with db_transaction.atomic():
        user.usd_balance -= total_cost
        user.save(update_fields=['usd_balance'])

        wallet, _ = UserWallet.objects.get_or_create(user=user, coin=coin)
        wallet.balance += coin_qty
        wallet.save(update_fields=['balance'])

        Transaction.objects.create(
            user              = user,
            type              = 'buy',
            coin              = coin,
            coin_amount       = coin_qty,
            usd_amount        = usd_amount,
            inr_amount        = usd_amount * decimal.Decimal(str(coin_rate(coin))),
            price_at_time_usd = price_usd,
            fee_usd           = fee,
            status            = 'completed',
        )

    return Response({
        'message':         f'✅ Bought {float(coin_qty):.6f} {coin.symbol}',
        'coin_amount':     str(coin_qty),
        'usd_spent':       str(total_cost),
        'new_usd_balance': str(user.usd_balance),
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def sell_coin(request):
    """
    POST /api/wallet/sell/
    Body: { "coin_id": <int>, "coin_amount": <float> }
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
        return Response({'error': f'You don\'t hold any {coin.symbol}.'}, status=404)

    if wallet.balance < coin_amount:
        return Response({
            'error': f'Insufficient {coin.symbol}. You have {float(wallet.balance):.6f}.'
        }, status=400)

    price_usd  = decimal.Decimal(str(coin_price_usd(coin)))
    if price_usd <= 0:
        return Response({
            'error': f'{coin.name} has no price. Ask admin to set price before selling.'
        }, status=400)

    usd_gross  = coin_amount * price_usd
    fee        = usd_gross * decimal.Decimal('0.001')
    usd_net    = usd_gross - fee

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
        'usd_received':    str(usd_net),
        'new_usd_balance': str(user.usd_balance),
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def convert_to_inr(request):
    """POST /api/wallet/convert-to-inr/ — preview only, no DB change"""
    usd_amount = float(request.data.get('usd_amount', 0))
    coin       = Coin.objects.filter(is_active=True, usd_to_inr_rate__gt=0).first()
    rate       = float(coin.usd_to_inr_rate) if coin else 83.5
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
    Body: { "usd_amount": <float>, "method": "upi|neft", "bank_account": "..." }
    Converts user's USD balance → INR and creates withdrawal request
    """
    user       = request.user
    usd_amount = decimal.Decimal(str(request.data.get('usd_amount', 0)))
    method     = request.data.get('method', 'upi')
    account    = request.data.get('bank_account', '')

    if usd_amount <= 0:
        return Response({'error': 'Amount must be greater than $0.'}, status=400)

    if user.usd_balance < usd_amount:
        return Response({
            'error': f'Insufficient USD balance. Have ${float(user.usd_balance):.2f}.'
        }, status=400)

    coin      = Coin.objects.filter(is_active=True, usd_to_inr_rate__gt=0).first()
    rate      = decimal.Decimal(str(float(coin.usd_to_inr_rate) if coin else 83.5))
    inr_gross = usd_amount * rate
    fee_inr   = inr_gross * decimal.Decimal('0.002')   # 0.2% withdrawal fee
    inr_net   = inr_gross - fee_inr

    with db_transaction.atomic():
        user.usd_balance -= usd_amount
        user.save(update_fields=['usd_balance'])

        Transaction.objects.create(
            user       = user,
            type       = 'withdraw',
            usd_amount = usd_amount,
            inr_amount = inr_gross,
            fee_usd    = usd_amount * decimal.Decimal('0.002'),
            status     = 'pending',
            notes      = f'Withdraw via {method} to: {account}',
        )

    return Response({
        'message':        '✅ Withdrawal request submitted',
        'usd_debited':    str(usd_amount),
        'inr_to_receive': str(round(inr_net, 2)),
        'rate_used':      str(rate),
        'status':         'pending',
        'note':           'Admin will process within 1-3 business days',
    })