import csv
import random
import os
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def generate_teranga_croissance_csv():
    """
    Scénario 1: PME en Forte Croissance — Teranga BTP & Construction (Dakar)
    Profil: Trésorerie très saine, forte diversification client, excellente régularité.
    Score Crédit attendu: ~85/100 (Faible risque)
    """
    filepath = os.path.join(BASE_DIR, "demo_teranga_croissance.csv")
    start_date = datetime(2025, 1, 1)
    end_date = datetime(2026, 7, 20)
    
    transactions = []
    current_date = start_date

    clients = [
        "Eiffage Sénégal", "CSE BTP", "Getran SA", "CBAO Siège",
        "PromoBeton", "Port Autonome de Dakar", "Client Particulier Villa"
    ]

    while current_date <= end_date:
        is_weekend = current_date.weekday() >= 5
        
        # 1. Crédits / Ventes de matériaux & Prestations BTP
        if not is_weekend or random.random() < 0.3:
            if random.random() < 0.8:
                client = random.choice(clients)
                amount = random.randint(800000, 4500000)
                transactions.append({
                    "date": current_date.strftime("%Y-%m-%d"),
                    "description": f"Règlement Facture - {client}",
                    "categorie": "Ventes BTP",
                    "type": "credit",
                    "montant": amount
                })

        # 2. Achats Ciment, Fer, Gravier (Fournisseurs)
        if current_date.day in [5, 12, 20, 27]:
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "description": "Règlement Fournisseur Sococim / Ciments du Sahel",
                "categorie": "Fournisseur",
                "type": "debit",
                "montant": random.randint(1200000, 2800000)
            })

        # 3. Salaires Équipes & Ouvriers
        if current_date.day == 28:
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "description": "Virement Salaires Équipes Chantier",
                "categorie": "Salaires",
                "type": "debit",
                "montant": 1850000
            })

        # 4. Loyer Dépôt & Engins
        if current_date.day == 2:
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "description": "Loyer Parc à Matériaux & Bureaux",
                "categorie": "Loyer",
                "type": "debit",
                "montant": 650000
            })

        # 5. Impôts & TVA DGI (Régulier)
        if current_date.day == 15 and current_date.month in [1, 3, 5, 7, 9, 11]:
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "description": "Paiement Acompte TVA / DGI Sénégal",
                "categorie": "Impôts",
                "type": "debit",
                "montant": random.randint(400000, 750000)
            })

        # 6. Carburant Engins & Péage
        if not is_weekend and random.random() < 0.5:
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "description": "Carburant Flotte Camions TotalEnergies",
                "categorie": "Carburant",
                "type": "debit",
                "montant": random.randint(60000, 140000)
            })

        current_date += timedelta(days=1)

    transactions.sort(key=lambda x: x["date"])
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["date", "description", "categorie", "type", "montant"])
        writer.writeheader()
        writer.writerows(transactions)

    print(f"[OK] Scenario 1 genere : {filepath} ({len(transactions)} lignes)")
    return filepath


def generate_sahel_agro_stress_csv():
    """
    Scénario 2: PME Agro-alimentaire sous Tension de Trésorerie — Sahel Agro (Kaolack)
    Profil: Forte saisonnalité, créances clients en retard, frais fixes lourds, découverts fréquents.
    Score Crédit attendu: ~48/100 (Élevé / Zone de vigilance)
    """
    filepath = os.path.join(BASE_DIR, "demo_sahel_agro_stress.csv")
    start_date = datetime(2025, 1, 1)
    end_date = datetime(2026, 7, 20)

    transactions = []
    current_date = start_date

    while current_date <= end_date:
        is_weekend = current_date.weekday() >= 5
        month = current_date.month

        # Saison de récolte (Nov-Mars) vs Saison creuse (Avril-Oct)
        is_harvest_season = month in [11, 12, 1, 2, 3]

        # 1. Ventes d'huile et tourteaux d'arachide
        sale_chance = 0.6 if is_harvest_season else 0.2
        if not is_weekend and random.random() < sale_chance:
            amount = random.randint(400000, 1800000) if is_harvest_season else random.randint(150000, 500000)
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "description": "Vente Vrac Huile / Tourteaux Agro",
                "categorie": "Ventes",
                "type": "credit",
                "montant": amount
            })

        # 2. Achat Graines aux Coopératives (Charges lourdes en début d'année)
        if is_harvest_season and current_date.day in [10, 22]:
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "description": "Achat Collecte Graines Arachide - Coopérative Kaolack",
                "categorie": "Fournisseur",
                "type": "debit",
                "montant": random.randint(1500000, 3200000)
            })

        # 3. Salaires Usine (Lourd et fixe)
        if current_date.day == 28:
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "description": "Salaires Personnel Usine & Manutention",
                "categorie": "Salaires",
                "type": "debit",
                "montant": 1200000
            })

        # 4. Électricité & Maintenance Industrielle Senelec
        if current_date.day == 14:
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "description": "Facture Électricité Senelec Usine",
                "categorie": "Énergie",
                "type": "debit",
                "montant": random.randint(450000, 850000)
            })

        # 5. Agios Bancaires / Frais de retard
        if current_date.day == 1 and random.random() < 0.7:
            transactions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "description": "Agios et Commission Découvert Bancaire CBAO",
                "categorie": "Frais Financiers",
                "type": "debit",
                "montant": random.randint(75000, 180000)
            })

        current_date += timedelta(days=1)

    transactions.sort(key=lambda x: x["date"])
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["date", "description", "categorie", "type", "montant"])
        writer.writeheader()
        writer.writerows(transactions)

    print(f"[OK] Scenario 2 genere : {filepath} ({len(transactions)} lignes)")
    return filepath


if __name__ == "__main__":
    generate_teranga_croissance_csv()
    generate_sahel_agro_stress_csv()
