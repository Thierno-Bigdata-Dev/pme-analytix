import csv
import random
from datetime import datetime, timedelta

def generate_demo_csv():
    filepath = r"C:\Users\HP ELITEBOOK\Downloads\PME\demo_amadou_final.csv"
    
    start_date = datetime(2025, 1, 1)
    end_date = datetime(2026, 7, 20)
    
    transactions = []
    
    current_date = start_date
    while current_date <= end_date:
        is_weekend = current_date.weekday() >= 5
        
        # 1. VENTES (Crédit)
        if not is_weekend or random.random() < 0.4:
            num_sales = random.randint(1, 4)
            for _ in range(num_sales):
                cat = random.choice(["Livraison Express", "Fret Régional", "Déménagement"])
                amount = 0
                if cat == "Livraison Express":
                    amount = random.randint(25000, 75000)
                elif cat == "Fret Régional":
                    amount = random.randint(150000, 400000)
                else:
                    amount = random.randint(80000, 200000)
                
                transactions.append({
                    "date": current_date.strftime("%Y-%m-%d"),
                    "description": f"Facture Client - {cat}",
                    "categorie": "Ventes",
                    "type": "credit",
                    "montant": amount
                })

        # 2. DÉPENSES QUOTIDIENNES (Carburant, Péage)
        if random.random() < 0.7:
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "description": "Plein de Carburant (Flotte)",
                "categorie": "Carburant",
                "type": "debit",
                "montant": random.randint(40000, 90000)
            })

        # 3. DÉPENSES MENSUELLES (Salaires, Loyer)
        if current_date.day == 28:
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "description": "Paiement Salaires (Chauffeurs)",
                "categorie": "Salaires",
                "type": "debit",
                "montant": 850000  # Fixe
            })
        if current_date.day == 5:
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "description": "Loyer Entrepôt Logistique",
                "categorie": "Loyer",
                "type": "debit",
                "montant": 400000
            })

        # 4. ENTRETIEN (Aléatoire mais coûteux)
        if random.random() < 0.05: # 5% de chance chaque jour
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "description": "Réparation Camion / Pièces",
                "categorie": "Entretien",
                "type": "debit",
                "montant": random.randint(150000, 500000)
            })
            
        # 5. IMPÔTS & TAXES (Trimestriel)
        if current_date.day == 15 and current_date.month in [3, 6, 9, 12]:
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "description": "Paiement Taxes / Patente",
                "categorie": "Impôts",
                "type": "debit",
                "montant": 600000
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
    generate_demo_csv()
