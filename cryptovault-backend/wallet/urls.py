# wallet/urls.py

from django.urls import path
from .views import (
    WalletListView,
    BuyRequestListView,
    get_payment_settings,
    create_buy_request,
    sell_coin,
    convert_to_inr,
    withdraw_inr,
)

urlpatterns = [
    path('',                    WalletListView.as_view(),     name='wallet-list'),
    path('payment-settings/',   get_payment_settings,         name='payment-settings'),  # public, no auth
    path('buy/',                create_buy_request,           name='buy-request'),
    path('buy-requests/',       BuyRequestListView.as_view(), name='buy-requests'),
    path('sell/',               sell_coin,                    name='sell-coin'),
    path('convert-to-inr/',     convert_to_inr,               name='convert-to-inr'),
    path('withdraw-inr/',       withdraw_inr,                 name='withdraw-inr'),
]