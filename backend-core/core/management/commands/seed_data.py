import random
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.db import connection
from core.models import PME, Transaction, Alerte

class Command(BaseCommand):
    help = "Génère des données de transactions historiques réalistes pour Dakar Tech"
    
    def handle(self, *args, **options):
        # 1. Find Dakar Tech PME
        try:
            pme = PME.objects.get(nom_schema="tenant_dakar_tech")
        except PME.DoesNotExist:
            self.stdout.write(self.style.ERROR("PME 'Dakar Tech' avec le schéma 'tenant_dakar_tech' non trouvée. Veuillez d'abord la créer dans l'administration."))
            return
            
        self.stdout.write(f"Activation du schéma : {pme.nom_schema}...")
        with connection.cursor() as cursor:
            cursor.execute(f"SET search_path TO {pme.nom_schema}, public")
            
        # 2. Clear existing transactions & alerts
        Transaction.objects.all().delete()
        Alerte.objects.all().delete()
        
        # 3. Setup dates
        start_date = datetime.now().date() - timedelta(days=365)
        transactions = []
        
        # 4. Generate monthly recurring transactions
        for i in range(12):
            month_date = start_date + timedelta(days=i*30)
            
            # Monthly Revenue (Credit)
            transactions.append(Transaction(
                date=month_date + timedelta(days=5),
                montant=3500000.0,
                type='credit',
                categorie='Ventes B2B',
                description=f"Facture client mensuelle - Mois {i+1}"
            ))
            
            # Monthly Rent (Debit)
            transactions.append(Transaction(
                date=month_date + timedelta(days=1),
                montant=600000.0,
                type='debit',
                categorie='Loyer',
                description="Loyer bureaux Dakar"
            ))
            
            # Monthly Salaries (Debit)
            transactions.append(Transaction(
                date=month_date + timedelta(days=28),
                montant=1800000.0,
                type='debit',
                categorie='Salaires',
                description="Salaires équipe R&D et ventes"
            ))
            
            # Monthly Utilities (Debit)
            transactions.append(Transaction(
                date=month_date + timedelta(days=10),
                montant=150000.0,
                type='debit',
                categorie='Télécom & Cloud',
                description="Abonnement Orange + hébergement AWS"
            ))

        # 5. Generate daily transactions (Retail sales & supplies)
        random.seed(42)
        for day_offset in range(365):
            current_date = start_date + timedelta(days=day_offset)
            
            # Skip weekends for realism
            if current_date.weekday() >= 5:
                continue
                
            # Daily sales (Credit)
            sales_amount = random.randint(50000, 300000)
            transactions.append(Transaction(
                date=current_date,
                montant=sales_amount,
                type='credit',
                categorie='Ventes comptoir',
                description="Recettes ventes quotidiennes"
            ))
            
            # Casual small expenses (Debit)
            if random.random() < 0.2:
                expense_amount = random.randint(10000, 80000)
                transactions.append(Transaction(
                    date=current_date,
                    montant=expense_amount,
                    type='debit',
                    categorie='Frais généraux',
                    description="Achat fournitures de bureau"
                ))

        # 6. Bulk create inside the active schema
        Transaction.objects.bulk_create(transactions)
        self.stdout.write(self.style.SUCCESS(f"Succès : {len(transactions)} transactions générées pour Dakar Tech dans {pme.nom_schema} !"))
