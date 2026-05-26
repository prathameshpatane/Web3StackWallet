from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from .models import KYCDocument


class KYCSerializer(serializers.ModelSerializer):
    class Meta:
        model  = KYCDocument
        fields = (
            'id', 'full_name', 'date_of_birth',
            'aadhaar_number', 'aadhaar_front', 'aadhaar_back',
            'pan_number', 'pan_image', 'selfie_image',
            'status', 'rejection_reason', 'submitted_at',
        )
        read_only_fields = ('status', 'rejection_reason', 'submitted_at')


class KYCSubmitView(generics.CreateAPIView):
    """POST /api/kyc/submit/ — user submits documents"""
    serializer_class   = KYCSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        self.request.user.kyc_status = 'pending'
        self.request.user.save()

    def create(self, request, *args, **kwargs):
        existing = KYCDocument.objects.filter(user=request.user).first()
        if existing and existing.status == 'rejected':
            # Allow resubmission if rejected
            serializer = self.get_serializer(existing, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save(status='pending')
            request.user.kyc_status = 'pending'
            request.user.save()
            return Response(serializer.data)
        elif existing:
            return Response({'error': 'KYC already submitted.', 'status': existing.status})
        return super().create(request, *args, **kwargs)


class KYCStatusView(generics.RetrieveAPIView):
    """GET /api/kyc/status/"""
    serializer_class   = KYCSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return KYCDocument.objects.get(user=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        try:
            return super().retrieve(request, *args, **kwargs)
        except KYCDocument.DoesNotExist:
            return Response({'status': 'not_submitted', 'id': None})