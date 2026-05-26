# coins/urls.py — REPLACE your entire file

from django.urls import path
from .views import MarketListView, refresh_prices, get_usd_to_inr

urlpatterns = [
    path('market/',         MarketListView.as_view(), name='market-list'),
    path('refresh-prices/', refresh_prices,           name='refresh-prices'),
    path('usd-to-inr/',     get_usd_to_inr,           name='usd-to-inr'),
]