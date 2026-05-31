from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from django.http import JsonResponse
import os

admin.site.site_header = 'CryptoVault Admin'
admin.site.site_title  = 'CryptoVault'
admin.site.index_title = 'Admin Dashboard'


def debug_env(request):
    """Temporary debug endpoint — remove after confirming env vars work"""
    db_url = os.environ.get('DATABASE_URL', '')
    return JsonResponse({
        'DATABASE_URL_found':   bool(db_url),
        'DATABASE_URL_preview': db_url[:60] + '...' if db_url else 'NOT SET',
        'SECRET_KEY_found':     bool(os.environ.get('SECRET_KEY')),
        'DEBUG':                os.environ.get('DEBUG', 'not set'),
        'db_engine':            settings.DATABASES['default']['ENGINE'],
        'db_host':              settings.DATABASES['default'].get('HOST', 'from URL'),
    })


urlpatterns = [
    # Root → redirect to admin
    path('', RedirectView.as_view(url='/admin/', permanent=False)),

    # Temporary debug — remove after fixing
    path('debug-env/', debug_env),

    path('admin/',            admin.site.urls),
    path('api/auth/',         include('users.urls')),
    path('api/coins/',        include('coins.urls')),
    path('api/kyc/',          include('kyc.urls')),
    path('api/wallet/',       include('wallet.urls')),
    path('api/transactions/', include('transactions.urls')),
    path('api/notifications/', include('notifications.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)