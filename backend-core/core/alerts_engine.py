# pyright: reportMissingImports=false
import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from django.db import connection
from django.conf import settings
from rest_framework_simplejwt.tokens import AccessToken
from core.models import Transaction, Alerte, PME

def get_system_token(pme_id):
    """
    Generates a valid system JWT token for the backend to communicate with the ML service.
    """
    token = AccessToken()
    token['role'] = 'operateur'
    token['email'] = 'system-alerts-engine@pme-analytix.com'
    token['pme_id'] = pme_id
    return str(token)

def fetch_ml_service(endpoint, pme_id):
    """
    Queries the FastAPI ML service with proper JWT authorization.
    """
    token = get_system_token(pme_id)
    url = f"http://backend-ml:8001{endpoint}"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"Alerts Engine warning: Failed to query ML service at {url}: {str(e)}")
        return None

def check_and_generate_alerts(pme_id):
    """
    Runs the automated detection algorithm for the 6 types of intelligent alerts
    in the active PME schema context.
    """
    try:
        pme = PME.objects.get(id=pme_id)
    except PME.DoesNotExist:
        return
        
    from core.utils import tenant_schema_context
    
    with tenant_schema_context(pme.nom_schema):
        # Fetch all transactions to build basic statistics
        credits = list(Transaction.objects.filter(type='credit').order_by('date'))
        debits = list(Transaction.objects.filter(type='debit').order_by('date'))
        all_tx = Transaction.objects.all().order_by('-date')
        
        if not all_tx.exists():
            return
            
        current_date = all_tx[0].date
        
        # ----------------------------------------------------
        # 1. Trésorerie critique: Solde actuel < 500 000 FCFA ou prévision à 30 jours < 500 000 FCFA
        # ----------------------------------------------------
        total_credits_val = sum(float(tx.montant) for tx in credits)
        total_debits_val = sum(float(tx.montant) for tx in debits)
        current_solde_val = total_credits_val - total_debits_val

        is_tresorerie_critique = current_solde_val < 500000
        desc_tresorerie = (
            f"Découvert bancaire critique : Votre solde de trésorerie actuel est de {int(current_solde_val):,} FCFA."
            if current_solde_val < 0 else
            f"Trésorerie faible : Votre solde actuel ({int(current_solde_val):,} FCFA) est inférieur au seuil de sécurité."
        )
        date_tresorerie_critique = current_date

        forecast_data = fetch_ml_service(f"/api/ml/previsions/{pme_id}/", pme_id)
        if forecast_data and forecast_data.get("status") == "success":
            forecast_list = forecast_data.get("forecast", [])
            for f in forecast_list[:30]:
                val = float(f["value"])
                if val < 500000:
                    is_tresorerie_critique = True
                    if current_solde_val >= 0:
                        desc_tresorerie = f"Votre solde de trésorerie projeté risque de chuter à {int(val):,} FCFA d'ici le {f['date']}."
                        try:
                            date_tresorerie_critique = datetime.strptime(f['date'], "%Y-%m-%d").date()
                        except Exception:
                            pass
                    break

        if is_tresorerie_critique:
            Alerte.objects.update_or_create(
                type='tresorerie_critique',
                statut='active',
                defaults={
                    'seuil': 500000,
                    'canal': 'push',
                    'description': desc_tresorerie,
                    'date_critique': date_tresorerie_critique,
                    'montant_jeu': abs(current_solde_val) if current_solde_val < 500000 else 500000.0,
                    'action_recommandee': "Optimiser les charges courantes ou solliciter un financement de trésorerie d'urgence.",
                    'lien_direct': "dashboard"
                }
            )
                
        # ----------------------------------------------------
        # 2. Retard de paiement client: Ventes facturées sans encaissement depuis 30 jours
        # ----------------------------------------------------
        if credits:
            last_credit_date = credits[-1].date
            days_since_credit = (current_date - last_credit_date).days
            if days_since_credit > 30:
                Alerte.objects.update_or_create(
                    type='retard_paiement',
                    statut='active',
                    defaults={
                        'seuil': 30,
                        'canal': 'email',
                        'description': f"Aucun encaissement client détecté depuis {days_since_credit} jours. Facture client présumée en souffrance.",
                        'date_critique': last_credit_date + timedelta(days=30),
                        'montant_jeu': 1500000.00,  # Estimated ticket size
                        'action_recommandee': "Consulter le journal et relancer le client pour factures impayées.",
                        'lien_direct': "transactions"
                    }
                )
                
        # ----------------------------------------------------
        # 3. Marge sous benchmark: Marge < 12% (15% benchmark - 3pts)
        # ----------------------------------------------------
        total_credits = sum(float(tx.montant) for tx in credits)
        total_debits = sum(float(tx.montant) for tx in debits)
        if total_credits > 0:
            marge = (total_credits - total_debits) / total_credits
            if marge < 0.12:
                Alerte.objects.update_or_create(
                    type='marge_basse',
                    statut='active',
                    defaults={
                        'seuil': 12,
                        'canal': 'dashboard',
                        'description': f"Marge nette de {marge*100:.1f}% inférieure de plus de 3 points au benchmark sectoriel de 15.0%.",
                        'date_critique': current_date,
                        'montant_jeu': total_credits * (0.15 - marge),
                        'action_recommandee': "Réduire les charges d'exploitation ou renégocier les prix avec vos partenaires.",
                        'lien_direct': "dashboard"
                    }
                )
                
        # ----------------------------------------------------
        # 4. Score crédit en baisse: Score < 70 ou baisse modélisée
        # ----------------------------------------------------
        score_data = fetch_ml_service(f"/api/ml/score/{pme_id}/", pme_id)
        if score_data and score_data.get("score") is not None:
            score_val = int(score_data["score"])
            if score_val < 70:
                Alerte.objects.update_or_create(
                    type='score_baisse',
                    statut='active',
                    defaults={
                        'seuil': 70,
                        'canal': 'email',
                        'description': f"Le score d'éligibilité crédit de votre PME est à un niveau bas de {score_val}/100.",
                        'date_critique': current_date,
                        'montant_jeu': 5000000.00,  # Estimated loss in credit capacity
                        'action_recommandee': "Améliorer les ratios financiers ou prendre rendez-vous avec notre expert.",
                        'lien_direct': "rendezvous"
                    }
                )
                
        # ----------------------------------------------------
        # 5. Stock critique: Fréquence d'achat de fournitures/marchandises
        # ----------------------------------------------------
        purchases = [tx for tx in debits if any(k in tx.categorie.lower() or k in tx.description.lower() for k in ["stock", "achat", "fournitures", "marchandise"])]
        if purchases:
            last_purchase_date = max(p.date for p in purchases)
            days_since_purchase = (current_date - last_purchase_date).days
            if days_since_purchase > 45:
                Alerte.objects.update_or_create(
                    type='stock_critique',
                    statut='active',
                    defaults={
                        'seuil': 45,
                        'canal': 'sms',
                        'description': f"Dernier réapprovisionnement de fournitures/matières premières il y a {days_since_purchase} jours. Risque de rupture.",
                        'date_critique': last_purchase_date + timedelta(days=45),
                        'montant_jeu': 750000.00,
                        'action_recommandee': "Passer une commande urgente auprès de vos fournisseurs réguliers.",
                        'lien_direct': "dashboard"
                    }
                )
                
        # ----------------------------------------------------
        # 6. Anomalie de dépenses: Dépense > moyenne + 2 * std_dev
        # ----------------------------------------------------
        if len(debits) >= 5:
            debit_amounts = [float(tx.montant) for tx in debits]
            mean_debit = sum(debit_amounts) / len(debit_amounts)
            variance = sum((x - mean_debit) ** 2 for x in debit_amounts) / len(debit_amounts)
            std_debit = variance ** 0.5
            threshold = mean_debit + 2 * std_debit
            
            # Check last 5 debits
            for tx in debits[-5:]:
                val = float(tx.montant)
                if val > threshold:
                    Alerte.objects.update_or_create(
                        type='anomalie_depense',
                        statut='active',
                        defaults={
                            'seuil': int(threshold),
                            'canal': 'email',
                            'description': f"Dépense anormale détectée : '{tx.description}' de {int(tx.montant):,} FCFA (seuil statistique de {int(threshold):,} FCFA).",
                            'date_critique': tx.date,
                            'montant_jeu': tx.montant,
                            'action_recommandee': "Vérifier le bien-fondé de cette pièce comptable dans le journal d'audit.",
                            'lien_direct': "transactions"
                        }
                    )
                    break
