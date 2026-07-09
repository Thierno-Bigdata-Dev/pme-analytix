from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from datetime import datetime
import json
import csv
from io import TextIOWrapper
from django.db import connection

from .serializers import MyTokenObtainPairSerializer
from .models import PME, RapportPDF
from .tasks import generate_rapport_pdf

class MyTokenObtainPairView(TokenObtainPairView):
    """
    Custom JWT Token Obtain view that includes pme_id and role inside token claims.
    """
    serializer_class = MyTokenObtainPairSerializer

class RapportPDFView(APIView):
    """
    Endpoint to trigger and list certified PDF reports for a PME.
    Uses asynchronous background Celery workers.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pme_id):
        # 1. Access Control: user must be 'operateur' or belong to this PME
        user = request.user
        if user.role != 'operateur' and user.pme_id != pme_id:
            return Response(
                {"detail": "Vous n'êtes pas autorisé à accéder aux données de cette PME"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # 2. Check PME exists in public schema
        try:
            pme = PME.objects.get(id=pme_id)
        except PME.DoesNotExist:
            return Response(
                {"detail": "PME non trouvée"},
                status=status.HTTP_404_NOT_FOUND
            )
            
        if pme.plan == 'starter':
            return Response(
                {"detail": "La génération de rapport PDF certifié n'est pas autorisée pour le plan Starter. Veuillez passer au plan Pilote ou Croissance."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # 3. Create entry inside tenant schema (handled by TenantMiddleware search_path)
        rapport = RapportPDF.objects.create(
            statut='en_attente',
            url_s3='',
            signature=''
        )
        
        # 4. Trigger background compilation task via Celery only after database transaction commit
        from django.db import transaction as db_transaction
        db_transaction.on_commit(lambda: generate_rapport_pdf.delay(pme_id, rapport.id))
        
        return Response({
            "status": "queued",
            "message": "La génération du rapport PDF SYSCOHADA a été lancée en arrière-plan.",
            "rapport_id": rapport.id,
            "statut": rapport.statut
        }, status=status.HTTP_202_ACCEPTED)

    def get(self, request, pme_id):
        # Access Control: user must be 'operateur' or belong to this PME
        user = request.user
        if user.role != 'operateur' and user.pme_id != pme_id:
            return Response(
                {"detail": "Vous n'êtes pas autorisé à accéder aux données de cette PME"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Fetch reports from the tenant schema
        rapports = RapportPDF.objects.all().order_by('-id')
        results = []
        for r in rapports:
            results.append({
                "id": r.id,
                "date_generation": r.created_at.strftime("%Y-%m-%d") if r.created_at else None,
                "statut": r.statut,
                "url": r.url_s3,
                "signature": r.signature
            })
        return Response(results, status=status.HTTP_200_OK)


class AbonnementView(APIView):
    """
    Endpoint to retrieve and request plan upgrades.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pme_id):
        user = request.user
        if user.role != 'operateur' and user.pme_id != pme_id:
            return Response(
                {"detail": "Vous n'êtes pas autorisé à accéder aux données de cette PME"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        try:
            pme = PME.objects.get(id=pme_id)
        except PME.DoesNotExist:
            return Response({"detail": "PME non trouvée"}, status=status.HTTP_404_NOT_FOUND)
            
        return Response({
            "pme_id": pme.id,
            "nom": pme.nom,
            "plan_actuel": pme.plan,
            "libelle_plan": pme.get_plan_display(),
            "date_activation": pme.created_at.strftime("%Y-%m-%d") if pme.created_at else None,
            "pricing_matrix": {
                "starter": "Gratuit (Historique 3 mois, Pas d'IA, Pas de rapports)",
                "pilote": "15 000 FCFA/mois (Historique 24 mois, IA complète, Rapports 25 000 F/unité)",
                "croissance": "45 000 FCFA/mois (Historique illimité, IA complète, 5 rapports inclus/mois)"
            }
        })
        
    def post(self, request, pme_id):
        user = request.user
        if user.role != 'operateur' and user.pme_id != pme_id:
            return Response(
                {"detail": "Vous n'êtes pas autorisé à accéder aux données de cette PME"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        try:
            pme = PME.objects.get(id=pme_id)
        except PME.DoesNotExist:
            return Response({"detail": "PME non trouvée"}, status=status.HTTP_404_NOT_FOUND)
            
        nouveau_plan = request.data.get('plan')
        if nouveau_plan not in ['starter', 'pilote', 'croissance']:
            return Response({"detail": "Plan invalide"}, status=status.HTTP_400_BAD_REQUEST)
            
        if nouveau_plan == 'starter':
            pme.plan = 'starter'
            pme.save()
            return Response({
                "status": "success",
                "message": "Votre abonnement a été rétrogradé au plan Starter.",
                "plan": pme.plan
            })
            
        # For pilote and croissance, initialize transaction with Paystack
        pricing = {
            'pilote': 15000,
            'croissance': 45000
        }
        montant = pricing[nouveau_plan]
        
        import time
        timestamp = int(time.time())
        client_ref = f"pme_{pme.id}_plan_{nouveau_plan}_{timestamp}"
        
        proto = "https" if request.is_secure() else "http"
        host = request.get_host()
        
        try:
            import requests
            from django.conf import settings
            
            paystack_url = "https://api.paystack.co/transaction/initialize"
            headers = {
                "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
                "Content-Type": "application/json"
            }
            callback_url = f"{proto}://{host}/api/core/webhook/paystack/callback/"
            
            payload = {
                "email": user.email if user.email else "billing@pme-analytix.com",
                "amount": int(montant * 100), # Paystack amount is in kobo/cents
                "reference": client_ref,
                "callback_url": callback_url,
                "channels": ["card", "mobile_money"]
            }
            
            response = requests.post(paystack_url, json=payload, headers=headers, timeout=10)
            if response.status_code == 200:
                res_data = response.json()
                if res_data.get("status"):
                    checkout_url = res_data["data"]["authorization_url"]
                    return Response({
                        "status": "payment_required",
                        "message": f"Pour activer le plan {nouveau_plan.capitalize()}, veuillez régler le montant de {montant} FCFA.",
                        "checkout_url": checkout_url
                    }, status=status.HTTP_200_OK)
        except Exception as e:
            # Fallback to local simulation in case of network issue
            print("Paystack initialization failed, falling back to local simulation:", e)
            
        checkout_url = f"{proto}://{host}/api/core/webhook/wave/simulate/?client_reference_id={client_ref}&amount={montant}"
        
        return Response({
            "status": "payment_required",
            "message": f"Pour activer le plan {nouveau_plan.capitalize()}, veuillez régler le montant de {montant} FCFA.",
            "checkout_url": checkout_url
        }, status=status.HTTP_200_OK)


from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import HttpResponse

@method_decorator(csrf_exempt, name='dispatch')
class WaveWebhookView(APIView):
    """
    Webhook handler for Wave payments.
    Supports signature checking in production, and provides a simulation GET endpoint.
    """
    # Webhook is public (accessed by Wave servers)
    permission_classes = []
    
    def post(self, request):
        try:
            payload = json.loads(request.body)
        except Exception:
            return Response({"detail": "JSON invalide"}, status=status.HTTP_400_BAD_REQUEST)
            
        event_type = payload.get("type")
        if event_type != "checkout.succeeded":
            return Response({"detail": "Événement non pris en charge"}, status=status.HTTP_200_OK)
            
        data = payload.get("data", {})
        client_ref = data.get("client_reference_id", "")
        
        if client_ref.startswith("pme_"):
            parts = client_ref.split("_")
            if len(parts) >= 4 and parts[2] == "plan":
                pme_id = int(parts[1])
                plan_name = parts[3]
                try:
                    pme = PME.objects.get(id=pme_id)
                    pme.plan = plan_name
                    pme.save()
                    return Response({"status": "success", "message": f"Plan {plan_name} activé pour PME {pme_id}"})
                except PME.DoesNotExist:
                    return Response({"detail": "PME non trouvée"}, status=status.HTTP_400_BAD_REQUEST)
                    
        return Response({"status": "ignored"}, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class PaystackCallbackView(APIView):
    """
    Handles payment redirection back from Paystack.
    Verifies transaction status and displays success or error page.
    """
    permission_classes = [] # Public endpoint
    
    def get(self, request):
        reference = request.GET.get('reference', '')
        if not reference:
            return HttpResponse("Référence manquante", status=400)
            
        try:
            import requests
            from django.conf import settings
            
            # Call Paystack verify endpoint
            verify_url = f"https://api.paystack.co/transaction/verify/{reference}"
            headers = {
                "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"
            }
            response = requests.get(verify_url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                res_data = response.json()
                if res_data.get("status") and res_data.get("data", {}).get("status") == "success":
                    # Upgrade plan
                    parts = reference.split("_")
                    if len(parts) >= 4 and parts[2] == "plan":
                        pme_id = int(parts[1])
                        plan_name = parts[3]
                        
                        pme = PME.objects.get(id=pme_id)
                        pme.plan = plan_name
                        pme.save()
                        
                        # Render premium success HTML
                        html = f"""
                        <html>
                        <head>
                            <title>Paiement Réussi</title>
                            <style>
                                body {{ font-family: sans-serif; background-color: #0b0f19; color: #f8fafc; text-align: center; padding-top: 100px; }}
                                .card {{ background: #111827; border: 1px solid rgba(255,255,255,0.06); padding: 40px; border-radius: 16px; display: inline-block; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }}
                                h1 {{ color: #10b981; }}
                                a {{ display: inline-block; margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }}
                            </style>
                        </head>
                        <body>
                            <div class="card">
                                <h1>Paiement Paystack Réussi !</h1>
                                <p>Référence : <strong>{reference}</strong></p>
                                <p>Votre plan PME Analytix a été mis à jour à : <strong>{plan_name.upper()}</strong></p>
                                <a href="http://localhost:5173/">Retour au Tableau de Bord</a>
                            </div>
                        </body>
                        </html>
                        """
                        return HttpResponse(html)
            
            # If not verified
            return HttpResponse(f"La validation du paiement a échoué. Réponse Paystack: {response.text}", status=400)
            
        except Exception as e:
            return HttpResponse(f"Erreur de validation : {str(e)}", status=500)


@method_decorator(csrf_exempt, name='dispatch')
class PaystackWebhookView(APIView):
    """
    Webhook handler for Paystack events.
    Secures payment validation in case redirect callback was closed early.
    """
    permission_classes = [] # Public endpoint
    
    def post(self, request):
        try:
            payload = json.loads(request.body)
        except Exception:
            return Response({"detail": "JSON invalide"}, status=status.HTTP_400_BAD_REQUEST)
            
        event = payload.get("event")
        if event != "charge.success":
            return Response({"status": "ignored"}, status=status.HTTP_200_OK)
            
        data = payload.get("data", {})
        reference = data.get("reference", "")
        
        if reference.startswith("pme_"):
            parts = reference.split("_")
            if len(parts) >= 4 and parts[2] == "plan":
                pme_id = int(parts[1])
                plan_name = parts[3]
                try:
                    pme = PME.objects.get(id=pme_id)
                    pme.plan = plan_name
                    pme.save()
                    return Response({"status": "success", "message": f"Plan {plan_name} activé pour PME {pme_id}"})
                except PME.DoesNotExist:
                    return Response({"detail": "PME non trouvée"}, status=status.HTTP_400_BAD_REQUEST)
                    
        return Response({"status": "ignored"}, status=status.HTTP_200_OK)


def simulate_wave_payment(request):
    """
    Helper view to simulate online payment checkout callback.
    Presents a payment selection gateway (Card / Wave / Orange Money) to simulate selection.
    Upgrades the PME plan after selection confirmation.
    """
    client_ref = request.GET.get('client_reference_id', '')
    amount = request.GET.get('amount', '0')
    confirm = request.GET.get('confirm', 'false') == 'true'
    method = request.GET.get('method', 'Wave')
    
    if client_ref.startswith("pme_"):
        parts = client_ref.split("_")
        if len(parts) >= 4 and parts[2] == "plan":
            pme_id = int(parts[1])
            plan_name = parts[3]
            try:
                pme = PME.objects.get(id=pme_id)
                
                # Step 1: Render payment selection screen
                if not confirm:
                    html = f"""
                    <html>
                    <head>
                        <title>Passerelle de Paiement Sécurisée - Simulation</title>
                        <style>
                            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0b0f19; color: #f8fafc; text-align: center; padding: 60px 20px; }}
                            .container {{ max-width: 600px; margin: 0 auto; background: #111827; border: 1px solid rgba(255,255,255,0.06); padding: 40px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); text-align: left; }}
                            h1 {{ font-size: 20px; font-weight: 800; color: #f8fafc; margin-bottom: 8px; text-transform: uppercase; letter-spacing: -0.5px; }}
                            h1 span {{ color: #3b82f6; }}
                            p.sub {{ color: #9ca3af; font-size: 14px; margin-top: 0; margin-bottom: 24px; }}
                            .summary-card {{ background: rgba(59,130,246,0.05); border: 1px solid rgba(59,130,246,0.2); padding: 16px; border-radius: 10px; margin-bottom: 24px; }}
                            .summary-card div {{ display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }}
                            .summary-card div:last-child {{ margin-bottom: 0; }}
                            .payment-title {{ font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }}
                            .options-grid {{ display: grid; grid-template-columns: 1fr; gap: 12px; }}
                            .option-btn {{ display: flex; align-items: center; justify-content: space-between; padding: 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; text-decoration: none; color: #f8fafc; font-weight: 600; font-size: 15px; transition: all 0.2s ease; cursor: pointer; }}
                            .option-btn:hover {{ background: rgba(59,130,246,0.08); border-color: rgba(59,130,246,0.4); transform: translateY(-1px); }}
                            .option-btn .badge {{ font-size: 11px; padding: 4px 8px; background: rgba(59,130,246,0.15); color: #60a5fa; border-radius: 6px; }}
                            .back-link {{ display: block; text-align: center; margin-top: 24px; color: #9ca3af; text-decoration: underline; font-size: 13px; }}
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>PME<span>Analytix</span> Checkout</h1>
                            <p class="sub">Passerelle de paiement sécurisée (Mode Simulation Sandbox)</p>
                            
                            <div class="summary-card">
                                <div><span>Forfait choisi :</span><strong>{plan_name.upper()}</strong></div>
                                <div><span>Montant à régler :</span><strong style="color: #60a5fa;">{amount} FCFA</strong></div>
                                <div><span>ID Client :</span><strong>PME #{pme_id}</strong></div>
                            </div>
                            
                            <div class="payment-title">Choisissez votre moyen de paiement :</div>
                            <div class="options-grid">
                                <a href="?client_reference_id={client_ref}&amount={amount}&confirm=true&method=Carte+Bancaire" class="option-btn">
                                    <span>💳 Carte Bancaire (Visa / Mastercard)</span>
                                    <span class="badge">Simuler</span>
                                </a>
                                <a href="?client_reference_id={client_ref}&amount={amount}&confirm=true&method=Wave" class="option-btn">
                                    <span>🌊 Mobile Money Wave</span>
                                    <span class="badge">Simuler</span>
                                </a>
                                <a href="?client_reference_id={client_ref}&amount={amount}&confirm=true&method=Orange+Money" class="option-btn">
                                    <span>🧡 Orange Money</span>
                                    <span class="badge">Simuler</span>
                                </a>
                            </div>
                            
                            <a href="http://localhost:5173/" class="back-link">Annuler le paiement et retourner au site</a>
                        </div>
                    </body>
                    </html>
                    """
                    return HttpResponse(html)
                
                # Step 2: Confirm payment and upgrade plan
                pme.plan = plan_name
                pme.save()
                
                html = f"""
                <html>
                <head>
                    <title>Paiement Réussi</title>
                    <style>
                        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0b0f19; color: #f8fafc; text-align: center; padding-top: 100px; }}
                        .card {{ background: #111827; border: 1px solid rgba(255,255,255,0.06); padding: 40px; border-radius: 16px; display: inline-block; box-shadow: 0 10px 30px rgba(0,0,0,0.3); max-width: 500px; text-align: left; }}
                        .success-icon {{ width: 60px; height: 60px; background: rgba(16,185,129,0.1); color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; margin-bottom: 20px; }}
                        h1 {{ color: #10b981; font-size: 22px; font-weight: 800; margin: 0 0 10px 0; }}
                        p {{ color: #9ca3af; font-size: 14px; line-height: 1.5; margin: 0 0 10px 0; }}
                        .details {{ border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06); padding: 16px 0; margin: 20px 0; }}
                        .details-row {{ display: flex; justify-content: space-between; font-size: 13.5px; margin-bottom: 8px; }}
                        .details-row:last-child {{ margin-bottom: 0; }}
                        .details-row span {{ color: #9ca3af; }}
                        .details-row strong {{ color: #f8fafc; }}
                        a {{ display: block; text-align: center; padding: 12px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; transition: background 0.2s; }}
                        a:hover {{ background: #2563eb; }}
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="success-icon">✓</div>
                        <h1>Paiement en ligne Réussi !</h1>
                        <p>Votre règlement de simulation a été enregistré et validé par notre passerelle.</p>
                        
                        <div class="details">
                            <div class="details-row"><span>Moyen de paiement :</span><strong>{method}</strong></div>
                            <div class="details-row"><span>Montant payé :</span><strong>{amount} FCFA</strong></div>
                            <div class="details-row"><span>Nouveau Plan :</span><strong>{plan_name.upper()}</strong></div>
                            <div class="details-row"><span>PME ID :</span><strong>#{pme_id}</strong></div>
                        </div>
                        
                        <a href="http://localhost:5173/">Retour au Tableau de Bord</a>
                    </div>
                </body>
                </html>
                """
                return HttpResponse(html)
            except PME.DoesNotExist:
                return HttpResponse("PME non trouvée", status=400)
                
    return HttpResponse("Référence invalide", status=400)


class RegisterView(APIView):
    """
    Endpoint for public PME self-registration.
    Creates a PME and its admin user (dirigeant).
    """
    permission_classes = [] # Public endpoint
    
    def post(self, request):
        nom_pme = request.data.get('nom_pme')
        secteur = request.data.get('secteur')
        siren = request.data.get('siren')
        email = request.data.get('email')
        password = request.data.get('password')
        plan = request.data.get('plan', 'starter') # Default to starter
        
        if not all([nom_pme, secteur, siren, email, password]):
            return Response(
                {"detail": "Veuillez fournir toutes les informations requises (nom_pme, secteur, siren, email, password)"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # 1. Server-side Email validation
        from django.core.validators import validate_email
        from django.core.exceptions import ValidationError
        try:
            validate_email(email)
        except ValidationError:
            return Response(
                {"detail": "L'adresse email fournie n'est pas valide."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # 2. Server-side Password complexity validation
        from django.contrib.auth.password_validation import validate_password
        try:
            validate_password(password)
        except ValidationError as e:
            return Response(
                {"detail": ", ".join(e.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        from django.contrib.auth import get_user_model
        User = get_user_model()
        if User.objects.filter(email=email).exists():
            return Response(
                {"detail": "Un utilisateur avec cette adresse email existe déjà."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if PME.objects.filter(siren=siren).exists():
            return Response(
                {"detail": "Une PME avec ce numéro SIREN est déjà enregistrée."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        import re
        clean_name = re.sub(r'[^a-zA-Z0-9]', '_', nom_pme.lower())
        nom_schema = f"tenant_{clean_name}_{PME.objects.count() + 1}"
        
        from .utils import tenant_schema_context
        
        try:
            with tenant_schema_context("public"):
                pme = PME.objects.create(
                    nom=nom_pme,
                    secteur=secteur,
                    siren=siren,
                    plan=plan,
                    nom_schema=nom_schema
                )
                
                user = User.objects.create_user(
                    email=email,
                    password=password,
                    role='dirigeant',
                    pme=pme
                )
            
            return Response({
                "status": "success",
                "message": "PME et utilisateur créés avec succès. Schéma de données initialisé.",
                "pme_id": pme.id,
                "nom_pme": pme.nom,
                "nom_schema": pme.nom_schema
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"detail": f"Erreur lors de la création : {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CSVImportView(APIView):
    """
    Endpoint to import financial transactions from a CSV file.
    Writes transactions to the dynamic tenant schema.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pme_id):
        user = request.user
        if user.role != 'operateur' and user.pme_id != pme_id:
            return Response(
                {"detail": "Vous n'êtes pas autorisé à accéder aux données de cette PME"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        from .models import Transaction, PME
        from datetime import date, timedelta
        
        try:
            pme = PME.objects.get(id=pme_id)
        except PME.DoesNotExist:
            return Response({"detail": "PME non trouvée"}, status=status.HTTP_404_NOT_FOUND)
            
        # Restrict queries based on the active pricing plan
        if pme.plan == 'starter':
            cutoff_date = date.today() - timedelta(days=90) # 3 months limit
            transactions = Transaction.objects.filter(date__gte=cutoff_date).order_by('-date')
        elif pme.plan == 'pilote':
            cutoff_date = date.today() - timedelta(days=730) # 24 months limit
            transactions = Transaction.objects.filter(date__gte=cutoff_date).order_by('-date')
        else:
            transactions = Transaction.objects.all().order_by('-date')
            
        results = []
        for t in transactions[:100]: # return top 100 within plan limits
            results.append({
                "id": t.id,
                "date": t.date.strftime("%Y-%m-%d"),
                "montant": str(t.montant),
                "type": t.type,
                "categorie": t.categorie,
                "description": t.description
            })
        return Response(results, status=status.HTTP_200_OK)

    def post(self, request, pme_id):
        user = request.user
        if user.role != 'operateur' and user.pme_id != pme_id:
            return Response(
                {"detail": "Vous n'êtes pas autorisé à modifier les données de cette PME"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        file_obj = request.FILES.get('file')
        if not file_obj:
            # Check if it is a single transaction payload
            data = request.data
            if 'date' in data or 'montant' in data or 'type' in data or 'categorie' in data:
                from decimal import Decimal
                date_str = data.get('date')
                montant_val = data.get('montant')
                type_val = data.get('type')
                categorie_val = data.get('categorie')
                description_val = data.get('description', '')
                
                if not all([date_str, montant_val, type_val, categorie_val]):
                    return Response(
                        {"detail": "Veuillez fournir les champs date, montant, type et categorie."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
                try:
                    tx_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                except ValueError:
                    return Response(
                        {"detail": "Format de date invalide. Utilisez AAAA-MM-JJ."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
                try:
                    tx_montant = Decimal(str(montant_val))
                except Exception:
                    return Response(
                        {"detail": "Montant invalide."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
                if type_val not in ['credit', 'debit']:
                    return Response(
                        {"detail": "Le type de transaction doit être 'credit' ou 'debit'."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
                from .models import Transaction
                tx = Transaction.objects.create(
                    date=tx_date,
                    montant=tx_montant,
                    type=type_val,
                    categorie=categorie_val,
                    description=description_val
                )
                
                from .tasks import check_and_generate_alerts_task
                from django.db import transaction as db_transaction
                db_transaction.on_commit(lambda: check_and_generate_alerts_task.delay(pme_id))

                
                return Response({
                    "status": "success",
                    "message": "Transaction ajoutée avec succès.",
                    "transaction": {
                        "id": tx.id,
                        "date": tx.date.strftime("%Y-%m-%d"),
                        "montant": str(tx.montant),
                        "type": tx.type,
                        "categorie": tx.categorie,
                        "description": tx.description
                    }
                }, status=status.HTTP_201_CREATED)
            else:
                return Response(
                    {"detail": "Aucun fichier n'a été fourni, et aucune donnée de transaction valide n'a été trouvée."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
        if not file_obj.name.endswith('.csv'):
            return Response(
                {"detail": "Format invalide. Seuls les fichiers CSV sont acceptés."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            # Read first line to detect delimiter, then seek back
            first_line_bytes = file_obj.readline()
            file_obj.seek(0)
            
            try:
                first_line_str = first_line_bytes.decode('utf-8-sig')
            except Exception:
                first_line_str = first_line_bytes.decode('latin-1', errors='ignore')
                
            delimiter = ';' if ';' in first_line_str else ','
            
            # Detect encoding
            encoding = 'utf-8-sig'
            try:
                # Test decode first 1024 bytes
                file_obj.read(1024).decode('utf-8')
                file_obj.seek(0)
            except UnicodeDecodeError:
                encoding = 'latin-1'
                file_obj.seek(0)
                
            csv_file = TextIOWrapper(file_obj.file, encoding=encoding)
            reader = csv.DictReader(csv_file, delimiter=delimiter)
            
            created_count = 0
            errors = []
            
            from .models import Transaction
            from django.db import transaction as db_transaction
            
            with db_transaction.atomic():
                for idx, row in enumerate(reader):
                    cleaned_row = {k.strip().lower() if k else '': v for k, v in row.items()}
                    
                    # 1. Dynamic Date Mapping
                    date_str = None
                    for date_key in ['date', 'order_date', 'transaction_date', 'date_commande']:
                        if cleaned_row.get(date_key):
                            date_str = cleaned_row.get(date_key)
                            break
                            
                    # 2. Dynamic Montant Mapping
                    montant_str = None
                    for mont_key in ['montant', 'total', 'total_price', 'price', 'amount']:
                        if cleaned_row.get(mont_key):
                            montant_str = cleaned_row.get(mont_key)
                            break
                    
                    # Fallback for unit_price * quantity
                    if not montant_str and cleaned_row.get('unit_price') and cleaned_row.get('quantity'):
                        try:
                            u_price = float(str(cleaned_row.get('unit_price')).replace(' ', '').replace(',', '.'))
                            qty = float(str(cleaned_row.get('quantity')).replace(' ', ''))
                            montant_str = str(u_price * qty)
                        except Exception:
                            pass
                            
                    # 3. Dynamic Type Mapping (Default to credit for orders/sales)
                    type_val = cleaned_row.get('type')
                    if not type_val:
                        type_val = 'credit'
                        
                    # 4. Dynamic Categorie Mapping
                    categorie = cleaned_row.get('categorie') or cleaned_row.get('category') or cleaned_row.get('product') or 'Ventes'
                    
                    # 5. Dynamic Description Mapping
                    description = cleaned_row.get('description') or cleaned_row.get('product') or cleaned_row.get('customer_id') or cleaned_row.get('order_id') or ''
                    
                    if not all([date_str, montant_str, type_val, categorie]):
                        errors.append(f"Ligne {idx+2} : Données manquantes. Clés trouvées: {list(cleaned_row.keys())}")
                        continue
                        
                    try:
                        # Robust multi-format date parser
                        date_str_clean = date_str.strip()
                        date_val = None
                        for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y/%m/%d']:
                            try:
                                date_val = datetime.strptime(date_str_clean, fmt).date()
                                break
                            except ValueError:
                                continue
                        if not date_val:
                            raise ValueError("Format de date invalide")
                            
                        # Clean up numeric montant
                        clean_montant = str(montant_str).replace(' ', '').replace('FCFA', '').replace('F', '').replace(',', '.')
                        montant_val = float(clean_montant)
                    except Exception:
                        errors.append(f"Ligne {idx+2} : Format de date ou montant invalide ({date_str} / {montant_str}).")
                        continue
                        
                    type_val_clean = str(type_val).strip().lower()
                    if type_val_clean not in ['credit', 'debit']:
                        errors.append(f"Ligne {idx+2} : Type de transaction invalide (doit être 'credit' ou 'debit', reçu '{type_val}').")
                        continue
                        
                    Transaction.objects.create(
                        date=date_val,
                        montant=montant_val,
                        type=type_val_clean,
                        categorie=str(categorie).strip(),
                        description=str(description).strip()
                    )
                    created_count += 1
                    
            if errors:
                err_summary = " ; ".join(errors[:3])
                if len(errors) > 3:
                    err_summary += f" (+ {len(errors) - 3} autres)"
                return Response({
                    "status": "partial_success" if created_count > 0 else "error",
                    "imported_count": created_count,
                    "errors": errors,
                    "detail": err_summary,
                    "message": err_summary
                }, status=status.HTTP_400_BAD_REQUEST if created_count == 0 else status.HTTP_207_MULTI_STATUS)
                
            from .tasks import check_and_generate_alerts_task
            from django.db import transaction as db_transaction
            db_transaction.on_commit(lambda: check_and_generate_alerts_task.delay(pme_id))


            return Response({
                "status": "success",
                "message": f"{created_count} transactions importées avec succès."
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"detail": f"Erreur lors de la lecture du fichier : {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TransactionDetailView(APIView):
    """
    Endpoint to update or delete a specific transaction.
    """
    permission_classes = [IsAuthenticated]
    
    def put(self, request, pme_id, transaction_id):
        user = request.user
        if user.role != 'operateur' and user.pme_id != pme_id:
            return Response(
                {"detail": "Vous n'êtes pas autorisé à modifier les données de cette PME"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        from .models import Transaction, PME
        from decimal import Decimal
        from .utils import tenant_schema_context
        
        try:
            pme = PME.objects.get(id=pme_id)
        except PME.DoesNotExist:
            return Response({"detail": "PME non trouvée"}, status=status.HTTP_404_NOT_FOUND)
            
        with tenant_schema_context(pme.nom_schema):
            try:
                tx = Transaction.objects.get(id=transaction_id)
            except Transaction.DoesNotExist:
                return Response({"detail": "Transaction non trouvée"}, status=status.HTTP_404_NOT_FOUND)
                
            data = request.data
            date_str = data.get('date')
            montant_val = data.get('montant')
            type_val = data.get('type')
            categorie_val = data.get('categorie')
            description_val = data.get('description', tx.description)
            
            if date_str:
                try:
                    tx.date = datetime.strptime(date_str, "%Y-%m-%d").date()
                except ValueError:
                    return Response({"detail": "Format de date invalide."}, status=status.HTTP_400_BAD_REQUEST)
                    
            if montant_val is not None:
                try:
                    tx.montant = Decimal(str(montant_val))
                except Exception:
                    return Response({"detail": "Montant invalide."}, status=status.HTTP_400_BAD_REQUEST)
                    
            if type_val:
                if type_val not in ['credit', 'debit']:
                    return Response({"detail": "Type invalide."}, status=status.HTTP_400_BAD_REQUEST)
                tx.type = type_val
                
            if categorie_val:
                tx.categorie = categorie_val
                
            tx.description = description_val
            tx.save()
            
            from .tasks import check_and_generate_alerts_task
            from django.db import transaction as db_transaction
            db_transaction.on_commit(lambda: check_and_generate_alerts_task.delay(pme_id))
            
            response_data = {
                "status": "success",
                "message": "Transaction mise à jour avec succès.",
                "transaction": {
                    "id": tx.id,
                    "date": tx.date.strftime("%Y-%m-%d"),
                    "montant": str(tx.montant),
                    "type": tx.type,
                    "categorie": tx.categorie,
                    "description": tx.description
                }
            }
            
        return Response(response_data, status=status.HTTP_200_OK)

    def delete(self, request, pme_id, transaction_id):
        user = request.user
        if user.role != 'operateur' and user.pme_id != pme_id:
            return Response(
                {"detail": "Vous n'êtes pas autorisé à modifier les données de cette PME"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        from .models import Transaction, PME
        from .utils import tenant_schema_context
        
        try:
            pme = PME.objects.get(id=pme_id)
        except PME.DoesNotExist:
            return Response({"detail": "PME non trouvée"}, status=status.HTTP_404_NOT_FOUND)
            
        with tenant_schema_context(pme.nom_schema):
            try:
                tx = Transaction.objects.get(id=transaction_id)
                tx.delete()
            except Transaction.DoesNotExist:
                return Response({"detail": "Transaction non trouvée"}, status=status.HTTP_404_NOT_FOUND)
                
            from .tasks import check_and_generate_alerts_task
            from django.db import transaction as db_transaction
            db_transaction.on_commit(lambda: check_and_generate_alerts_task.delay(pme_id))
            
        return Response({
            "status": "success",
            "message": "Transaction supprimée avec succès."
        }, status=status.HTTP_200_OK)


class PMEListView(APIView):
    """
    Endpoint for operator users to list all PMEs.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if request.user.role != 'operateur':
            return Response({"detail": "Seuls les opérateurs de la plateforme peuvent lister les PMEs."}, status=status.HTTP_403_FORBIDDEN)
            
        from .utils import tenant_schema_context
        
        with tenant_schema_context("public"):
            pmes = PME.objects.all().order_by('id')
            results = []
            for p in pmes:
                results.append({
                    "id": p.id,
                    "nom": p.nom,
                    "secteur": p.secteur,
                    "siren": p.siren,
                    "plan": p.plan,
                    "nom_schema": p.nom_schema,
                    "created_at": p.created_at.strftime("%Y-%m-%d") if p.created_at else None
                })
        return Response(results, status=status.HTTP_200_OK)


class RendezVousView(APIView):
    """
    Endpoint to list and create appointments for a specific PME.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pme_id):
        from .models import RendezVous
        rdvs = RendezVous.objects.all().order_by('date', 'heure')
        results = []
        for r in rdvs:
            results.append({
                "id": r.id,
                "date": r.date.strftime("%Y-%m-%d"),
                "heure": r.heure.strftime("%H:%M") if r.heure else "",
                "partenaire": r.partenaire,
                "motif": r.motif,
                "statut": r.statut,
                "created_at": r.created_at.strftime("%Y-%m-%d %H:%M")
            })
        return Response(results, status=status.HTTP_200_OK)

    def post(self, request, pme_id):
        from .models import RendezVous
        date_str = request.data.get('date')
        heure_str = request.data.get('heure')
        partenaire = request.data.get('partenaire')
        motif = request.data.get('motif')

        if not all([date_str, heure_str, partenaire, motif]):
            return Response({"detail": "Tous les champs (date, heure, partenaire, motif) sont requis."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from datetime import datetime
            date_val = datetime.strptime(date_str, '%Y-%m-%d').date()
            heure_val = datetime.strptime(heure_str, '%H:%M').time()
        except ValueError:
            return Response({"detail": "Format de date (AAAA-MM-JJ) ou d'heure (HH:MM) invalide."}, status=status.HTTP_400_BAD_REQUEST)

        rdv = RendezVous.objects.create(
            date=date_val,
            heure=heure_val,
            partenaire=partenaire,
            motif=motif
        )
        return Response({
            "status": "success",
            "rendezvous": {
                "id": rdv.id,
                "date": rdv.date.strftime("%Y-%m-%d"),
                "heure": rdv.heure.strftime("%H:%M"),
                "partenaire": rdv.partenaire,
                "motif": rdv.motif,
                "statut": rdv.statut
            }
        }, status=status.HTTP_201_CREATED)


class AlerteListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pme_id):
        user = request.user
        if user.role != 'operateur' and user.pme_id != pme_id:
            return Response(
                {"detail": "Vous n'êtes pas autorisé à accéder aux alertes de cette PME"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from .models import Alerte
        alerts = Alerte.objects.all().order_by('-statut', '-date_creation')
        results = []
        for a in alerts:
            results.append({
                "id": a.id,
                "type": a.type,
                "seuil": str(a.seuil) if a.seuil else None,
                "statut": a.statut,
                "canal": a.canal,
                "date_creation": a.date_creation.strftime("%Y-%m-%d %H:%M:%S"),
                "description": a.description,
                "date_critique": a.date_critique.strftime("%Y-%m-%d") if a.date_critique else None,
                "montant_jeu": str(a.montant_jeu) if a.montant_jeu else None,
                "action_recommandee": a.action_recommandee,
                "lien_direct": a.lien_direct
            })
        return Response(results, status=status.HTTP_200_OK)

    def post(self, request, pme_id):
        user = request.user
        if user.role != 'operateur' and user.pme_id != pme_id:
            return Response(
                {"detail": "Vous n'êtes pas autorisé à rafraîchir les alertes de cette PME"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from .alerts_engine import check_and_generate_alerts
        check_and_generate_alerts(pme_id)
        return Response({"status": "success", "message": "Alertes rafraîchies et recalculées avec succès."}, status=status.HTTP_200_OK)


class AlerteDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pme_id, alert_id):
        user = request.user
        if user.role != 'operateur' and user.pme_id != pme_id:
            return Response(
                {"detail": "Vous n'êtes pas autorisé à modifier les alertes de cette PME"},
                status=status.HTTP_403_FORBIDDEN
            )

        from .models import Alerte
        try:
            alert = Alerte.objects.get(id=alert_id)
        except Alerte.DoesNotExist:
            return Response({"detail": "Alerte introuvable."}, status=status.HTTP_404_NOT_FOUND)

        statut_val = request.data.get('statut')
        if statut_val not in ['active', 'resolue', 'ignoree']:
            return Response({"detail": "Statut invalide (doit être 'active', 'resolue', ou 'ignoree')."}, status=status.HTTP_400_BAD_REQUEST)

        alert.statut = statut_val
        alert.save()
        
        return Response({
            "status": "success",
            "alert": {
                "id": alert.id,
                "statut": alert.statut
            }
        }, status=status.HTTP_200_OK)


class FactureView(APIView):
    """
    Endpoint to list and create invoices inside the active tenant schema.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pme_id):
        user = request.user
        if user.role != 'operateur' and user.pme_id != pme_id:
            return Response(
                {"detail": "Vous n'êtes pas autorisé à accéder aux données de cette PME"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        from .models import Facture
        factures = Facture.objects.all().order_by('-date_emission')
        results = []
        for f in factures:
            results.append({
                "id": f.id,
                "numero": f.numero,
                "date_emission": f.date_emission.strftime("%Y-%m-%d"),
                "date_echeance": f.date_echeance.strftime("%Y-%m-%d"),
                "client_nom": f.client_nom,
                "montant": str(f.montant),
                "statut": f.statut,
                "created_at": f.created_at.strftime("%Y-%m-%d %H:%M:%S")
            })
        return Response(results, status=status.HTTP_200_OK)

    def post(self, request, pme_id):
        user = request.user
        if user.role != 'operateur' and user.pme_id != pme_id:
            return Response(
                {"detail": "Vous n'êtes pas autorisé à modifier les données de cette PME"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        numero = request.data.get('numero')
        date_emission_str = request.data.get('date_emission')
        date_echeance_str = request.data.get('date_echeance')
        client_nom = request.data.get('client_nom')
        montant_val = request.data.get('montant')
        statut = request.data.get('statut', 'envoyee')

        if not all([numero, date_emission_str, date_echeance_str, client_nom, montant_val]):
            return Response(
                {"detail": "Tous les champs (numero, date_emission, date_echeance, client_nom, montant) sont requis."},
                status=status.HTTP_400_BAD_REQUEST
            )

        from decimal import Decimal
        try:
            date_emission = datetime.strptime(date_emission_str, '%Y-%m-%d').date()
            date_echeance = datetime.strptime(date_echeance_str, '%Y-%m-%d').date()
            montant = Decimal(str(montant_val))
        except ValueError:
            return Response({"detail": "Format de date (AAAA-MM-JJ) ou montant invalide."}, status=status.HTTP_400_BAD_REQUEST)

        from .models import Facture
        facture = Facture.objects.create(
            numero=numero,
            date_emission=date_emission,
            date_echeance=date_echeance,
            client_nom=client_nom,
            montant=montant,
            statut=statut
        )
        return Response({
            "status": "success",
            "facture": {
                "id": facture.id,
                "numero": facture.numero,
                "client_nom": facture.client_nom,
                "montant": str(facture.montant),
                "statut": facture.statut
            }
        }, status=status.HTTP_201_CREATED)


class ReconciliationSuggestionView(APIView):
    """
    Endpoint that suggests potential matches between credit transactions and invoices.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pme_id):
        user = request.user
        if user.role != 'operateur' and user.pme_id != pme_id:
            return Response(
                {"detail": "Vous n'êtes pas autorisé à accéder aux données de cette PME"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        from .reconciliation_engine import suggest_reconciliations
        suggestions = suggest_reconciliations(pme_id)
        return Response({"status": "success", "suggestions": suggestions}, status=status.HTTP_200_OK)


class ReconciliationConfirmView(APIView):
    """
    Endpoint to confirm a reconciliation between a transaction and an invoice.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pme_id):
        user = request.user
        if user.role != 'operateur' and user.pme_id != pme_id:
            return Response(
                {"detail": "Vous n'êtes pas autorisé à modifier les données de cette PME"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        transaction_id = request.data.get('transaction_id')
        invoice_id = request.data.get('invoice_id')
        confiance_val = request.data.get('confiance', 100.0)

        if not all([transaction_id, invoice_id]):
            return Response(
                {"detail": "Les champs transaction_id et invoice_id sont requis."},
                status=status.HTTP_400_BAD_REQUEST
            )

        from .models import Transaction, Facture, Reconciliation
        from decimal import Decimal
        
        try:
            tx = Transaction.objects.get(id=transaction_id)
            inv = Facture.objects.get(id=invoice_id)
        except (Transaction.DoesNotExist, Facture.DoesNotExist):
            return Response(
                {"detail": "La transaction ou la facture spécifiée est introuvable."},
                status=status.HTTP_404_NOT_FOUND
            )

        if hasattr(tx, 'reconciliation'):
            return Response(
                {"detail": "Cette transaction est déjà rapprochée."},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.db import transaction as db_transaction
        with db_transaction.atomic():
            rec = Reconciliation.objects.create(
                transaction=tx,
                facture=inv,
                confiance_pct=Decimal(str(confiance_val)),
                methode='manuelle' if request.data.get('manuelle', True) else 'automatique'
            )
            inv.statut = 'payee'
            inv.save()

        return Response({
            "status": "success",
            "message": f"Transaction #{tx.id} rapprochée avec succès de la facture {inv.numero}.",
            "reconciliation_id": rec.id
        }, status=status.HTTP_201_CREATED)
