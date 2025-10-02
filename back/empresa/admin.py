
from django.contrib import admin
from django.utils import timezone
from django import forms
from django.contrib.admin.helpers import ActionForm
from httpx import request
from .models import Empresa
from .notifications import notificar_asignacion_empresa, notificar_cambio_status

class EmpresasAsignadasFilter(admin.SimpleListFilter):
    title = "Empresas asignadas"
    parameter_name = "empresas_asignadas"

    def lookups(self, request, model_admin):
        return (
            ("mias", "Asignadas a mí"),
        )

    def queryset(self, request, queryset):
        if self.value() == "mias":
            return queryset.filter(assigned_to=request.user,
                                   status='pending')
        return queryset


class VerificacionActionForm(ActionForm):
    notes = forms.CharField(
        required=False, label="Notas de aprobación",
        widget=forms.Textarea(attrs={"rows": 2, "cols": 40})
    )
    reason = forms.CharField(
        required=False, label="Motivo de rechazo",
        widget=forms.Textarea(attrs={"rows": 2, "cols": 40})
    )

    class Meta:
        fields = ['notes', 'reason']




@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = (
        'nombre', 'rif', 'email', 'lugar', 'activo',
        'company_verified', 'status', 'verified_by', 'verified_at'
    )
    list_filter = ('status', EmpresasAsignadasFilter)
    search_fields = ('nombre', 'rif', 'email')
    readonly_fields = ('verified_by', 'verified_at', 'fecha_creacion')
    date_hierarchy = 'fecha_creacion'

    action_form = VerificacionActionForm
    actions = ['aprobar_empresas', 'rechazar_empresas']
    
    def lookups(self, request, model_admin):
        if request.user.groups.filter(name="Verificadores").exists():
            return (("mias", "Asignadas a mí"),)
        return ()


    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('verified_by')

    def aprobar_empresas(self, request, queryset):
        notes = request.POST.get('notes', '')
        count = 0
        for empresa in queryset:
            if not empresa.activo:
                continue
            empresa.approve(user=request.user, notes=notes)
            count += 1
        self.message_user(request, f"{count} empresa(s) aprobada(s).")
    aprobar_empresas.short_description = "Aprobar empresas seleccionadas"

    def rechazar_empresas(self, request, queryset):
        reason = request.POST.get('reason', '')
        count = 0
        for empresa in queryset:
            empresa.reject(user=request.user, reason=reason)
            count += 1
        self.message_user(request, f"{count} empresa(s) rechazada(s).")
    rechazar_empresas.short_description = "Rechazar empresas seleccionadas"
    
    def save_model(self, request, obj, form, change):
        asignacion_nueva = False
        status_anterior = None

        if change:
            # Detectar si se asignó un validador nuevo
            if 'assigned_to' in form.changed_data and obj.assigned_to:
                asignacion_nueva = True

            # Guardar el status anterior ANTES de guardar cambios
            try:
                status_anterior = Empresa.objects.get(pk=obj.pk).status
            except Empresa.DoesNotExist:
                status_anterior = None

        # Mantener tu lógica de verificación
        if obj.status == 'approved' and not obj.verified_by:
            obj.verified_by = request.user
            obj.verified_at = timezone.now()
        elif obj.status == 'rejected' and not obj.verified_by:
            obj.verified_by = request.user
            obj.verified_at = timezone.now()

        # Guardar normalmente
        super().save_model(request, obj, form, change)

        # 🔹 Enviar correo si hubo asignación nueva
        if asignacion_nueva:
            notificar_asignacion_empresa(obj)

        # 🔹 Enviar correo si el status cambió de pending → approved/rejected
        if change and status_anterior == 'pending' and obj.status in ['approved', 'rejected']:
            notificar_cambio_status(Empresa, obj, created=False)


    exclude = ('seguidores',)

