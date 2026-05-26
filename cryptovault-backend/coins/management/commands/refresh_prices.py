from django.core.management.base import BaseCommand
from coins.views import _fetch_and_update_prices


class Command(BaseCommand):
    help = 'Refresh live coin prices from CoinGecko'

    def handle(self, *args, **options):
        self.stdout.write('Refreshing prices...')
        _fetch_and_update_prices()
        self.stdout.write(self.style.SUCCESS('All coin prices updated!'))