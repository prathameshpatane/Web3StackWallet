
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


class PaymentSettings(models.Model):
    """
    Admin uploads UPI ID, phone number, and QR code image here.
    Frontend fetches this to show payment details to users.
    Only ONE record should exist — use singleton pattern.
    """
    upi_id       = models.CharField(max_length=200, help_text='e.g. cryptovault@upi')
    upi_name     = models.CharField(max_length=200, help_text='Name shown in UPI apps')
    phone_number = models.CharField(max_length=20,  help_text='WhatsApp/contact for payment issues')
    qr_image     = models.ImageField(
        upload_to='payment/qr/',
        blank=True, null=True,
        help_text='Upload your UPI QR code image'
    )
    payment_note = models.TextField(
        default='Include your registered email in payment remarks.',
        help_text='Instructions shown to user during payment'
    )
    is_active    = models.BooleanField(default=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'Payment Settings'
        verbose_name_plural = 'Payment Settings'

    def __str__(self):
        return f'Payment Settings — UPI: {self.upi_id}'

    @classmethod
    def get_settings(cls):
        """Always returns the one settings object, creates default if none exists"""
        obj, _ = cls.objects.get_or_create(
            id=1,
            defaults={
                'upi_id':       'cryptovault@upi',
                'upi_name':     'CryptoVault',
                'phone_number': '+91 98765 43210',
                'payment_note': 'Include your registered email in payment remarks.',
            }
        )
        return obj


class BuyRequest(models.Model):
    """
    User submits buy request after making UPI payment.
    Admin sees it in admin panel, reviews screenshot, approves/rejects.
    On approval — coins are automatically added to user wallet.
    """
    STATUS_CHOICES = [
        ('pending',  'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user           = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='buy_requests')
    coin           = models.ForeignKey('coins.Coin', on_delete=models.CASCADE)

    usd_amount     = models.DecimalField(max_digits=15, decimal_places=4)
    inr_amount     = models.DecimalField(max_digits=15, decimal_places=2)
    coin_quantity  = models.DecimalField(max_digits=30, decimal_places=8)
    coin_price_usd = models.DecimalField(max_digits=20, decimal_places=8)

    transaction_id = models.CharField(max_length=200, unique=True)
    screenshot     = models.ImageField(upload_to='buy_requests/screenshots/')

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
        return f'#{self.id} {self.user.email} — {self.coin_quantity} {self.coin.symbol} — {self.status}'