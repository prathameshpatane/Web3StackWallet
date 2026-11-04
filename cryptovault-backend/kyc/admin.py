from django.contrib import admin
from django.utils import timezone
from .models import KYCDocument
from notifications.models import Notification


def _sync_kyc_status(kyc, status, reviewed_by=None, rejection_reason=''):
    kyc.status = status
    kyc.reviewed_at = timezone.now()
    if reviewed_by:
        kyc.reviewed_by = reviewed_by
    if rejection_reason:
        kyc.rejection_reason = rejection_reason
    kyc.save()

    user = kyc.user
    if status == 'approved':
        user.is_kyc_verified = True
        user.kyc_status = 'approved'
        user.save(update_fields=['is_kyc_verified', 'kyc_status'])
        Notification.objects.create(
            user=user,
            type='kyc',
            title='KYC Approved',
            message='Your KYC documents have been reviewed and approved! You now have full access to all features.',
            link='/kyc'
        )
    elif status == 'rejected':
        user.is_kyc_verified = False
        user.kyc_status = 'rejected'
        user.save(update_fields=['is_kyc_verified', 'kyc_status'])
        reason_msg = f' Reason: {kyc.rejection_reason}' if kyc.rejection_reason else ' Please review your information and resubmit.'
        Notification.objects.create(
            user=user,
            type='kyc',
            title='KYC Rejected',
            message=f'Your KYC verification was rejected.{reason_msg}',
            link='/kyc'
        )


@admin.register(KYCDocument)
class KYCAdmin(admin.ModelAdmin):
    list_display    = ('user', 'full_name', 'aadhaar_number', 'pan_number', 'status', 'submitted_at', 'reviewed_at')
    list_filter     = ('status',)
    search_fields   = ('user__email', 'full_name', 'aadhaar_number', 'pan_number')
    readonly_fields = ('submitted_at', 'reviewed_at', 'reviewed_by')
    actions         = ['approve_kyc', 'reject_kyc']

    def save_model(self, request, obj, form, change):
        if change:
            try:
                old = KYCDocument.objects.get(pk=obj.pk)
                if obj.status != old.status:
                    _sync_kyc_status(obj, obj.status, reviewed_by=request.user, rejection_reason=obj.rejection_reason)
                    return
            except KYCDocument.DoesNotExist:
                pass
        super().save_model(request, obj, form, change)

    @admin.action(description='Approve selected KYC requests')
    def approve_kyc(self, request, queryset):
        count = 0
        for kyc in queryset:
            _sync_kyc_status(kyc, 'approved', reviewed_by=request.user)
            count += 1
        self.message_user(request, f'{count} KYC(s) approved successfully.')

    @admin.action(description='Reject selected KYC requests')
    def reject_kyc(self, request, queryset):
        count = 0
        for kyc in queryset:
            _sync_kyc_status(kyc, 'rejected', reviewed_by=request.user)
            count += 1
        self.message_user(request, f'{count} KYC(s) rejected.')