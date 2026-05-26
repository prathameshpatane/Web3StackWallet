from django.contrib import admin
from django.utils import timezone
from .models import KYCDocument


@admin.register(KYCDocument)
class KYCAdmin(admin.ModelAdmin):
    list_display    = ('user', 'full_name', 'aadhaar_number', 'pan_number', 'status', 'submitted_at', 'reviewed_at')
    list_filter     = ('status',)
    search_fields   = ('user__email', 'full_name', 'aadhaar_number', 'pan_number')
    readonly_fields = ('submitted_at', 'reviewed_at', 'reviewed_by')
    actions         = ['approve_kyc', 'reject_kyc']

    @admin.action(description='✅ Approve selected KYC requests')
    def approve_kyc(self, request, queryset):
        for kyc in queryset:
            kyc.status      = 'approved'
            kyc.reviewed_at = timezone.now()
            kyc.reviewed_by = request.user
            kyc.save()
            kyc.user.is_kyc_verified = True
            kyc.user.kyc_status      = 'approved'
            kyc.user.save()
        self.message_user(request, f'{queryset.count()} KYC(s) approved successfully.')

    @admin.action(description='❌ Reject selected KYC requests')
    def reject_kyc(self, request, queryset):
        for kyc in queryset:
            kyc.status      = 'rejected'
            kyc.reviewed_at = timezone.now()
            kyc.reviewed_by = request.user
            kyc.save()
            kyc.user.kyc_status = 'rejected'
            kyc.user.save()
        self.message_user(request, f'{queryset.count()} KYC(s) rejected.')