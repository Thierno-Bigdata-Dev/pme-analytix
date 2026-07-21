import csv
import random
from datetime import datetime, timedelta

def generate_crisis_csv():
    filepath = r"C:\Users\HP ELITEBOOK\Downloads\PME\demo_amadou_crise.csv"
    
    start_date = datetime(2025, 1, 1)
    end_date = datetime(2026, 7, 20)
    
    transactions = []
    
    current_date = start_date
    while current_date <= end_date:
        is_weekend = current_date.weekday() >= 5
        
        # Calculate a multiplier that drops significantly in the last 6 months to simulate a crisis
        days_passed = (current_date - start_date).days
        total_days = (end_date - start_date).days
        progress = days_passed / total_days
        
        # Sales drop massively towards the end
        sales_probability = 0.3 if progress < 0.6 else 0.05
        
        # 1. VENTES (Crédit) - Chute drastique des ventes
        if not is_weekend and random.random() < sales_probability:
            num_sales = random.randint(1, 2)
            for _ in range(num_sales):
                cat = random.choice(["Livraison Express", "Fret Régional"])
                amount = random.randint(20000, 80000) if progress > 0.6 else random.randint(80000, 200000)
                transactions.append({
                    "date": current_date.strftime("%Y-%m-%d"),
                    "description": f"Facture Client - {cat} (Retard de paiement)" if random.random() < 0.5 else f"Facture Client - {cat}",
                    "categorie": "Ventes",
                    "type": "credit",
                    "montant": amount
                })

        # 2. DÉPENSES QUOTIDIENNES (Carburant) - Toujours constantes même sans ventes
        if random.random() < 0.6:
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "description": "Plein de Carburant (Flotte)",
                "categorie": "Carburant",
                "type": "debit",
                "montant": random.randint(60000, 110000) # Le carburant coûte plus cher
            })

        # 3. DÉPENSES MENSUELLES FIXES (Salaires, Loyer) - Restent élevées
        if current_date.day == 28:
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "description": "Paiement Salaires (Chauffeurs et Admin)",
                "categorie": "Salaires",
                "type": "debit",
                "montant": 1200000  # Salaires fixes élevés
            })
        if current_date.day == 5:
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "description": "Loyer Entrepôt Logistique",
                "categorie": "Loyer",
                "type": "debit",
                "montant": 550000 # Loyer en hausse
            })

        # 4. ENTRETIEN & IMPRÉVUS (Très coûteux et fréquents en fin de période)
        maintenance_prob = 0.05 if progress < 0.6 else 0.15 # Les camions tombent en panne plus souvent
        if random.random() < maintenance_prob: 
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "description": "Réparation Camion / Achat de Pièces",
                "categorie": "Entretien",
                "type": "debit",
                "montant": random.randint(200000, 800000) # Pannes très chères
            })
            
        # 5. RETARD IMPÔTS & PÉNALITÉS
        if current_date.day == 15 and current_date.month in [3, 6, 9, 12]:
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "description": "Paiement Taxes / Patente",
                "categorie": "Impôts",
                "type": "debit",
                "montant": 600000
            })
            if progress > 0.5: # Ajout de pénalités de retard
                 transactions.append({
                    "date": current_date.strftime("%Y-%m-%d"),
                    "description": "Pénalité de retard (Fisc)",
                    "categorie": "Impôts",
                    "type": "debit",
                    "montant": 150000
                })

        current_date += timedelta(days=1)

    # Sort chronologically just in case
    transactions.sort(key=lambda x: x["date"])
    
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["date", "description", "categorie", "type", "montant"])
        writer.writeheader()
        writer.writerows(transactions)
        
    print(f"File created successfully at: {filepath} with {len(transactions)} rows.")

if __name__ == '__main__':
    generate_crisis_csv()
