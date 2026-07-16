import os

filepath = r'c:\Users\HP ELITEBOOK\Downloads\PME\backend-core\core\views.py'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace get method body
old_get = """        # Restrict queries based on the active pricing plan
        if pme.plan == 'starter':
            cutoff_date = date.today() - timedelta(days=90) # 3 months limit
            transactions = Transaction.objects.filter(date__gte=cutoff_date).order_by('-date')
        elif pme.plan == 'pilote':
            cutoff_date = date.today() - timedelta(days=730) # 24 months limit
            transactions = Transaction.objects.filter(date__gte=cutoff_date).order_by('-date')
        else:
            transactions = Transaction.objects.all().order_by('-date')"""

new_get = """        from .utils import tenant_schema_context
        with tenant_schema_context(pme.nom_schema):
            # Restrict queries based on the active pricing plan
            if pme.plan == 'starter':
                cutoff_date = date.today() - timedelta(days=90) # 3 months limit
                transactions = Transaction.objects.filter(date__gte=cutoff_date).order_by('-date')
            elif pme.plan == 'pilote':
                cutoff_date = date.today() - timedelta(days=730) # 24 months limit
                transactions = Transaction.objects.filter(date__gte=cutoff_date).order_by('-date')
            else:
                transactions = Transaction.objects.all().order_by('-date')"""

content = content.replace(old_get, new_get)

# 2. Replace post manual creation body
old_post_1 = """                from .models import Transaction
                tx = Transaction.objects.create(
                    date=tx_date,
                    montant=tx_montant,
                    type=type_val,
                    categorie=categorie_val,
                    description=description_val
                )"""

new_post_1 = """                from .models import Transaction, PME
                from .utils import tenant_schema_context
                
                try:
                    pme = PME.objects.get(id=pme_id)
                except PME.DoesNotExist:
                    from rest_framework.response import Response
                    from rest_framework import status
                    return Response({"detail": "PME non trouvée"}, status=status.HTTP_404_NOT_FOUND)
                    
                with tenant_schema_context(pme.nom_schema):
                    tx = Transaction.objects.create(
                        date=tx_date,
                        montant=tx_montant,
                        type=type_val,
                        categorie=categorie_val,
                        description=description_val
                    )"""

content = content.replace(old_post_1, new_post_1)

# 3. Replace post CSV import
old_post_2 = """            from .models import Transaction
            from django.db import transaction as db_transaction
            
            with db_transaction.atomic():"""

new_post_2 = """            from .models import Transaction, PME
            from .utils import tenant_schema_context
            from django.db import transaction as db_transaction
            
            try:
                pme = PME.objects.get(id=pme_id)
            except PME.DoesNotExist:
                from rest_framework.response import Response
                from rest_framework import status
                return Response({"detail": "PME non trouvée"}, status=status.HTTP_404_NOT_FOUND)
                
            with tenant_schema_context(pme.nom_schema), db_transaction.atomic():"""

content = content.replace(old_post_2, new_post_2)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Patch applied')
