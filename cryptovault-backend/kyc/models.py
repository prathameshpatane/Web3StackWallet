from django.db import models
from django.conf import settings


class KYCDocument(models.Model):
    STATUS_CHOICES = [
        ('pending',  'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user           = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='kyc')
    full_name      = models.CharField(max_length=200)
    date_of_birth  = models.DateField(null=True, blank=True)

    # Aadhaar
    aadhaar_number = models.CharField(max_length=14, blank=True)

    # PAN
    pan_number  = models.CharField(max_length=10, blank=True)

    status           = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rejection_reason = models.TextField(blank=True)
    submitted_at     = models.DateTimeField(auto_now_add=True)
    reviewed_at      = models.DateTimeField(null=True, blank=True)
    reviewed_by      = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='kyc_reviews'
    )

    def __str__(self):
        return f'{self.user.email} — KYC {self.status}'