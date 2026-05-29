# wallet/admin.py — REPLACE your entire file

from django.contrib import admin
from django.utils import timezone
from django.db import transaction as db_transaction
from .models import UserWallet, BuyRequest


@admin.register(UserWallet)
class WalletAdmin(admin.ModelAdmin):
    list_display   = ('user', 'coin', 'balance', 'value_usd_display', 'value_inr_display', 'updated_at')
    list_filter    = ('coin',)
    search_fields  = ('user__email', 'user__username', 'coin__symbol', 'coin__name')
    fields         = ('user', 'coin', 'balance', 'wallet_address')

    def value_usd_display(self, obj):
        try:
            val = float(obj.balance) * float(obj.coin.current_price_usd)
            return f'${val:,.4f}' if val < 1 else f'${val:,.2f}'
        except Exception:
            return '$0.00'
    value_usd_display.short_description = 'Value (USD)'

    def value_inr_display(self, obj):
        try:
            val = float(obj.balance) * float(obj.coin.current_price_usd) * float(obj.coin.usd_to_inr_rate)
            return f'₹{val:,.2f}'
        except Exception:
            return '₹0.00'
    value_inr_display.short_description = 'Value (INR)'


@admin.register(BuyRequest)
class BuyRequestAdmin(admin.ModelAdmin):
    list_display   = (
        'id', 'user_email', 'coin', 'coin_quantity',
        'usd_amount', 'inr_amount_display',
        'transaction_id', 'status', 'created_at'
    )
    list_filter    = ('status', 'coin')
    search_fields  = ('user__email', 'transaction_id', 'coin__symbol')
    readonly_fields = (
        'user', 'coin', 'usd_amount', 'inr_amount', 'coin_quantity',
        'coin_price_usd', 'transaction_id', 'screenshot_preview',
        'created_at', 'reviewed_at', 'reviewed_by',
    )
    ordering = ('-created_at',)

    # ── Custom actions ──────────────────────────────────────────
    actions = ['approve_requests', 'reject_requests']

    fieldsets = (
        ('Request Details', {
            'fields': (
                'user', 'coin', 'coin_quantity',
                'usd_amount', 'inr_amount', 'coin_price_usd',
            )
        }),
        ('Payment Proof', {
            'fields': ('transaction_id', 'screenshot_preview')
        }),
        ('Admin Action', {
            'fields': ('status', 'admin_note', 'reviewed_by', 'reviewed_at')
        }),
    )

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'

    def inr_amount_display(self, obj):
        return f'₹{float(obj.inr_amount):,.2f}'
    inr_amount_display.short_description = 'INR Paid'

    def screenshot_preview(self, obj):
        if obj.screenshot:
            return f'<img src="{obj.screenshot.url}" style="max-width:400px;max-height:300px;" />'
        return 'No screenshot'
    screenshot_preview.allow_tags = True
    screenshot_preview.short_description = 'Payment Screenshot'

    @admin.action(description='✅ Approve — Add coins to user wallet')
    def approve_requests(self, request, queryset):
        approved = 0
        for req in queryset.filter(status='pending'):
            with db_transaction.atomic():
                # Add coins to user wallet
                wallet, _ = UserWallet.objects.get_or_create(
                    user=req.user, coin=req.coin
                )
                wallet.balance += req.coin_quantity
                wallet.save()

                # Update request status
                req.status      = 'approved'
                req.reviewed_by = request.user
                req.reviewed_at = timezone.now()
                req.save()

                # Log transaction
                from transactions.models import Transaction
                Transaction.objects.create(
                    user              = req.user,
                    type              = 'buy',
                    coin              = req.coin,
                    coin_amount       = req.coin_quantity,
                    usd_amount        = req.usd_amount,
                    inr_amount        = req.inr_amount,
                    price_at_time_usd = req.coin_price_usd,
                    fee_usd           = req.usd_amount * 0.001,
                    status            = 'completed',
                    notes             = f'UPI payment approved. TxID: {req.transaction_id}',
                )

            approved += 1

        self.message_user(
            request,
            f'✅ {approved} request(s) approved. Coins added to user wallets.'
        )

    @admin.action(description='❌ Reject — Payment not verified')
    def reject_requests(self, request, queryset):
        rejected = 0
        for req in queryset.filter(status='pending'):
            req.status      = 'rejected'
            req.reviewed_by = request.user
            req.reviewed_at = timezone.now()
            req.save()
            rejected += 1

        self.message_user(
            request,
            f'❌ {rejected} request(s) rejected.'
        )