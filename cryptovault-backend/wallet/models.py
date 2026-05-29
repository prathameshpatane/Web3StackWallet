# wallet/models.py — ADD BuyRequest model at the bottom

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


class BuyRequest(models.Model):
    """
    When user pays via UPI, they submit a buy request.
    Admin reviews screenshot + transaction ID and approves/rejects.
    On approval → coins are added to user's wallet automatically.
    """
    STATUS_CHOICES = [
        ('pending',  'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user           = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='buy_requests')
    coin           = models.ForeignKey('coins.Coin', on_delete=models.CASCADE)

    # What user wants to buy
    usd_amount     = models.DecimalField(max_digits=15, decimal_places=4)
    inr_amount     = models.DecimalField(max_digits=15, decimal_places=2)
    coin_quantity  = models.DecimalField(max_digits=30, decimal_places=8)  # how many coins user will receive
    coin_price_usd = models.DecimalField(max_digits=20, decimal_places=8)  # price at time of request

    # Payment proof from user
    transaction_id = models.CharField(max_length=200)
    screenshot     = models.ImageField(upload_to='buy_requests/screenshots/')

    # Admin action
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_note     = models.TextField(blank=True)
    reviewed_by    = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='reviewed_buy_requests'
    )
    reviewed_at    = models.DateTimeField(null=True, blank=True)

    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.email} — Buy {self.coin_quantity} {self.coin.symbol} — {self.status}'