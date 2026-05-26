from django.db import models
from django.conf import settings


class UserWallet(models.Model):
    user           = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wallets')
    coin           = models.ForeignKey('coins.Coin', on_delete=models.CASCADE)
    balance        = models.DecimalField(max_digits=30, decimal_places=8, default=0)
    wallet_address = models.CharField(max_length=255, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'coin')

    def __str__(self):
        return f'{self.user.email} — {self.coin.symbol}: {self.balance}'

    @property
    def value_in_usd(self):
        return float(self.balance) * float(self.coin.current_price_usd)

    @property
    def value_in_inr(self):
        return self.value_in_usd * float(self.coin.usd_to_inr_rate)