# transactions/admin.py
from django.contrib import admin
from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display  = ('user', 'type', 'coin', 'coin_amount', 'usd_amount', 'inr_amount', 'fee_usd', 'status', 'created_at')
    list_filter   = ('type', 'status', 'coin')
    search_fields = ('user__email', 'user__username')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)