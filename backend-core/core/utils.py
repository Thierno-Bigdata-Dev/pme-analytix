from django.db import connection
from contextlib import contextmanager
from .models import Transaction, Alerte, RapportPDF, RendezVous, Facture, Reconciliation

@contextmanager
def tenant_schema_context(schema_name):
    """
    Context manager to temporarily switch the PostgreSQL search path to a specific
    tenant schema and guarantee restoration to public even in case of exceptions.
    """
    with connection.cursor() as cursor:
        cursor.execute(f"SET search_path TO {schema_name}, public")
    try:
        yield
    finally:
        with connection.cursor() as cursor:
            cursor.execute("SET search_path TO public")


def create_tenant_schema(schema_name):
    """
    Creates a new PostgreSQL schema for a PME tenant and initializes
    only the tenant-specific tables within it.
    """
    # 1. Create the schema in PostgreSQL
    with connection.cursor() as cursor:
        cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {schema_name}")
        
    # 2. Set search path temporarily to the new schema
    with connection.cursor() as cursor:
        cursor.execute(f"SET search_path TO {schema_name}")
        
    # 3. Create the tenant-specific tables using Django's schema editor
    tenant_models = [Transaction, Alerte, RapportPDF, RendezVous, Facture, Reconciliation]
    with connection.schema_editor() as schema_editor:
        for model in tenant_models:
            schema_editor.create_model(model)
            
    # 4. Reset connection search path back to public
    with connection.cursor() as cursor:
        cursor.execute("SET search_path TO public")
