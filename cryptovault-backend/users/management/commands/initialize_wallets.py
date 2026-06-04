from django.core.management.base import BaseCommand
from django.db import transaction
from users.models import User
from wallet.models import UserWallet
from coins.models import Coin


class Command(BaseCommand):
    help = 'Initialize wallets for existing users who registered before the signal was added'

    def handle(self, *args, **options):
        active_coins = Coin.objects.filter(is_active=True)
        users = User.objects.all()

        created_count = 0
        existing_count = 0

        with transaction.atomic():
            for user in users:
                for coin in active_coins:
                    wallet, created = UserWallet.objects.get_or_create(
                        user=user,
                        coin=coin,
                        defaults={'balance': 0}
                    )
                    if created:
                        created_count += 1
                    else:
                        existing_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'✅ Backfill complete!\n'
                f'   Created: {created_count} new wallets\n'
                f'   Already existed: {existing_count} wallets'
            )
        )
