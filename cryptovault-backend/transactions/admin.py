# transactions/admin.py

from django.contrib import admin
from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display    = ('id', 'user_email', 'type', 'coin_display', 'usd_amount_display', 'status', 'created_at')
    list_filter     = ('type', 'status')
    search_fields   = ('user__email', 'notes')
    ordering        = ('-created_at',)
    readonly_fields = (
        'user', 'type', 'coin', 'coin_amount',
        'usd_amount', 'inr_amount', 'fee_usd',
        'price_at_time_usd', 'notes', 'created_at',
    )
    actions = ['cancel_withdrawal', 'mark_completed']

    fieldsets = (
        ('Transaction Info', {'fields': ('user', 'type', 'coin', 'coin_amount', 'price_at_time_usd')}),
        ('Amounts',          {'fields': ('usd_amount', 'inr_amount', 'fee_usd')}),
        ('Status',           {'fields': ('status', 'notes')}),
        ('Timestamps',       {'fields': ('created_at',), 'classes': ('collapse',)}),
    )

    def user_email(self, obj): return obj.user.email
    user_email.short_description = 'User'

    def coin_display(self, obj):
        return obj.coin.symbol if obj.coin else '—'
    coin_display.short_description = 'Coin'

    def usd_amount_display(self, obj):
        return f'${float(obj.usd_amount):,.2f}' if obj.usd_amount else '$0.00'
    usd_amount_display.short_description = 'USD Amount'

    @admin.action(description='❌ Cancel withdrawal — refund USD to user')
    def cancel_withdrawal(self, request, queryset):
        refunded = 0
        skipped  = 0

        for tx in queryset:
            if tx.type != 'withdraw' or tx.status != 'pending':
                skipped += 1
                continue

            # ── Just set status — signal handles the refund ──
            tx.status = 'cancelled'
            tx.save()  # signal fires here, refunds automatically
            refunded += 1

        if refunded:
            self.message_user(request, f'✅ {refunded} withdrawal(s) cancelled. USD refunded automatically.')
        if skipped:
            self.message_user(request, f'⚠️ {skipped} skipped (not pending withdrawals).', level='WARNING')

    @admin.action(description='✅ Mark withdrawal as completed')
    def mark_completed(self, request, queryset):
        updated = 0
        for tx in queryset.filter(type='withdraw', status='pending'):
            tx.status = 'completed'
            tx.save()
            updated += 1
        self.message_user(request, f'✅ {updated} withdrawal(s) marked as completed.')