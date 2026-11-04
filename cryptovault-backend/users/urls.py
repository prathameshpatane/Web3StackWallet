from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, ProfileView, LogoutView, ChangePasswordView

urlpatterns = [
    path('register/',        RegisterView.as_view(),        name='register'),
    path('login/',           TokenObtainPairView.as_view(),  name='login'),
    path('refresh/',         TokenRefreshView.as_view(),     name='token-refresh'),
    path('logout/',          LogoutView.as_view(),           name='logout'),
    path('profile/',         ProfileView.as_view(),          name='profile'),
    path('change-password/', ChangePasswordView.as_view(),   name='change-password'),
]