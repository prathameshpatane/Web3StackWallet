from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User
from wallet.models import UserWallet
from coins.models import Coin


@receiver(post_save, sender=User)
def initialize_user_wallets(sender, instance, created, **kwargs):
    """
    When a new user is created, initialize wallets for all active coins.
    This ensures users can see coins in their portfolio immediately.
    """
    if created:
        # Get all active coins
        active_coins = Coin.objects.filter(is_active=True)
        
        # Create a wallet for each active coin with 0 balance
        for coin in active_coins:
            UserWallet.objects.get_or_create(
                user=instance,
                coin=coin,
                defaults={'balance': 0}
            )
