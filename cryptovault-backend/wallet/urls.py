# wallet/urls.py — REPLACE your entire file

from django.urls import path
from .views import (
    WalletListView,
    BuyRequestListView,
    create_buy_request,
    convert_to_inr,
    withdraw_inr,
)

urlpatterns = [
    path('',               WalletListView.as_view(),     name='wallet-list'),
    path('buy/',   create_buy_request,           name='buy-request'),
    path('buy-requests/',  BuyRequestListView.as_view(), name='buy-requests'),
    path('convert-to-inr/', convert_to_inr,              name='convert-to-inr'),
    path('withdraw-inr/',   withdraw_inr,                name='withdraw-inr'),
]