# coins/views.py — REPLACE your entire file

import requests
from django.utils import timezone
from django.conf import settings
from rest_framework import generics, permissions, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Coin


class CoinSerializer(serializers.ModelSerializer):
    current_price_inr = serializers.SerializerMethodField()

    class Meta:
        model  = Coin
        fields = (
            'id', 'coingecko_id', 'symbol', 'name', 'image_url',
            'current_price_usd', 'current_price_inr',
            'price_change_24h_pct', 'price_change_24h_usd',
            'market_cap_usd', 'volume_24h_usd',
            'high_24h_usd', 'low_24h_usd',
            'circulating_supply', 'usd_to_inr_rate',
            'last_updated', 'is_active',
        )

    def get_current_price_inr(self, obj):
        return obj.current_price_inr


class MarketListView(generics.ListAPIView):
    """GET /api/coins/market/ — all active coins, public"""
    queryset           = Coin.objects.filter(is_active=True)
    serializer_class   = CoinSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class   = None


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_usd_to_inr(request):
    """GET /api/coins/usd-to-inr/"""
    coin = Coin.objects.filter(is_active=True, usd_to_inr_rate__gt=0).first()
    rate = float(coin.usd_to_inr_rate) if coin else 83.5
    return Response({'usd_to_inr': rate})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])   # allow frontend refresh button
def refresh_prices(request):
    """POST /api/coins/refresh-prices/"""
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    secret_key = getattr(settings, 'REFRESH_PRICES_SECRET', None)
    
    if secret_key and auth_header:
        token = auth_header.replace('Bearer ', '').strip()
        if token != secret_key:
            return Response({'error': 'Invalid token'}, status=403)
    count = _fetch_and_update_prices()
    return Response({ 'success': True,
                      'message': f'✅ Updated {count} coins',
                      'timestamp': timezone.now().isoformat()
                    })


def _fetch_and_update_prices():
    """
    Only refresh coins that have a valid coingecko_id.
    Manually created coins (like White Bitcoin) are skipped —
    admin must set their price manually in the admin panel.
    """
    # Only fetch coins that have a real CoinGecko ID
    coins_qs = Coin.objects.filter(
        is_active=True
    ).exclude(
        coingecko_id=''        # skip manually created coins with no CoinGecko ID
    ).exclude(
        coingecko_id__isnull=True
    )

    coin_ids = list(coins_qs.values_list('coingecko_id', flat=True))
    if not coin_ids:
        print('[Prices] No CoinGecko coins to update.')
        return 0

    rate = _get_live_usd_to_inr()

    # Also update usd_to_inr_rate on manual coins so their INR conversion is current
    Coin.objects.filter(is_active=True).update(usd_to_inr_rate=rate)

    url    = f"{getattr(settings, 'COINGECKO_API_URL', 'https://api.coingecko.com/api/v3')}/coins/markets"
    params = {
        'vs_currency': 'usd',
        'ids':         ','.join(coin_ids),
        'order':       'market_cap_desc',
        'per_page':    100,
        'page':        1,
        'sparkline':   False,
    }

    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        updated = 0
        for item in resp.json():
            rows = Coin.objects.filter(coingecko_id=item['id']).update(
                current_price_usd    = item.get('current_price', 0) or 0,
                price_change_24h_pct = item.get('price_change_percentage_24h', 0) or 0,
                price_change_24h_usd = item.get('price_change_24h', 0) or 0,
                market_cap_usd       = item.get('market_cap', 0) or 0,
                volume_24h_usd       = item.get('total_volume', 0) or 0,
                high_24h_usd         = item.get('high_24h', 0) or 0,
                low_24h_usd          = item.get('low_24h', 0) or 0,
                circulating_supply   = item.get('circulating_supply', 0) or 0,
                image_url            = item.get('image', ''),
                usd_to_inr_rate      = rate,
                last_updated         = timezone.now(),
            )
            updated += rows
        print(f'[Prices] Updated {updated} coins. 1 USD = ₹{rate}')
        return updated
    except requests.RequestException as e:
        print(f'[Prices] CoinGecko error: {e}')
        return 0


def _get_live_usd_to_inr():
    try:
        resp = requests.get(
            'https://api.exchangerate-api.com/v4/latest/USD',
            timeout=8
        )
        if resp.status_code == 200:
            return resp.json().get('rates', {}).get('INR', 83.5)
    except Exception:
        pass
    return 83.5