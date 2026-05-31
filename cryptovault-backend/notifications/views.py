# notifications/views.py

from rest_framework import generics, permissions, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q, Exists, OuterRef
from .models import Notification, NotificationRead


class NotificationSerializer(serializers.ModelSerializer):
    is_read = serializers.SerializerMethodField()

    class Meta:
        model  = Notification
        fields = ('id', 'type', 'title', 'message', 'link', 'is_read', 'created_at')

    def get_is_read(self, obj):
        user = self.context['request'].user
        return NotificationRead.objects.filter(user=user, notification=obj).exists()


class NotificationListView(generics.ListAPIView):
    """
    GET /api/notifications/
    Returns notifications for this user:
    - Broadcast notifications (sent to all users)
    - Notifications targeted at this specific user
    """
    serializer_class   = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class   = None

    def get_queryset(self):
        user = self.request.user
        return Notification.objects.filter(
            Q(is_broadcast=True) | Q(user=user)
        ).order_by('-created_at')[:50]  # latest 50


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def unread_count(request):
    """GET /api/notifications/unread-count/ — for bell badge"""
    user = request.user
    total = Notification.objects.filter(
        Q(is_broadcast=True) | Q(user=user)
    ).count()

    read = NotificationRead.objects.filter(
        user=user,
        notification__in=Notification.objects.filter(
            Q(is_broadcast=True) | Q(user=user)
        )
    ).count()

    return Response({'unread': total - read})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_read(request, notification_id):
    """POST /api/notifications/<id>/read/ — mark single notification as read"""
    user = request.user
    try:
        notif = Notification.objects.get(
            Q(is_broadcast=True) | Q(user=user),
            id=notification_id
        )
        NotificationRead.objects.get_or_create(user=user, notification=notif)
        return Response({'status': 'read'})
    except Notification.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_all_read(request):
    """POST /api/notifications/mark-all-read/ — mark all as read"""
    user = request.user
    notifications = Notification.objects.filter(
        Q(is_broadcast=True) | Q(user=user)
    )
    for notif in notifications:
        NotificationRead.objects.get_or_create(user=user, notification=notif)
    return Response({'status': 'all marked read'})