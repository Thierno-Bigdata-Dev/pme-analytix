from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import PME, User, Partenaire, Transaction, Alerte, RapportPDF

@admin.register(PME)
class PMEAdmin(admin.ModelAdmin):
    list_display = ('nom', 'secteur', 'siren', 'plan', 'nom_schema', 'created_at')
    search_fields = ('nom', 'siren', 'nom_schema')
    list_filter = ('plan', 'secteur')

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'role', 'pme', 'is_staff', 'is_active')
    search_fields = ('email',)
    list_filter = ('role', 'is_staff', 'is_active')
    ordering = ('email',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Informations personnelles', {'fields': ('first_name', 'last_name')}),
        ('Rôle & PME', {'fields': ('role', 'pme')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password', 'role', 'pme', 'is_staff', 'is_active'),
        }),
    )

@admin.register(Partenaire)
class PartenaireAdmin(admin.ModelAdmin):
    list_display = ('nom', 'type', 'commission_pct')
    search_fields = ('nom',)
    list_filter = ('type',)

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('date', 'type', 'montant', 'categorie', 'created_at')
    list_filter = ('type', 'categorie', 'date')
    search_fields = ('categorie', 'description')

@admin.register(Alerte)
class AlerteAdmin(admin.ModelAdmin):
    list_display = ('type', 'seuil', 'statut', 'canal', 'date_creation')
    list_filter = ('statut', 'canal', 'type')
    search_fields = ('type',)

@admin.register(RapportPDF)
class RapportPDFAdmin(admin.ModelAdmin):
    list_display = ('type', 'prix', 'created_at')
    list_filter = ('type', 'created_at')
    search_fields = ('signature',)
