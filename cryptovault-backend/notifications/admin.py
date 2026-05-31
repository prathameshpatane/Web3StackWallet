# notifications/admin.py

from django.contrib import admin
from django.utils.html import format_html
from .models import Notification, NotificationRead


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = (
        'title', 'type', 'target_display',
        'is_broadcast', 'read_count', 'created_at', 'created_by'
    )
    list_filter   = ('type', 'is_broadcast')
    search_fields = ('title', 'message', 'user__email')
    ordering      = ('-created_at',)
    readonly_fields = ('created_at', 'created_by', 'read_count')

    fieldsets = (
        ('📢 Notification Content', {
            'fields': ('type', 'title', 'message', 'link'),
        }),
        ('👥 Target', {
            'description': '⚠️ Check "Is broadcast" to send to ALL users. '
                           'OR select a specific user below. Not both.',
            'fields': ('is_broadcast', 'user'),
        }),
        ('📊 Info', {
            'fields': ('created_at', 'created_by', 'read_count'),
            'classes': ('collapse',),
        }),
    )

    def target_display(self, obj):
        if obj.is_broadcast:
            return format_html('<span style="color:#00e5ff;font-weight:600">📢 ALL USERS</span>')
        elif obj.user:
            return obj.user.email
        return '—'
    target_display.short_description = 'Target'

    def read_count(self, obj):
        count = NotificationRead.objects.filter(notification=obj).count()
        return f'{count} user(s) read'
    read_count.short_description = 'Read By'

    def save_model(self, request, obj, form, change):
        if not change:  # only on create
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    # Quick send actions
    actions = ['mark_as_broadcast']

    @admin.action(description='📢 Convert selected to broadcast (all users)')
    def mark_as_broadcast(self, request, queryset):
        queryset.update(is_broadcast=True, user=None)
        self.message_user(request, f'{queryset.count()} notification(s) set to broadcast.')


@admin.register(NotificationRead)
class NotificationReadAdmin(admin.ModelAdmin):
    list_display = ('user', 'notification', 'read_at')
    list_filter  = ('notification__type',)
    search_fields = ('user__email',)
    readonly_fields = ('user', 'notification', 'read_at')