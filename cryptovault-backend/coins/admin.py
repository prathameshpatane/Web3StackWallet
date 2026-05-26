# coins/admin.py — REPLACE your entire file

from django.contrib import admin
from .models import Coin


@admin.register(Coin)
class CoinAdmin(admin.ModelAdmin):
    list_display   = (
        'name', 'symbol', 'current_price_usd_display',
        'current_price_inr_display', 'price_change_24h_pct',
        'is_active', 'last_updated'
    )
    list_filter    = ('is_active',)
    search_fields  = ('name', 'symbol', 'coingecko_id')
    list_editable  = ('is_active',)

    # ── Make ALL price fields editable so admin can set prices for custom coins ──
    fields = (
        'coingecko_id', 'symbol', 'name', 'image_url', 'is_active',
        'current_price_usd',        # ← editable — admin sets price for custom coins
        'price_change_24h_pct',
        'price_change_24h_usd',
        'market_cap_usd',
        'volume_24h_usd',
        'high_24h_usd',
        'low_24h_usd',
        'circulating_supply',
        'usd_to_inr_rate',
        'last_updated',
    )
    readonly_fields = ('last_updated',)

    def current_price_usd_display(self, obj):
        p = float(obj.current_price_usd)
        return f'${p:,.6f}' if p < 1 else f'${p:,.2f}'
    current_price_usd_display.short_description = 'Price (USD)'

    def current_price_inr_display(self, obj):
        return f'₹{obj.current_price_inr:,.2f}'
    current_price_inr_display.short_description = 'Price (INR)'