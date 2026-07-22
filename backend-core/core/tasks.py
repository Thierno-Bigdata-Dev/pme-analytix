# pyright: reportMissingImports=false
import os
import hashlib
from datetime import datetime
from celery import shared_task
from django.db import connection
from django.conf import settings
from django.template.loader import render_to_string
# pyrefly: ignore [missing-import]
from weasyprint import HTML
from core.models import PME, Transaction, RapportPDF

@shared_task
def generate_rapport_pdf(pme_id, rapport_id):
    """
    Asynchronous Celery task that switches to the PME's database schema,
    calculates financial KPIs, renders the report HTML template, and compiles it
    into a secure, certified PDF file using WeasyPrint.
    """
    schema_name = None
    try:
        # 1. Fetch PME to get the schema name
        pme = PME.objects.get(id=pme_id)
        schema_name = pme.nom_schema
        
        # 2. Switch search path to the PME schema
        with connection.cursor() as cursor:
            cursor.execute(f"SET search_path TO {schema_name}, public")
            
        # 3. Retrieve the Report object and set status to 'en_cours'
        rapport = RapportPDF.objects.get(id=rapport_id)
        rapport.statut = 'en_cours'
        rapport.save()
        
        # 4. Extract data and compute financial ratios (SYSCOHADA)
        transactions = Transaction.objects.all().order_by('-date')[:15]
        transaction_count = Transaction.objects.count()
        
        credits = sum(float(tx.montant) for tx in Transaction.objects.filter(type='credit'))
        debits = sum(float(tx.montant) for tx in Transaction.objects.filter(type='debit'))
        solde_total = credits - debits
        
        avg_monthly_debits = debits / 12.0 if debits > 0 else 1.0
        liquidite_ratio = round(solde_total / avg_monthly_debits, 2) if solde_total > 0 else 0.0
        
        # Calculate local credit score components
        # Component 1: Liquidite (25%)
        liquidity_score = min(max(liquidite_ratio, 0.0), 5.0) / 5.0
        
        # Component 2: Regulate fournisseurs (20%)
        supplier_keywords = ['fournisseur', 'achat', 'prestataire', 'matière', 'stock', 'service']
        supplier_txs = Transaction.objects.filter(type='debit')
        supplier_count = 0
        for tx in supplier_txs:
            cat = str(tx.categorie or '').lower()
            if any(kw in cat for kw in supplier_keywords):
                supplier_count += 1
        supplier_payment_regularity = min(supplier_count, 10) / 10.0
        
        # Component 3: Evolution CA (20%)
        ca_growth_rate = 0.12 # +12% default CA growth
        ca_growth_norm = (ca_growth_rate + 1.0) / 2.0
        
        # Component 4: Diversification clients (15%)
        client_categories = Transaction.objects.filter(type='credit').values('categorie').distinct().count()
        client_diversification = min(client_categories, 5) / 5.0
        
        # Component 5: Ancienneté & Stabilité (10%)
        seniority_stability = 0.8
        
        # Component 6: Conformité fiscale (10%)
        tax_keywords = ['taxe', 'impôt', 'dgi', 'tva', 'fiscal']
        tax_txs = Transaction.objects.filter(type='debit')
        tax_count = 0
        for tx in tax_txs:
            cat = str(tx.categorie or '').lower()
            if any(kw in cat for kw in tax_keywords):
                tax_count += 1
        fiscal_compliance = min(tax_count, 4) / 4.0
        
        # Compute final score
        credit_score = int(
            liquidity_score * 25 + 
            supplier_payment_regularity * 20 + 
            ca_growth_norm * 20 + 
            client_diversification * 15 + 
            seniority_stability * 10 + 
            fiscal_compliance * 10
        )
        
        # Sector benchmark position
        if credit_score >= 80:
            benchmark = "Top 10% (Excellent)"
            benchmark_text = "Votre PME se positionne dans le Top 10% des entreprises les plus robustes de son secteur dans l'UEMOA."
            risk_segment = "Faible"
        elif credit_score >= 55:
            benchmark = "Top 40% (Solide)"
            benchmark_text = "Votre PME se positionne dans la moyenne haute (Top 40%) de son secteur d'activité."
            risk_segment = "Moyen"
        elif credit_score >= 35:
            benchmark = "Moyenne basse"
            benchmark_text = "Votre PME se positionne en dessous du benchmark sectoriel moyen. Des ajustements sont recommandés."
            risk_segment = "Élevé"
        else:
            benchmark = "Zone à risque"
            benchmark_text = "Votre PME présente des vulnérabilités de trésorerie importantes par rapport au secteur."
            risk_segment = "Critique"
            
        # Personalized recommendations
        recoms = []
        if liquidite_ratio < 1.0:
            recoms.append("Optimiser le délai moyen de recouvrement client (DMR) pour remonter l'indice de liquidité au-dessus de 1.0.")
        if supplier_payment_regularity < 0.5:
            recoms.append("Lisser et planifier les règlements fournisseurs pour éviter les tensions de trésorerie à court terme.")
        if fiscal_compliance < 0.5:
            recoms.append("Renforcer la régularité fiscale déclarative en provisionnant la TVA mensuellement auprès de la DGI.")
        if client_diversification < 0.4:
            recoms.append("Diversifier votre portefeuille de clients pour réduire le risque de dépendance économique (concentration client).")
            
        if not recoms:
            recoms.append("Maintenir la gestion prudente de trésorerie actuelle et surveiller l'évolution des charges variables.")
            
        # 5. Create storage folder in media root
        media_dir = os.path.join(settings.MEDIA_ROOT, 'rapports')
        os.makedirs(media_dir, exist_ok=True)
        
        filename = f"rapport_pme_{pme_id}_{rapport_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
        file_path = os.path.join(media_dir, filename)
        
        # 6. Generate secure electronic signature (SHA-256 validation stamp)
        sig_payload = f"PME-{pme_id}-BAL-{solde_total}-TIME-{datetime.now().isoformat()}-{settings.SECRET_KEY}"
        signature_hash = hashlib.sha256(sig_payload.encode('utf-8')).hexdigest()
        
        # 7. Render HTML to string using context
        context = {
            "rapport_id": rapport_id,
            "date_generation": datetime.now().strftime("%d/%m/%Y à %H:%M:%S"),
            "pme_nom": pme.nom,
            "pme_siren": pme.siren,
            "solde_total": f"{solde_total:,.2f}".replace(',', ' '),
            "liquidite_ratio": liquidite_ratio,
            "transaction_count": transaction_count,
            "transactions": transactions,
            "credit_score": credit_score,
            "risk_segment": risk_segment,
            "benchmark": benchmark,
            "benchmark_text": benchmark_text,
            "recoms": recoms,
            "signature": signature_hash,
            "timestamp_iso": datetime.now().isoformat()
        }
        
        html_content = render_to_string('rapport_template.html', context)
        
        # 8. Compile the HTML contents to a PDF file using WeasyPrint
        HTML(string=html_content).write_pdf(file_path)
        
        # 9. Update RapportPDF object in database with the local media URL and signature hash
        relative_url = f"{settings.MEDIA_URL}rapports/{filename}"
        rapport.url_s3 = relative_url
        rapport.signature = signature_hash
        rapport.statut = 'termine'
        rapport.save()
        
        print(f"SUCCÈS: Rapport PDF numéro {rapport_id} généré et signé sous : {file_path}")
        
    except Exception as e:
        print(f"ERREUR: Échec de la génération du rapport {rapport_id}: {str(e)}")
        # If possible, update the status in the database to 'erreur'
        if schema_name:
            try:
                with connection.cursor() as cursor:
                    cursor.execute(f"SET search_path TO {schema_name}, public")
                rapport = RapportPDF.objects.get(id=rapport_id)
                rapport.statut = 'erreur'
                rapport.save()
            except Exception as inner_e:
                print(f"ERREUR CRITIQUE: Impossible de mettre à jour le statut d'erreur en base: {str(inner_e)}")


@shared_task
def retrain_prophet_models():
    """
    Periodic task that runs monthly to trigger retraining of the Prophet
    models for all non-starter PMEs by hitting the FastAPI previsions endpoint.
    """
    from core.models import PME
    from core.alerts_engine import fetch_ml_service
    
    with connection.cursor() as cursor:
        cursor.execute("SET search_path TO public")
        
    pmes = PME.objects.exclude(plan='starter')
    print(f"Démarrage du réentraînement mensuel planifié pour {pmes.count()} PMEs...")
    
    for pme in pmes:
        print(f"Réentraînement Prophet pour {pme.nom}...")
        res = fetch_ml_service(f"/api/ml/previsions/{pme.id}/", pme.id)
        if res:
            print(f"Prophet réentraîné avec succès pour {pme.nom}.")
            
    with connection.cursor() as cursor:
        cursor.execute("SET search_path TO public")


@shared_task
def check_pme_alerts_scheduled():
    """
    Periodic task running daily to evaluate and update intelligent alerts
    for all active PMEs.
    """
    from core.models import PME
    from core.alerts_engine import check_and_generate_alerts
    
    with connection.cursor() as cursor:
        cursor.execute("SET search_path TO public")
        
    pmes = PME.objects.all()
    print(f"Démarrage de la vérification quotidienne des alertes pour {pmes.count()} PMEs...")
    
    for pme in pmes:
        try:
            check_and_generate_alerts(pme.id)
            print(f"Alertes recalculées pour la PME {pme.nom}.")
        except Exception as e:
            print(f"Erreur d'analyse d'alertes pour {pme.nom} : {str(e)}")
            
    with connection.cursor() as cursor:
        cursor.execute("SET search_path TO public")

@shared_task
def check_and_generate_alerts_task(pme_id):
    """
    Celery task to check and generate alerts for a specific PME.
    Triggered asynchronously after data import or transaction modification.
    """
    from core.alerts_engine import check_and_generate_alerts
    try:
        check_and_generate_alerts(pme_id)
        print(f"Alertes recalculées avec succès pour la PME {pme_id}")
    except Exception as e:
        print(f"Erreur lors du calcul des alertes pour la PME {pme_id}: {str(e)}")

