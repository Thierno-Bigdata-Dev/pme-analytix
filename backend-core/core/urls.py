from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

from rest_framework_simplejwt.views import TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static
from .views import (
    MyTokenObtainPairView, 
    RapportPDFView, 
    AbonnementView, 
    WaveWebhookView, 
    simulate_wave_payment, 
    RegisterView, 
    CSVImportView, 
    PMEListView, 
    RendezVousView,
    PaystackCallbackView,
    PaystackWebhookView,
    AlerteListView,
    AlerteDetailView,
    TransactionDetailView,
    FactureView,
    ReconciliationSuggestionView,
    ReconciliationConfirmView
)

def home_view(request):
    return JsonResponse({
        "status": "success",
        "service": "PME Analytix Core Backend (Django)",
        "message": "Service central de pilotage d'analyse financière et de scoring de crédit basé sur l'IA pour les PME de la zone UEMOA (Django Backend)"
    })

urlpatterns = [
    path('', home_view),
    path('api/core/', home_view),
    path('api/core/auth/login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/core/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/core/auth/register/', RegisterView.as_view(), name='auth_register'),
    path('api/core/pmes/', PMEListView.as_view(), name='pmes_list'),
    path('api/core/pme/<int:pme_id>/rapport/', RapportPDFView.as_view(), name='pme_rapport'),
    path('api/core/pme/<int:pme_id>/abonnement/', AbonnementView.as_view(), name='pme_abonnement'),
    path('api/core/pme/<int:pme_id>/import/', CSVImportView.as_view(), name='pme_import'),
    path('api/core/pme/<int:pme_id>/import/<int:transaction_id>/', TransactionDetailView.as_view(), name='pme_transaction_detail'),
    path('api/core/pme/<int:pme_id>/rendezvous/', RendezVousView.as_view(), name='pme_rendezvous'),
    path('api/core/pme/<int:pme_id>/alerts/', AlerteListView.as_view(), name='pme_alerts'),
    path('api/core/pme/<int:pme_id>/alerts/<int:alert_id>/', AlerteDetailView.as_view(), name='pme_alert_detail'),
    path('api/core/pme/<int:pme_id>/factures/', FactureView.as_view(), name='pme_factures'),
    path('api/core/pme/<int:pme_id>/reconciliation/suggerer/', ReconciliationSuggestionView.as_view(), name='pme_reconciliation_suggerer'),
    path('api/core/pme/<int:pme_id>/reconciliation/confirmer/', ReconciliationConfirmView.as_view(), name='pme_reconciliation_confirmer'),
    path('api/core/webhook/wave/', WaveWebhookView.as_view(), name='wave_webhook'),
    path('api/core/webhook/wave/simulate/', simulate_wave_payment, name='wave_simulate'),
    path('api/core/webhook/paystack/', PaystackWebhookView.as_view(), name='paystack_webhook'),
    path('api/core/webhook/paystack/callback/', PaystackCallbackView.as_view(), name='paystack_callback'),
    path('admin/', admin.site.urls),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
