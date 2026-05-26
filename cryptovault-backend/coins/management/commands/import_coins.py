import requests
from django.core.management.base import BaseCommand
from django.utils import timezone
from coins.models import Coin

TOP_COINS = [
    'bitcoin', 'ethereum', 'binancecoin', 'solana', 'cardano',
    'ripple', 'polkadot', 'dogecoin', 'avalanche-2', 'chainlink',
    'uniswap', 'litecoin', 'matic-network', 'stellar', 'cosmos',
    'monero', 'tron', 'ethereum-classic', 'filecoin', 'internet-computer',
]


def get_usd_inr_rate():
    try:
        resp = requests.get('https://api.exchangerate-api.com/v4/latest/USD', timeout=10)
        if resp.status_code == 200:
            return resp.json().get('rates', {}).get('INR', 83.5)
    except Exception:
        pass
    return 83.5


class Command(BaseCommand):
    help = 'Import top 20 coins from CoinGecko with live USD prices'

    def handle(self, *args, **options):
        self.stdout.write('Fetching USD prices from CoinGecko...')

        usd_inr = get_usd_inr_rate()
        self.stdout.write(f'USD/INR rate: {usd_inr}')

        url    = 'https://api.coingecko.com/api/v3/coins/markets'
        params = {
            'vs_currency': 'usd',
            'ids':         ','.join(TOP_COINS),
            'order':       'market_cap_desc',
            'per_page':    50,
            'page':        1,
            'sparkline':   False,
        }

        try:
            resp = requests.get(url, params=params, timeout=30)
            resp.raise_for_status()
            created = updated = 0

            for item in resp.json():
                _, is_new = Coin.objects.update_or_create(
                    coingecko_id=item['id'],
                    defaults={
                        'symbol':                item['symbol'].upper(),
                        'name':                  item['name'],
                        'image_url':             item.get('image', ''),
                        'current_price_usd':     item.get('current_price', 0) or 0,
                        'price_change_24h_pct':  item.get('price_change_percentage_24h', 0) or 0,
                        'price_change_24h_usd':  item.get('price_change_24h', 0) or 0,
                        'market_cap_usd':        item.get('market_cap', 0) or 0,
                        'volume_24h_usd':        item.get('total_volume', 0) or 0,
                        'high_24h_usd':          item.get('high_24h', 0) or 0,
                        'low_24h_usd':           item.get('low_24h', 0) or 0,
                        'circulating_supply':    item.get('circulating_supply', 0) or 0,
                        'usd_to_inr_rate':       usd_inr,
                        'is_active':             True,
                        'last_updated':          timezone.now(),
                    }
                )
                if is_new: created += 1
                else:      updated += 1

            self.stdout.write(self.style.SUCCESS(
                f'Done! Created: {created}, Updated: {updated} coins.'
            ))
        except requests.RequestException as e:
            self.stdout.write(self.style.ERROR(f'Failed: {e}'))