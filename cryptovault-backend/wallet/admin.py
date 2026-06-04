# wallet/admin.py

from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html
from django.db import transaction as db_transaction
from .models import UserWallet, PaymentSettings, BuyRequest


@admin.register(PaymentSettings)
class PaymentSettingsAdmin(admin.ModelAdmin):
    list_display = ('upi_id', 'upi_name', 'bank_name', 'account_number', 'is_active', 'updated_at')
    fieldsets = (
        ('🟢 UPI Payment', {
            'fields': ('upi_id', 'upi_name', 'phone_number', 'is_active'),
        }),
        ('📷 QR Code', {
            'fields': ('qr_image', 'qr_preview'),
        }),
        ('🏦 Bank Transfer', {
            'fields': ('bank_name', 'bank_branch', 'account_holder_name', 'account_number', 'ifsc_code'),
        }),
        ('📝 Instructions', {
            'fields': ('payment_note',),
        }),
    )
    readonly_fields = ('qr_preview', 'updated_at')

    def qr_preview(self, obj):
        if obj.qr_image:
            return format_html(
                '<img src="{}" style="max-width:250px;max-height:250px;border-radius:8px;" />',
                obj.qr_image.url
            )
        return 'No QR uploaded yet'
    qr_preview.short_description = 'QR Preview'

    def has_add_permission(self, request):
        return not PaymentSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(UserWallet)
class WalletAdmin(admin.ModelAdmin):
    list_display  = ('user', 'coin', 'balance', 'value_usd_display', 'updated_at')
    list_filter   = ('coin',)
    search_fields = ('user__email', 'coin__symbol')
    fields        = ('user', 'coin', 'balance', 'wallet_address')

    def value_usd_display(self, obj):
        try:
            val = float(obj.balance) * float(obj.coin.current_price_usd)
            return f'${val:,.2f}'
        except: return '$0.00'
    value_usd_display.short_description = 'Value (USD)'


def _approve_buy_request(req, reviewed_by):
    """
    Core approval logic — called from both the action AND save_model.
    Adds coins to wallet and logs transaction.
    """
    from transactions.models import Transaction

    with db_transaction.atomic():
        # Add coins to user wallet
        wallet, _ = UserWallet.objects.get_or_create(
            user=req.user,
            coin=req.coin,
        )
        wallet.balance += req.coin_quantity
        wallet.save()

        # Update request
        req.status      = 'approved'
        req.reviewed_by = reviewed_by
        req.reviewed_at = timezone.now()
        req.save()

        # Log transaction
        Transaction.objects.create(
            user              = req.user,
            type              = 'buy',
            coin              = req.coin,
            coin_amount       = req.coin_quantity,
            usd_amount        = req.usd_amount,
            inr_amount        = req.inr_amount,
            price_at_time_usd = req.coin_price_usd,
            fee_usd           = req.usd_amount * 1 / 1000,
            status            = 'completed',
            notes             = f'Buy approved. TxID: {req.transaction_id}',
        )


@admin.register(BuyRequest)
class BuyRequestAdmin(admin.ModelAdmin):
    list_display  = (
        'request_id', 'user_email', 'coin', 'coin_quantity_display',
        'inr_amount_display', 'transaction_id', 'status', 'created_at'
    )
    list_filter   = ('status', 'coin')
    search_fields = ('user__email', 'transaction_id', 'coin__symbol')
    ordering      = ('-created_at',)
    actions       = ['approve_requests', 'reject_requests']

    readonly_fields = (
        'user', 'coin', 'usd_amount', 'inr_amount',
        'coin_quantity', 'coin_price_usd',
        'transaction_id', 'created_at', 'reviewed_at', 'reviewed_by',
    )

    fieldsets = (
        ('👤 User & Coin', {
            'fields': ('user', 'coin', 'coin_quantity', 'coin_price_usd')
        }),
        ('💰 Payment', {
            'fields': ('usd_amount', 'inr_amount', 'transaction_id')
        }),
        ('✅ Admin Decision', {
            'fields': ('status', 'admin_note', 'reviewed_by', 'reviewed_at')
        }),
        ('📅 Timestamps', {
            'fields': ('created_at',), 'classes': ('collapse',)
        }),
    )

    def request_id(self, obj): return f'#CVR{str(obj.id).zfill(6)}'
    request_id.short_description = 'Request ID'

    def user_email(self, obj): return obj.user.email
    user_email.short_description = 'User Email'

    def coin_quantity_display(self, obj):
        return f'{float(obj.coin_quantity):.6f} {obj.coin.symbol}'
    coin_quantity_display.short_description = 'Coins'

    def inr_amount_display(self, obj):
        return f'₹{float(obj.inr_amount):,.2f}'
    inr_amount_display.short_description = 'INR Paid'

    # ── save_model: fires when admin opens record and clicks Save ──
    def save_model(self, request, obj, form, change):
        if change:  # only on edits, not new records
            try:
                old = BuyRequest.objects.get(pk=obj.pk)
            except BuyRequest.DoesNotExist:
                super().save_model(request, obj, form, change)
                return

            # Status changed to approved from non-approved
            if obj.status == 'approved' and old.status != 'approved':
                try:
                    _approve_buy_request(obj, request.user)
                    self.message_user(
                        request,
                        f'✅ #{obj.id} approved — {float(obj.coin_quantity):.6f} {obj.coin.symbol} added to {obj.user.email}\'s wallet.'
                    )
                    return  # _approve_buy_request already saved obj
                except Exception as e:
                    from django.contrib import messages
                    self.message_user(request, f'❌ Approval failed: {e}', level=messages.ERROR)
                    return

            # Status changed to rejected
            if obj.status == 'rejected' and old.status != 'rejected':
                obj.reviewed_by = request.user
                obj.reviewed_at = timezone.now()

        super().save_model(request, obj, form, change)

    # ── Bulk action ────────────────────────────────────────────
    @admin.action(description='✅ APPROVE — Add coins to user wallet')
    def approve_requests(self, request, queryset):
        approved = 0
        errors   = []

        for req in queryset.filter(status='pending'):
            try:
                _approve_buy_request(req, request.user)
                approved += 1
            except Exception as e:
                errors.append(f'#{req.id}: {e}')

        if approved:
            self.message_user(request, f'✅ {approved} request(s) approved. Coins added to wallets.')
        for err in errors:
            self.message_user(request, f'❌ {err}', level='ERROR')

    @admin.action(description='❌ REJECT — Payment not verified')
    def reject_requests(self, request, queryset):
        rejected = 0
        for req in queryset.filter(status='pending'):
            req.status      = 'rejected'
            req.reviewed_by = request.user
            req.reviewed_at = timezone.now()
            req.save()
            rejected += 1
        self.message_user(request, f'❌ {rejected} request(s) rejected.')