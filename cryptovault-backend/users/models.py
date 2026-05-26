from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email  = models.EmailField(unique=True)
    mobile = models.CharField(max_length=15, blank=True)

    # All balances in USD — convert to INR only on withdrawal
    usd_balance = models.DecimalField(
        max_digits=20, decimal_places=8, default=0,
        help_text='User cash balance in USD'
    )

    is_kyc_verified = models.BooleanField(default=False)
    kyc_status = models.CharField(
        max_length=20,
        choices=[
            ('not_submitted', 'Not Submitted'),
            ('pending',       'Pending Review'),
            ('approved',      'Approved'),
            ('rejected',      'Rejected'),
        ],
        default='not_submitted',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        verbose_name        = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.email