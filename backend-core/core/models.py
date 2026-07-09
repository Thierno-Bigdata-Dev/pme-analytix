from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager

class PME(models.Model):
    PLAN_CHOICES = (
        ('starter', 'Starter (Gratuit)'),
        ('pilote', 'Pilote (15 000 F/mois)'),
        ('croissance', 'Croissance (45 000 F/mois)'),
    )
    nom = models.CharField(max_length=255)
    secteur = models.CharField(max_length=100)
    siren = models.CharField(max_length=50, unique=True)
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='starter')
    nom_schema = models.CharField(max_length=63, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nom

    class Meta:
        verbose_name = "PME"
        verbose_name_plural = "PMEs"


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'adresse email doit être spécifiée")
        email = self.normalize_email(email)
        user = self.model(email=email, username=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'operateur')
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    ROLE_CHOICES = (
        ('dirigeant', 'Dirigeant PME'),
        ('comptable', 'Comptable PME'),
        ('operateur', 'Opérateur PME Analytix'),
    )
    username = models.CharField(max_length=150, unique=True, blank=True, null=True) # Optional back-compatibility
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='dirigeant')
    pme = models.ForeignKey(PME, on_delete=models.CASCADE, null=True, blank=True, related_name='users')

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    # Fix conflicts with default auth.User groups and permissions
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='pme_user_groups',
        blank=True,
        help_text='The groups this user belongs to.',
        verbose_name='groups',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='pme_user_permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions',
    )

    def __str__(self):
        return f"{self.email} ({self.role})"

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"


class Partenaire(models.Model):
    TYPE_CHOICES = (
        ('banque', 'Banque'),
        ('microfinance', 'Microfinance'),
        ('fintech', 'Fintech'),
    )
    nom = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    api_config = models.JSONField(default=dict, blank=True)
    commission_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)

    def __str__(self):
        return self.nom

    class Meta:
        verbose_name = "Partenaire Financier"
        verbose_name_plural = "Partenaires Financiers"


class Transaction(models.Model):
    TYPE_CHOICES = (
        ('credit', 'Entrée (Crédit)'),
        ('debit', 'Sortie (Débit)'),
    )
    date = models.DateField()
    montant = models.DecimalField(max_digits=15, decimal_places=2)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    categorie = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.type} - {self.montant} FCFA ({self.date})"

    class Meta:
        verbose_name = "Transaction financière"
        verbose_name_plural = "Transactions financières"


class Alerte(models.Model):
    TYPE_CHOICES = (
        ('tresorerie_critique', 'Trésorerie Critique'),
        ('retard_paiement', 'Retard Paiement Client'),
        ('marge_basse', 'Marge sous Benchmark'),
        ('score_baisse', 'Score Crédit en Baisse'),
        ('stock_critique', 'Stock Critique'),
        ('anomalie_depense', 'Anomalie de Dépenses'),
    )
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('resolue', 'Résolue'),
        ('ignoree', 'Ignorée'),
    )
    CANAL_CHOICES = (
        ('sms', 'SMS'),
        ('email', 'Email'),
        ('push', 'Push Notification'),
        ('dashboard', 'Dashboard uniquement'),
    )
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    seuil = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    statut = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    canal = models.CharField(max_length=20, choices=CANAL_CHOICES, default='dashboard')
    date_creation = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True, null=True)
    date_critique = models.DateField(blank=True, null=True)
    montant_jeu = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    action_recommandee = models.CharField(max_length=255, blank=True, null=True)
    lien_direct = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.type} ({self.statut})"

    class Meta:
        verbose_name = "Alerte intelligente"
        verbose_name_plural = "Alertes intelligentes"


class RapportPDF(models.Model):
    TYPE_CHOICES = (
        ('certifie', 'Rapport Certifié OHADA'),
        ('simple', 'Analyse Simple'),
    )
    STATUT_CHOICES = (
        ('en_attente', 'En attente'),
        ('en_cours', 'En cours'),
        ('termine', 'Terminé'),
        ('erreur', 'Erreur'),
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='certifie')
    url_s3 = models.URLField(max_length=500, blank=True)
    signature = models.CharField(max_length=255, blank=True)
    prix = models.DecimalField(max_digits=10, decimal_places=2, default=25000.0) # En FCFA
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Rapport {self.type} - {self.statut} ({self.created_at})"

    class Meta:
        verbose_name = "Rapport PDF certifié"
        verbose_name_plural = "Rapports PDF certifiés"


class RendezVous(models.Model):
    date = models.DateField()
    heure = models.TimeField()
    partenaire = models.CharField(max_length=255)
    motif = models.CharField(max_length=255)
    statut = models.CharField(max_length=20, default='confirme')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"RDV avec {self.partenaire} le {self.date} à {self.heure}"

    class Meta:
        verbose_name = "Rendez-vous"
        verbose_name_plural = "Rendez-vous"


class Facture(models.Model):
    STATUT_CHOICES = (
        ('brouillon', 'Brouillon'),
        ('envoyee', 'Envoyée'),
        ('payee', 'Payée'),
        ('annulee', 'Annulée'),
    )
    numero = models.CharField(max_length=100)
    date_emission = models.DateField()
    date_echeance = models.DateField()
    client_nom = models.CharField(max_length=255)
    montant = models.DecimalField(max_digits=15, decimal_places=2)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='envoyee')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Facture {self.numero} - {self.client_nom} ({self.montant} FCFA)"

    class Meta:
        verbose_name = "Facture client"
        verbose_name_plural = "Factures clients"


class Reconciliation(models.Model):
    METHODE_CHOICES = (
        ('automatique', 'Automatique'),
        ('manuelle', 'Manuelle'),
    )
    transaction = models.OneToOneField(Transaction, on_delete=models.CASCADE, related_name='reconciliation')
    facture = models.ForeignKey(Facture, on_delete=models.CASCADE, related_name='reconciliations')
    date_reconciliation = models.DateTimeField(auto_now_add=True)
    confiance_pct = models.DecimalField(max_digits=5, decimal_places=2)
    methode = models.CharField(max_length=20, choices=METHODE_CHOICES, default='automatique')

    def __str__(self):
        return f"Rapprochement TX#{self.transaction.id} <-> FAC#{self.facture.numero} ({self.confiance_pct}%)"

    class Meta:
        verbose_name = "Rapprochement bancaire"
        verbose_name_plural = "Rapprochements bancaires"


# Signals to automate schema creation
from django.db.models.signals import post_save
from django.dispatch import receiver
from .utils import create_tenant_schema

@receiver(post_save, sender=PME)
def pme_created_signal(sender, instance, created, **kwargs):
    if created:
        create_tenant_schema(instance.nom_schema)

