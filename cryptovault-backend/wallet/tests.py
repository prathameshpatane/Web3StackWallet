import decimal
from django.test import TestCase, RequestFactory
from django.contrib.messages.storage.fallback import FallbackStorage
from django.contrib.sessions.middleware import SessionMiddleware
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.admin.sites import AdminSite
from users.models import User
from coins.models import Coin
from wallet.models import UserWallet, BuyRequest
from wallet.admin import BuyRequestAdmin, _approve_buy_request
from transactions.models import Transaction
from notifications.models import Notification


class WalletAndTradingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='trader',
            email='trader@example.com',
            password='Password123!',
            usd_balance=decimal.Decimal('500.00'),
        )
        self.admin = User.objects.create_superuser(
            username='adminuser',
            email='admin@example.com',
            password='AdminPassword123!',
        )
        self.coin = Coin.objects.create(
            name='Bitcoin',
            symbol='BTC',
            current_price_usd=decimal.Decimal('60000.00'),
            usd_to_inr_rate=decimal.Decimal('85.00'),
            is_active=True,
        )
        self.client.force_authenticate(user=self.user)

    def test_wallet_auto_provisioning(self):
        # User initially has no UserWallet records
        self.assertEqual(UserWallet.objects.filter(user=self.user).count(), 0)

        response = self.client.get('/api/wallet/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Confirm wallet automatically provisioned
        self.assertTrue(UserWallet.objects.filter(user=self.user, coin=self.coin).exists())
        wallet = UserWallet.objects.get(user=self.user, coin=self.coin)
        self.assertEqual(wallet.balance, decimal.Decimal('0'))

    def test_buy_request_and_admin_approval(self):
        buy_data = {
            'coin_id': self.coin.id,
            'usd_amount': 600,
            'inr_amount': 51000,
            'transaction_id': 'TXN123456789',
        }
        response = self.client.post('/api/wallet/buy/', buy_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        buy_req = BuyRequest.objects.get(transaction_id='TXN123456789')
        self.assertEqual(buy_req.status, 'pending')

        # Approve buy request via admin helper
        _approve_buy_request(buy_req, reviewed_by=self.admin)

        buy_req.refresh_from_db()
        self.assertEqual(buy_req.status, 'approved')

        # Verify wallet credited
        wallet = UserWallet.objects.get(user=self.user, coin=self.coin)
        self.assertGreater(wallet.balance, decimal.Decimal('0'))

        # Verify Transaction recorded
        tx = Transaction.objects.filter(user=self.user, type='buy').first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.coin, self.coin)

        # Verify Notification created
        notif = Notification.objects.filter(user=self.user, type='buy').first()
        self.assertIsNotNone(notif)
        self.assertIn('approved', notif.title.lower())

    def test_buy_request_rejection_action(self):
        buy_req = BuyRequest.objects.create(
            user=self.user,
            coin=self.coin,
            usd_amount=decimal.Decimal('100.00'),
            inr_amount=decimal.Decimal('8500.00'),
            coin_quantity=decimal.Decimal('0.0016'),
            coin_price_usd=decimal.Decimal('60000.00'),
            transaction_id='TXN_REJECT_TEST',
            status='pending',
        )
        factory = RequestFactory()
        request = factory.get('/')
        request.user = self.admin
        middleware = SessionMiddleware(lambda r: None)
        middleware.process_request(request)
        request.session.save()
        setattr(request, '_messages', FallbackStorage(request))

        admin_instance = BuyRequestAdmin(BuyRequest, AdminSite())
        admin_instance.reject_requests(request, BuyRequest.objects.filter(id=buy_req.id))

        buy_req.refresh_from_db()
        self.assertEqual(buy_req.status, 'rejected')

        # Verify notification
        notif = Notification.objects.filter(user=self.user, type='buy').first()
        self.assertIsNotNone(notif)
        self.assertIn('rejected', notif.title.lower())

    def test_sell_coin_flow(self):
        # Give user 0.1 BTC
        wallet, _ = UserWallet.objects.get_or_create(user=self.user, coin=self.coin)
        wallet.balance = decimal.Decimal('0.1')
        wallet.save()

        initial_usd = self.user.usd_balance

        sell_data = {
            'coin_id': self.coin.id,
            'coin_amount': 0.05,
        }
        response = self.client.post('/api/wallet/sell/', sell_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, decimal.Decimal('0.05'))

        self.user.refresh_from_db()
        self.assertGreater(self.user.usd_balance, initial_usd)

        # Verify notification and transaction
        notif = Notification.objects.filter(user=self.user, type='sell').first()
        self.assertIsNotNone(notif)
        tx = Transaction.objects.filter(user=self.user, type='sell').first()
        self.assertIsNotNone(tx)
