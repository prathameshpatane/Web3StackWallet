from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User


class UserAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('register')
        self.profile_url = reverse('profile')
        self.login_url = reverse('login')
        self.change_password_url = reverse('change-password')

        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'SecurePassword123!',
            'password2': 'SecurePassword123!',
            'mobile': '1234567890',
            'first_name': 'Test',
            'last_name': 'User',
        }

    def test_user_registration_and_login(self):
        response = self.client.post(self.register_url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], 'test@example.com')

        # Test login (using email as USERNAME_FIELD)
        login_res = self.client.post(self.login_url, {
            'email': 'test@example.com',
            'password': 'SecurePassword123!',
        })
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_res.data)

    def test_user_profile_update(self):
        user = User.objects.create_user(
            username='profileuser',
            email='profile@example.com',
            password='Password123!',
            first_name='OldFirst',
            last_name='OldLast',
        )
        self.client.force_authenticate(user=user)

        update_data = {
            'first_name': 'NewFirst',
            'last_name': 'NewLast',
            'mobile': '9876543210',
        }
        response = self.client.put(self.profile_url, update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.first_name, 'NewFirst')
        self.assertEqual(user.last_name, 'NewLast')
        self.assertEqual(user.mobile, '9876543210')

    def test_change_password(self):
        user = User.objects.create_user(
            username='pwduser',
            email='pwd@example.com',
            password='OldPassword123!',
        )
        self.client.force_authenticate(user=user)

        # Fail with wrong current password
        bad_response = self.client.post(self.change_password_url, {
            'current_password': 'WrongPassword!',
            'new_password': 'NewSecurePassword123!',
            'new_password2': 'NewSecurePassword123!',
        })
        self.assertEqual(bad_response.status_code, status.HTTP_400_BAD_REQUEST)

        # Success with correct current password
        good_response = self.client.post(self.change_password_url, {
            'current_password': 'OldPassword123!',
            'new_password': 'NewSecurePassword123!',
            'new_password2': 'NewSecurePassword123!',
        })
        self.assertEqual(good_response.status_code, status.HTTP_200_OK)

        # Verify new password works
        user.refresh_from_db()
        self.assertTrue(user.check_password('NewSecurePassword123!'))
