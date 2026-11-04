import decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from transactions.models import Transaction
from notifications.models import Notification


class TransactionAndWithdrawalTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='withdrawer',
            email='withdrawer@example.com',
            password='Password123!',
            usd_balance=decimal.Decimal('100.00'),
        )
        self.client.force_authenticate(user=self.user)

    def test_withdraw_inr_flow(self):
        withdraw_data = {
            'usd_amount': 50,
            'method': 'upi',
            'bank_account': 'testuser@okhdfcbank',
        }
        res = self.client.post('/api/wallet/withdraw-inr/', withdraw_data)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertEqual(self.user.usd_balance, decimal.Decimal('50.00'))

        tx = Transaction.objects.filter(user=self.user, type='withdraw').first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.status, 'pending')
        self.assertEqual(tx.usd_amount, decimal.Decimal('50.00'))

    def test_withdrawal_cancellation_refund_signal(self):
        # Create a pending withdrawal of $40
        tx = Transaction.objects.create(
            user=self.user,
            type='withdraw',
            usd_amount=decimal.Decimal('40.00'),
            inr_amount=decimal.Decimal('3340.00'),
            status='pending',
            notes='Withdrawal request',
        )
        self.user.usd_balance = decimal.Decimal('60.00')
        self.user.save()

        # Admin cancels the transaction
        tx.status = 'cancelled'
        tx.save()

        # Check that user received auto-refund
        self.user.refresh_from_db()
        self.assertEqual(self.user.usd_balance, decimal.Decimal('100.00'))

        # Check refund note appended
        tx.refresh_from_db()
        self.assertIn('AUTO-REFUNDED', tx.notes)

        # Check notification was created
        notif = Notification.objects.filter(user=self.user, type='withdraw').first()
        self.assertIsNotNone(notif)
        self.assertIn('refunded', notif.title.lower())
