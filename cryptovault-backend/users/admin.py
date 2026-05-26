from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display   = ('email', 'username', 'mobile', 'usd_balance',
                      'kyc_status', 'is_kyc_verified', 'is_staff', 'date_joined')
    list_filter    = ('kyc_status', 'is_kyc_verified', 'is_staff', 'is_active')
    search_fields  = ('email', 'username', 'mobile')
    ordering       = ('-date_joined',)
    readonly_fields = ('date_joined', 'last_login')

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Crypto Account', {
            'fields': ('mobile', 'usd_balance', 'is_kyc_verified', 'kyc_status'),
            'description': 'usd_balance is in USD. Admin can directly edit this.',
        }),
    )