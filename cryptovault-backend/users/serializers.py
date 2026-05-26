from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = ('id', 'email', 'username', 'mobile', 'password', 'password2')

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        return User.objects.create_user(
            email    = validated_data['email'],
            username = validated_data.get('username', validated_data['email'].split('@')[0]),
            mobile   = validated_data.get('mobile', ''),
            password = validated_data['password'],
        )


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = (
            'id', 'email', 'username', 'mobile',
            'usd_balance',
            'is_kyc_verified', 'kyc_status',
            'date_joined',
        )
        read_only_fields = (
            'usd_balance', 'is_kyc_verified',
            'kyc_status', 'date_joined',
        )