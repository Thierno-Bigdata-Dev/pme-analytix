from django.db import connection
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
import jwt
from .models import PME

class TenantMiddleware(MiddlewareMixin):
    def process_request(self, request):
        schema_name = 'public'
        
        # 1. Bypass tenant routing for admin panel, static files, or public homepages
        if (request.path.startswith('/admin/') or 
            request.path.startswith('/static/') or 
            request.path == '/'):
            # Keep search path to public
            with connection.cursor() as cursor:
                cursor.execute("SET search_path TO public")
            request.tenant_schema = 'public'
            return None

        # 2. Extract tenant identifier (from path, X-Tenant-ID header, or Authorization JWT token)
        tenant_id = request.headers.get('X-Tenant-ID')
        
        if not tenant_id:
            import re
            match = re.match(r'^/api/core/pme/([0-9]+)/', request.path)
            if match:
                tenant_id = int(match.group(1))
        
        if not tenant_id and 'Authorization' in request.headers:
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                try:
                    # Decode payload without verifying signature (verification is handled by DRF simplejwt later)
                    payload = jwt.decode(token, options={"verify_signature": False})
                    tenant_id = payload.get('pme_id')
                except Exception:
                    pass

        # 3. Switch schema if tenant_id is found
        if tenant_id:
            from django.core.cache import cache
            cache_key = f"pme_schema_{tenant_id}"
            schema_name = cache.get(cache_key)
            
            if not schema_name:
                try:
                    # Query global PME table (which resides in the public schema)
                    # First force path to public for this fetch to be safe
                    with connection.cursor() as cursor:
                        cursor.execute("SET search_path TO public")
                    
                    pme = PME.objects.get(id=tenant_id)
                    schema_name = pme.nom_schema
                    cache.set(cache_key, schema_name, 3600)
                except PME.DoesNotExist:
                    return JsonResponse({
                        "status": "error",
                        "message": f"PME avec l'identifiant '{tenant_id}' non trouvee"
                    }, status=404)
                except Exception as e:
                    schema_name = 'public'
        
        # 4. Set the PostgreSQL search path for the current connection
        import re
        if schema_name and not re.match(r"^[a-zA-Z0-9_]+$", schema_name):
            return JsonResponse({
                "status": "error",
                "message": "Nom de schéma invalide."
            }, status=400)
            
        request.tenant_schema = schema_name
        with connection.cursor() as cursor:
            cursor.execute(f"SET search_path TO {schema_name}, public")
            
        return None
