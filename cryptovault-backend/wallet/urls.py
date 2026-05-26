from django.urls import path
from .views import WalletListView, buy_coin, sell_coin, convert_to_inr, withdraw_inr

urlpatterns = [
    path('',                WalletListView.as_view(), name='wallet-list'),
    path('buy/',            buy_coin,                 name='buy-coin'),
    path('sell/',           sell_coin,                name='sell-coin'),
    path('convert-to-inr/', convert_to_inr,           name='convert-to-inr'),
    path('withdraw-inr/',   withdraw_inr,             name='withdraw-inr'),
]