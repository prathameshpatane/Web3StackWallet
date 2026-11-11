from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User
from wallet.models import UserWallet


class UserWalletInline(admin.TabularInline):
    model = UserWallet
    extra = 0
    can_delete = False
    verbose_name = "Coin Balance"
    verbose_name_plural = "🪙 User Crypto Balances (Edit coin balances directly below & click Save)"
    fields = ('coin', 'balance', 'value_usd_display', 'wallet_address', 'updated_at')
    readonly_fields = ('coin', 'value_usd_display', 'updated_at')
    ordering = ('coin__symbol',)

    def value_usd_display(self, obj):
        if not obj or not obj.id or not obj.coin:
            return '$0.00'
        try:
            val = float(obj.balance) * float(obj.coin.current_price_usd)
            return f'${val:,.2f}'
        except Exception:
            return '$0.00'
    value_usd_display.short_description = 'Value (USD)'


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display   = ('email', 'username', 'mobile', 'usd_balance',
                      'kyc_status', 'is_kyc_verified', 'is_staff', 'date_joined')
    list_filter    = ('kyc_status', 'is_kyc_verified', 'is_staff', 'is_active')
    search_fields  = ('email', 'username', 'mobile')
    ordering       = ('-date_joined',)
    readonly_fields = ('date_joined', 'last_login')
    inlines        = [UserWalletInline]
    actions        = ['initialize_all_wallets']

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Crypto Account', {
            'fields': ('mobile', 'usd_balance', 'is_kyc_verified', 'kyc_status'),
            'description': 'usd_balance is in USD. Admin can directly edit this.',
        }),
    )

    def change_view(self, request, object_id, form_url='', extra_context=None):
        # Auto-ensure all active coin wallets exist for this user so admin sees and can edit all 20 coins
        try:
            from coins.models import Coin
            active_coins = list(Coin.objects.filter(is_active=True))
            existing_ids = set(UserWallet.objects.filter(user_id=object_id).values_list('coin_id', flat=True))
            missing = [c for c in active_coins if c.id not in existing_ids]
            if missing:
                UserWallet.objects.bulk_create([
                    UserWallet(user_id=object_id, coin=c, balance=0, wallet_address='')
                    for c in missing
                ])
        except Exception:
            pass
        return super().change_view(request, object_id, form_url, extra_context=extra_context)

    @admin.action(description="Initialize all 20 coin wallets for selected users")
    def initialize_all_wallets(self, request, queryset):
        from coins.models import Coin
        active_coins = list(Coin.objects.filter(is_active=True))
        created_count = 0
        for user in queryset:
            existing_ids = set(UserWallet.objects.filter(user=user).values_list('coin_id', flat=True))
            missing = [c for c in active_coins if c.id not in existing_ids]
            if missing:
                UserWallet.objects.bulk_create([
                    UserWallet(user=user, coin=c, balance=0, wallet_address='')
                    for c in missing
                ])
                created_count += len(missing)
        self.message_user(request, f"Ensured all coin wallets exist. Created {created_count} missing wallet(s).")
