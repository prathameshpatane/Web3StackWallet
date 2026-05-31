# notifications/urls.py

from django.urls import path
from .views import NotificationListView, unread_count, mark_read, mark_all_read

urlpatterns = [
    path('',                          NotificationListView.as_view(), name='notifications'),
    path('unread-count/',             unread_count,                   name='unread-count'),
    path('<int:notification_id>/read/', mark_read,                    name='mark-read'),
    path('mark-all-read/',            mark_all_read,                  name='mark-all-read'),
]