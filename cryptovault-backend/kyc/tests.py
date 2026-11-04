from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from kyc.models import KYCDocument
from kyc.admin import _sync_kyc_status
from notifications.models import Notification


class KYCTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='kycuser',
            email='kyc@example.com',
            password='Password123!',
        )
        self.admin = User.objects.create_superuser(
            username='kycadmin',
            email='kycadmin@example.com',
            password='AdminPassword123!',
        )
        self.client.force_authenticate(user=self.user)

    def test_kyc_submission_and_status(self):
        # Initial status
        status_res = self.client.get('/api/kyc/status/')
        self.assertEqual(status_res.status_code, status.HTTP_200_OK)
        self.assertEqual(status_res.data['status'], 'not_submitted')

        # Submit KYC
        submit_data = {
            'full_name': 'John Doe',
            'date_of_birth': '1995-05-15',
            'aadhaar_number': '123456789012',
            'pan_number': 'ABCDE1234F',
        }
        res = self.client.post('/api/kyc/submit/', submit_data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        self.user.refresh_from_db()
        self.assertEqual(self.user.kyc_status, 'pending')
        self.assertFalse(self.user.is_kyc_verified)

    def test_kyc_approval_sync(self):
        kyc = KYCDocument.objects.create(
            user=self.user,
            full_name='Jane Doe',
            date_of_birth='1990-01-01',
            aadhaar_number='987654321012',
            pan_number='ZYXWV9876A',
            status='pending',
        )
        _sync_kyc_status(kyc, 'approved', reviewed_by=self.admin)

        kyc.refresh_from_db()
        self.assertEqual(kyc.status, 'approved')

        self.user.refresh_from_db()
        self.assertTrue(self.user.is_kyc_verified)
        self.assertEqual(self.user.kyc_status, 'approved')

        # Check notification created
        notif = Notification.objects.filter(user=self.user, type='kyc').first()
        self.assertIsNotNone(notif)
        self.assertIn('approved', notif.title.lower())

    def test_kyc_rejection_and_resubmission(self):
        kyc = KYCDocument.objects.create(
            user=self.user,
            full_name='Jane Doe',
            date_of_birth='1990-01-01',
            aadhaar_number='987654321012',
            pan_number='ZYXWV9876A',
            status='pending',
        )
        _sync_kyc_status(kyc, 'rejected', reviewed_by=self.admin, rejection_reason='Blurry image')

        self.user.refresh_from_db()
        self.assertFalse(self.user.is_kyc_verified)
        self.assertEqual(self.user.kyc_status, 'rejected')

        # Resubmit
        res = self.client.post('/api/kyc/submit/', {
            'full_name': 'Jane Doe Corrected',
            'date_of_birth': '1990-01-01',
            'aadhaar_number': '987654321012',
            'pan_number': 'ZYXWV9876A',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertEqual(self.user.kyc_status, 'pending')
