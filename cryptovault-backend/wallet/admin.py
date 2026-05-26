# wallet/admin.py — REPLACE your entire file

from django.contrib import admin
from .models import UserWallet


@admin.register(UserWallet)
class WalletAdmin(admin.ModelAdmin):
    list_display   = (
        'user', 'coin', 'balance',
        'value_usd_display', 'value_inr_display', 'updated_at'
    )
    list_filter    = ('coin',)
    search_fields  = ('user__email', 'user__username', 'coin__symbol', 'coin__name')

    # Admin can directly set/edit balance — this is how you add coins to user
    fields = ('user', 'coin', 'balance', 'wallet_address')

    def value_usd_display(self, obj):
        try:
            price = float(obj.coin.current_price_usd)
            val   = float(obj.balance) * price
            return f'${val:,.4f}' if val < 1 else f'${val:,.2f}'
        except Exception:
            return '$0.00'
    value_usd_display.short_description = 'Value (USD)'

    def value_inr_display(self, obj):
        try:
            price = float(obj.coin.current_price_usd)
            rate  = float(obj.coin.usd_to_inr_rate) or 83.5
            val   = float(obj.balance) * price * rate
            return f'₹{val:,.2f}'
        except Exception:
            return '₹0.00'
    value_inr_display.short_description = 'Value (INR)'