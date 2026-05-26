# transactions/models.py — REPLACE your entire file

from django.db import models
from django.conf import settings


class Transaction(models.Model):
    TYPE_CHOICES = [
        ('buy',      'Buy'),
        ('sell',     'Sell'),
        ('deposit',  'Deposit USD'),
        ('withdraw', 'Withdraw to INR'),
    ]
    STATUS_CHOICES = [
        ('pending',   'Pending'),
        ('completed', 'Completed'),
        ('failed',    'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    user              = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='transactions'
    )
    type              = models.CharField(max_length=20, choices=TYPE_CHOICES)
    coin              = models.ForeignKey(
        'coins.Coin', on_delete=models.SET_NULL,
        null=True, blank=True
    )
    coin_amount       = models.DecimalField(max_digits=30, decimal_places=8, default=0)
    usd_amount        = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    inr_amount        = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    price_at_time_usd = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    fee_usd           = models.DecimalField(max_digits=15, decimal_places=8, default=0)
    status            = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes             = models.TextField(blank=True)
    created_at        = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        coin_sym = self.coin.symbol if self.coin else 'INR'
        return f'{self.user.email} | {self.type} | ${self.usd_amount} | {self.status}'