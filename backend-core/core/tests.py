from django.test import TestCase, Client
from django.db import connection
from django.contrib.auth import get_user_model
from core.models import PME, RapportPDF
import json

User = get_user_model()

class PMESchemaTestCase(TestCase):
    """
    Tests PME schema creation signal and isolation.
    """
    def test_pme_creation_generates_schema(self):
        # Create PME, which triggers the post_save signal for schema creation
        pme = PME.objects.create(
            nom="Test Senegal Tech",
            secteur="Technologie",
            siren="SN-TST-888",
            plan="starter",
            nom_schema="tenant_test_senegal_tech"
        )
        
        # Verify schema exists in PostgreSQL
        with connection.cursor() as cursor:
            cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name = %s", [pme.nom_schema])
            schema_exists = cursor.fetchone()
            self.assertIsNotNone(schema_exists)
            
            # Verify tenant specific tables exist inside the new schema
            cursor.execute(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = %s AND table_name = 'core_transaction'", 
                [pme.nom_schema]
            )
            table_exists = cursor.fetchone()
            self.assertIsNotNone(table_exists)

class JWTAuthTestCase(TestCase):
    """
    Tests custom JWT token serialization and roles.
    """
    def setUp(self):
        self.pme = PME.objects.create(
            nom="Test Dakar Dev",
            secteur="Technologie",
            siren="SN-DKD-777",
            plan="croissance",
            nom_schema="tenant_test_dakar_dev"
        )
        self.user = User.objects.create_user(
            email="developer@pme.sn",
            password="dev@password",
            role="dirigeant",
            pme=self.pme
        )
        self.client = Client()

    def test_login_returns_custom_jwt_claims(self):
        response = self.client.post(
            '/api/core/auth/login/',
            data=json.dumps({
                'email': 'developer@pme.sn',
                'password': 'dev@password'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('access', data)
        
        # Decode the access token to check payload claims
        import jwt
        payload = jwt.decode(data['access'], options={"verify_signature": False})
        self.assertEqual(payload['pme_id'], self.pme.id)
        self.assertEqual(payload['role'], 'dirigeant')
        self.assertEqual(payload['email'], 'developer@pme.sn')

    def test_admin_login_without_source_fails(self):
        admin_user = User.objects.create_user(
            email="admin_gate@pme.sn",
            password="adminpassword",
            role="operateur"
        )
        response = self.client.post(
            '/api/core/auth/login/',
            data=json.dumps({
                'email': 'admin_gate@pme.sn',
                'password': 'adminpassword'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Les administrateurs doivent se connecter uniquement via le portail interne", response.json()['detail'][0])

    def test_admin_login_with_source_succeeds(self):
        admin_user = User.objects.create_user(
            email="admin_gate2@pme.sn",
            password="adminpassword",
            role="operateur"
        )
        response = self.client.post(
            '/api/core/auth/login/',
            data=json.dumps({
                'email': 'admin_gate2@pme.sn',
                'password': 'adminpassword',
                'source': 'admin_portal'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.json())

    def test_client_login_with_source_fails(self):
        response = self.client.post(
            '/api/core/auth/login/',
            data=json.dumps({
                'email': 'developer@pme.sn',
                'password': 'dev@password',
                'source': 'admin_portal'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Ce portail est réservé aux administrateurs", response.json()['detail'][0])

class RapportPDFAPITestCase(TestCase):
    """
    Tests RapportPDFView API endpoints and pricing plan restrictions.
    """
    def setUp(self):
        # Create Starter PME
        self.pme_starter = PME.objects.create(
            nom="Starter Tech",
            secteur="Technologie",
            siren="SN-STR-111",
            plan="starter",
            nom_schema="tenant_test_starter_tech"
        )
        # Create Croissance PME
        self.pme_croissance = PME.objects.create(
            nom="Croissance Tech",
            secteur="Technologie",
            siren="SN-CRO-222",
            plan="croissance",
            nom_schema="tenant_test_croissance_tech"
        )
        
        # Create Dirigeant user for Starter PME
        self.user_starter = User.objects.create_user(
            email="dirigeant_starter@pme.sn",
            password="password123",
            role="dirigeant",
            pme=self.pme_starter
        )
        # Create Dirigeant user for Croissance PME
        self.user_croissance = User.objects.create_user(
            email="dirigeant_croissance@pme.sn",
            password="password123",
            role="dirigeant",
            pme=self.pme_croissance
        )
        
        self.client = Client()

    def get_auth_headers(self, email, password):
        response = self.client.post(
            '/api/core/auth/login/',
            data=json.dumps({'email': email, 'password': password}),
            content_type='application/json'
        )
        token = response.json()['access']
        return {'HTTP_AUTHORIZATION': f'Bearer {token}'}

    def test_starter_pme_blocked_from_generating_pdf(self):
        headers = self.get_auth_headers('dirigeant_starter@pme.sn', 'password123')
        
        # Call generate report endpoint for Starter PME
        response = self.client.post(
            f'/api/core/pme/{self.pme_starter.id}/rapport/',
            content_type='application/json',
            **headers
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("La génération de rapport PDF certifié n'est pas autorisée pour le plan Starter", response.json()['detail'])

    def test_croissance_pme_allowed_to_generate_pdf(self):
        headers = self.get_auth_headers('dirigeant_croissance@pme.sn', 'password123')
        
        # Call generate report endpoint for Croissance PME
        response = self.client.post(
            f'/api/core/pme/{self.pme_croissance.id}/rapport/',
            content_type='application/json',
            **headers
        )
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.json()['status'], 'queued')
        
        # Verify the report object was created inside the schema
        with connection.cursor() as cursor:
            cursor.execute(f"SET search_path TO {self.pme_croissance.nom_schema}, public")
        self.assertTrue(RapportPDF.objects.filter(statut='en_attente').exists())

    def test_get_subscription_info(self):
        headers = self.get_auth_headers('dirigeant_croissance@pme.sn', 'password123')
        response = self.client.get(
            f'/api/core/pme/{self.pme_croissance.id}/abonnement/',
            **headers
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['plan_actuel'], 'croissance')

    def test_update_subscription_request_payment(self):
        headers = self.get_auth_headers('dirigeant_starter@pme.sn', 'password123')
        response = self.client.post(
            f'/api/core/pme/{self.pme_starter.id}/abonnement/',
            data=json.dumps({'plan': 'pilote'}),
            content_type='application/json',
            **headers
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'payment_required')
        self.assertIn('/api/core/webhook/wave/simulate/', response.json()['checkout_url'])

    def test_wave_webhook_activates_plan(self):
        # Trigger webhook post call simulating checkout success
        payload = {
            "id": "evt_test",
            "type": "checkout.succeeded",
            "data": {
                "id": "co_test",
                "client_reference_id": f"pme_{self.pme_starter.id}_plan_pilote"
            }
        }
        response = self.client.post(
            '/api/core/webhook/wave/',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'success')
        
        # Verify the plan was updated in public schema database
        self.pme_starter.refresh_from_db()
        self.assertEqual(self.pme_starter.plan, 'pilote')

    def test_pme_self_registration(self):
        payload = {
            "nom_pme": "Self Onboard PME",
            "secteur": "Commerce",
            "siren": "SN-SO-999",
            "email": "owner@selfonboard.sn",
            "password": "ownerpassword"
        }
        response = self.client.post(
            '/api/core/auth/register/',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['status'], 'success')
        
        # Verify schema exists
        schema_name = response.json()['nom_schema']
        with connection.cursor() as cursor:
            cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name = %s", [schema_name])
            self.assertIsNotNone(cursor.fetchone())

    def test_pme_csv_import(self):
        headers = self.get_auth_headers('dirigeant_croissance@pme.sn', 'password123')
        
        # Build simulated CSV file
        from django.core.files.uploadedfile import SimpleUploadedFile
        csv_content = b"date,montant,type,categorie,description\n2026-06-01,1500000,credit,Ventes,Ventes directes\n2026-06-02,50000,debit,Marketing,Frais pub\n"
        csv_file = SimpleUploadedFile("ledger.csv", csv_content, content_type="text/csv")
        
        response = self.client.post(
            f'/api/core/pme/{self.pme_croissance.id}/import/',
            {'file': csv_file},
            **headers
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['status'], 'success')
        
        # Verify rows exist inside schema
        with connection.cursor() as cursor:
            cursor.execute(f"SET search_path TO {self.pme_croissance.nom_schema}, public")
        from core.models import Transaction
        self.assertEqual(Transaction.objects.count(), 2)

    def test_operator_can_list_pmes(self):
        # Create an operator user
        operator_user = User.objects.create_user(
            email="operator_test@pme.sn",
            password="operatorpassword",
            role="operateur",
            pme=None
        )
        response = self.client.post(
            '/api/core/auth/login/',
            data=json.dumps({
                'email': 'operator_test@pme.sn', 
                'password': 'operatorpassword',
                'source': 'admin_portal'
            }),
            content_type='application/json'
        )
        token = response.json()['access']
        headers = {'HTTP_AUTHORIZATION': f'Bearer {token}'}
        
        # Test GET PMEs list
        list_response = self.client.get('/api/core/pmes/', **headers)
        self.assertEqual(list_response.status_code, 200)
        self.assertGreaterEqual(len(list_response.json()), 2)

    def test_non_operator_blocked_from_listing_pmes(self):
        headers = self.get_auth_headers('dirigeant_croissance@pme.sn', 'password123')
        list_response = self.client.get('/api/core/pmes/', **headers)
        self.assertEqual(list_response.status_code, 403)

    def test_rendezvous_lifecycle_in_tenant(self):
        headers = self.get_auth_headers('dirigeant_croissance@pme.sn', 'password123')
        
        # Test creation of rendezvous
        payload = {
            "date": "2026-07-10",
            "heure": "10:30",
            "partenaire": "ADPME Consultant",
            "motif": "Audit de performance et revue du score crédit"
        }
        response = self.client.post(
            f'/api/core/pme/{self.pme_croissance.id}/rendezvous/',
            data=json.dumps(payload),
            content_type='application/json',
            **headers
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['status'], 'success')
        self.assertEqual(response.json()['rendezvous']['partenaire'], 'ADPME Consultant')
        
        # Test listing of rendezvous
        list_response = self.client.get(
            f'/api/core/pme/{self.pme_croissance.id}/rendezvous/',
            **headers
        )
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()), 1)
        self.assertEqual(list_response.json()[0]['motif'], "Audit de performance et revue du score crédit")


from unittest.mock import patch

class PaystackTestCase(TestCase):
    """
    Tests Paystack transaction initialization, callback verification, and webhook handling.
    """
    def setUp(self):
        self.pme = PME.objects.create(
            nom="Test Paystack PME",
            secteur="Services",
            siren="SN-PAY-999",
            plan="starter",
            nom_schema="tenant_test_paystack"
        )
        self.user = User.objects.create_user(
            email="billing@paystack.sn",
            password="password123",
            role="dirigeant",
            pme=self.pme
        )
        self.client = Client()

    def get_auth_headers(self):
        response = self.client.post(
            '/api/core/auth/login/',
            data=json.dumps({'email': 'billing@paystack.sn', 'password': 'password123'}),
            content_type='application/json'
        )
        token = response.json()['access']
        return {'HTTP_AUTHORIZATION': f'Bearer {token}'}

    @patch('requests.post')
    def test_abonnement_view_initializes_paystack_successfully(self, mock_post):
        # Mock requests.post for Paystack init
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            "status": True,
            "data": {
                "authorization_url": "https://checkout.paystack.com/mock_checkout_link"
            }
        }
        
        headers = self.get_auth_headers()
        response = self.client.post(
            f'/api/core/pme/{self.pme.id}/abonnement/',
            data=json.dumps({"plan": "pilote"}),
            content_type='application/json',
            **headers
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'payment_required')
        self.assertEqual(response.json()['checkout_url'], 'https://checkout.paystack.com/mock_checkout_link')

    @patch('requests.get')
    def test_paystack_callback_view_upgrades_plan_on_success(self, mock_get):
        # Mock requests.get for Paystack verify
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "status": True,
            "data": {
                "status": "success",
                "reference": f"pme_{self.pme.id}_plan_croissance_12345"
            }
        }
        
        reference = f"pme_{self.pme.id}_plan_croissance_12345"
        response = self.client.get(f'/api/core/webhook/paystack/callback/?reference={reference}')
        
        self.assertEqual(response.status_code, 200)
        self.assertIn("Paiement Paystack Réussi", response.content.decode('utf-8'))
        
        # Verify plan was upgraded in DB
        self.pme.refresh_from_db()
        self.assertEqual(self.pme.plan, 'croissance')

    def test_paystack_webhook_upgrades_plan_on_success(self):
        reference = f"pme_{self.pme.id}_plan_pilote_67890"
        payload = {
            "event": "charge.success",
            "data": {
                "reference": reference,
                "status": "success",
                "amount": 1500000
            }
        }
        
        response = self.client.post(
            '/api/core/webhook/paystack/',
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'success')
        
        # Verify plan was upgraded in DB
        self.pme.refresh_from_db()
        self.assertEqual(self.pme.plan, 'pilote')


from decimal import Decimal
from datetime import datetime
from core.models import Transaction, Facture, Reconciliation

class ReconciliationTestCase(TestCase):
    def setUp(self):
        self.pme = PME.objects.create(
            nom="Dakar Business S.A.R.L.",
            secteur="Services",
            siren="SN-DKB-991",
            plan="croissance",
            nom_schema="tenant_dakar_business_test"
        )
        self.user = User.objects.create_user(
            email="billing@dakarbusiness.sn",
            password="password123",
            role="dirigeant",
            pme=self.pme
        )
        self.client = Client()
        
        # Force schema path to PME's tenant
        with connection.cursor() as cursor:
            cursor.execute(f"SET search_path TO {self.pme.nom_schema}, public")

    def get_auth_headers(self):
        response = self.client.post(
            '/api/core/auth/login/',
            data=json.dumps({'email': 'billing@dakarbusiness.sn', 'password': 'password123'}),
            content_type='application/json'
        )
        token = response.json()['access']
        return {'HTTP_AUTHORIZATION': f'Bearer {token}'}

    def test_create_and_list_factures(self):
        headers = self.get_auth_headers()
        
        # Create invoice
        payload = {
            "numero": "FAC-2026-001",
            "date_emission": "2026-07-01",
            "date_echeance": "2026-07-31",
            "client_nom": "Senegal Retailers",
            "montant": "250000.00"
        }
        response = self.client.post(
            f'/api/core/pme/{self.pme.id}/factures/',
            data=json.dumps(payload),
            content_type='application/json',
            **headers
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['status'], 'success')
        self.assertEqual(response.json()['facture']['numero'], 'FAC-2026-001')

        # List invoices
        list_resp = self.client.get(
            f'/api/core/pme/{self.pme.id}/factures/',
            **headers
        )
        self.assertEqual(list_resp.status_code, 200)
        self.assertEqual(len(list_resp.json()), 1)
        self.assertEqual(list_resp.json()[0]['numero'], 'FAC-2026-001')

    def test_suggest_and_confirm_reconciliation(self):
        headers = self.get_auth_headers()
        
        # Reset schema path because HTTP call reset it
        with connection.cursor() as cursor:
            cursor.execute(f"SET search_path TO {self.pme.nom_schema}, public")

        # Create an unpaid invoice
        inv = Facture.objects.create(
            numero="FAC-2026-002",
            date_emission=datetime.strptime("2026-07-01", "%Y-%m-%d").date(),
            date_echeance=datetime.strptime("2026-07-31", "%Y-%m-%d").date(),
            client_nom="Senegal Retailers",
            montant=Decimal('250000.00'),
            statut='envoyee'
        )

        # Create an unreconciled credit transaction with matching amount & keywords
        tx = Transaction.objects.create(
            date=datetime.strptime("2026-07-05", "%Y-%m-%d").date(),
            montant=Decimal('250000.00'),
            type='credit',
            categorie='Ventes B2B',
            description="Paiement Facture FAC-2026-002 par Senegal Retailers"
        )

        # Call suggestions endpoint
        sug_resp = self.client.get(
            f'/api/core/pme/{self.pme.id}/reconciliation/suggerer/',
            **headers
        )
        self.assertEqual(sug_resp.status_code, 200)
        
        # Reset schema path
        with connection.cursor() as cursor:
            cursor.execute(f"SET search_path TO {self.pme.nom_schema}, public")
            
        data = sug_resp.json()
        self.assertEqual(data['status'], 'success')
        self.assertGreater(len(data['suggestions']), 0)
        self.assertEqual(data['suggestions'][0]['suggestions'][0]['invoice_id'], inv.id)
        self.assertGreaterEqual(data['suggestions'][0]['suggestions'][0]['score'], 80.0)

        # Confirm reconciliation
        confirm_payload = {
            "transaction_id": tx.id,
            "invoice_id": inv.id,
            "confiance": data['suggestions'][0]['suggestions'][0]['score']
        }
        confirm_resp = self.client.post(
            f'/api/core/pme/{self.pme.id}/reconciliation/confirmer/',
            data=json.dumps(confirm_payload),
            content_type='application/json',
            **headers
        )
        self.assertEqual(confirm_resp.status_code, 201)
        self.assertEqual(confirm_resp.json()['status'], 'success')

        # Reset schema path to fetch updated objects
        with connection.cursor() as cursor:
            cursor.execute(f"SET search_path TO {self.pme.nom_schema}, public")

        # Verify database state changes
        inv.refresh_from_db()
        self.assertEqual(inv.statut, 'payee')
        self.assertTrue(Reconciliation.objects.filter(transaction=tx, facture=inv).exists())

