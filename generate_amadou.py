import csv
import random
from datetime import datetime, timedelta

def generate_amadou_csv():
    filepath = r"C:\Users\HP ELITEBOOK\Downloads\amadou_logistique_2026.csv"
    
    start_date = datetime(2025, 1, 1)
    end_date = datetime(2026, 7, 1) # Today roughly
    
    transactions = []
    
    current_date = start_date
    while current_date < end_date:
        is_weekend = current_date.weekday() >= 5
        
        # 1. Revenus (Ventes)
        # Amadou makes deliveries mostly on weekdays, fewer on weekends
        if not is_weekend or random.random() < 0.3:
            num_sales = random.randint(2, 6)
            for _ in range(num_sales):
                cat = random.choice(["Livraison Express", "Fret Régional", "Contrat Entreprise"])
                if cat == "Livraison Express":
                    amount = random.randint(15000, 50000)
                elif cat == "Fret Régional":
                    amount = random.randint(100000, 300000)
                else:
                    amount = random.randint(300000, 600000)
                    
                # Introduce a slight positive trend over time
                days_passed = (current_date - start_date).days
                trend_multiplier = 1 + (days_passed / 800)
                amount = int(amount * trend_multiplier)
                
                transactions.append({
                    "date": current_date.strftime("%Y-%m-%d"),
                    "montant": amount,
                    "type": "credit",
                    "categorie": "Vente",
                    "description": cat
                })
        
        # 2. Charges Variables (Carburant, Entretien)
        if current_date.weekday() in [0, 3]: # Every Monday and Thursday gas station
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "montant": random.randint(50000, 150000),
                "type": "debit",
                "categorie": "Carburant",
                "description": "Station Total - Plein camions"
            })
            
        if random.random() < 0.05: # Occasional maintenance
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "montant": random.randint(100000, 400000),
                "type": "debit",
                "categorie": "Entretien",
                "description": "Garage - Révision camion"
            })
            
        # 3. Charges Fixes (Fin de mois)
        if current_date.day == 28:
            # Salaires
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "montant": 1200000,
                "type": "debit",
                "categorie": "Salaire",
                "description": "Paiement salaires chauffeurs"
            })
            # Loyer
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "montant": 400000,
                "type": "debit",
                "categorie": "Loyer",
                "description": "Loyer entrepôt"
            })
            # Télécom
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "montant": 50000,
                "type": "debit",
                "categorie": "Télécom",
                "description": "Abonnement Internet & Flotte mobile"
            })
            
        current_date += timedelta(days=1)
        
    # Shuffle slightly but keep mostly chronological
    transactions.sort(key=lambda x: x["date"])
    
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["date", "montant", "type", "categorie", "description"], delimiter=';')
        writer.writeheader()
        for t in transactions:
            writer.writerow(t)
            
    print(f"Fichier généré : {filepath} ({len(transactions)} lignes)")

if __name__ == '__main__':
    generate_amadou_csv()
