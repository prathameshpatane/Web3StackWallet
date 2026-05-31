# notifications/models.py

from django.db import models
from django.conf import settings


class Notification(models.Model):
    TYPE_CHOICES = [
        ('info',    '📢 Info'),
        ('success', '✅ Success'),
        ('warning', '⚠️ Warning'),
        ('kyc',     '🪪 KYC Update'),
        ('buy',     '₿ Buy Request'),
        ('sell',    '💱 Sell Update'),
        ('withdraw','⬆️ Withdrawal'),
        ('system',  '🔧 System'),
    ]

    # If user is None → broadcast to ALL users
    user        = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete  = models.CASCADE,
        null       = True,
        blank      = True,
        related_name = 'notifications',
        help_text  = 'Leave empty to send to ALL users'
    )
    is_broadcast = models.BooleanField(
        default    = False,
        help_text  = 'If checked, sends to ALL users regardless of user field'
    )

    type        = models.CharField(max_length=20, choices=TYPE_CHOICES, default='info')
    title       = models.CharField(max_length=200)
    message     = models.TextField()
    link        = models.CharField(
        max_length = 200, blank=True,
        help_text  = 'Optional link e.g. /wallet or /kyc'
    )

    created_at  = models.DateTimeField(auto_now_add=True)
    created_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete    = models.SET_NULL,
        null         = True,
        blank        = True,
        related_name = 'sent_notifications',
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        target = 'ALL USERS' if self.is_broadcast else (self.user.email if self.user else 'Unknown')
        return f'[{self.type.upper()}] {self.title} → {target}'


class NotificationRead(models.Model):
    """Tracks which notifications each user has read"""
    user         = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    notification = models.ForeignKey(Notification, on_delete=models.CASCADE)
    read_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'notification')