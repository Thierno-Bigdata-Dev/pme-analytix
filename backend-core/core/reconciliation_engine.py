from decimal import Decimal
from datetime import datetime
from .models import Transaction, Facture, Reconciliation

def suggest_reconciliations(pme_id):
    """
    Finds unmatched credit transactions and unpaid invoices, calculates compatibility
    scores, and returns a list of reconciliation suggestions.
    Assumes connection is already set to the tenant schema by middleware/views.
    """
    # Only credit transactions can be reconciled with invoices
    unmatched_txs = Transaction.objects.filter(type='credit', reconciliation__isnull=True).order_by('date')
    unpaid_invoices = Facture.objects.exclude(statut='payee').order_by('date_emission')
    
    suggestions = []
    
    for tx in unmatched_txs:
        tx_suggestions = []
        for inv in unpaid_invoices:
            # 1. Amount matching (50 pts)
            diff = abs(tx.montant - inv.montant)
            if diff == 0:
                amount_score = 50.0
            else:
                # allow small diff (up to 2% difference or max 2000 FCFA for mobile money fees)
                max_diff = min(Decimal('2000.00'), inv.montant * Decimal('0.02'))
                if diff <= max_diff:
                    amount_score = float(50.0 * (Decimal('1.0') - (diff / max_diff)))
                else:
                    amount_score = 0.0
            
            # 2. Date proximity (30 pts)
            days_diff = (tx.date - inv.date_emission).days
            if days_diff < 0:
                # Pre-payments can happen, give a minor flat score
                date_score = 5.0 if abs(days_diff) <= 3 else 0.0
            elif days_diff <= 15:
                # payment within 15 days of invoice emission - optimal (30 pts)
                date_score = float(30.0 * (1.0 - (days_diff / 15.0)))
            elif days_diff <= 45:
                # payment within 45 days (15 pts max)
                date_score = float(15.0 * (1.0 - ((days_diff - 15.0) / 30.0)))
            else:
                date_score = 0.0
                
            # 3. Description/Name matching (20 pts)
            text_score = 0.0
            desc = (tx.description or '').lower()
            inv_num = inv.numero.lower()
            client_name = inv.client_nom.lower()
            
            if inv_num in desc or client_name in desc:
                text_score = 20.0
            else:
                # check if any word of the client name of length >= 4 is in description
                client_words = [w for w in client_name.split() if len(w) >= 4]
                if any(w in desc for w in client_words):
                    text_score = 10.0
                    
            total_score = amount_score + date_score + text_score
            
            if total_score >= 30: # Only suggest if confidence is at least 30%
                tx_suggestions.append({
                    "invoice_id": inv.id,
                    "numero": inv.numero,
                    "client_nom": inv.client_nom,
                    "date_emission": inv.date_emission.strftime("%Y-%m-%d"),
                    "montant_facture": str(inv.montant),
                    "score": round(total_score, 1),
                    "details": {
                        "amount_score": round(amount_score, 1),
                        "date_score": round(date_score, 1),
                        "text_score": round(text_score, 1)
                    }
                })
        
        if tx_suggestions:
            # Sort suggestions by score descending
            tx_suggestions.sort(key=lambda x: x["score"], reverse=True)
            suggestions.append({
                "transaction": {
                    "id": tx.id,
                    "date": tx.date.strftime("%Y-%m-%d"),
                    "montant": str(tx.montant),
                    "description": tx.description,
                    "categorie": tx.categorie
                },
                "suggestions": tx_suggestions
            })
            
    return suggestions
