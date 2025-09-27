
from django.contrib import admin
from django.utils import timezone
from django import forms
from django.contrib.admin.helpers import ActionForm
from .models import Empresa

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
    list_filter = ('status', 'activo', 'company_verified', 'lugar')
    search_fields = ('nombre', 'rif', 'email')
    readonly_fields = ('verified_by', 'verified_at', 'fecha_creacion')
    date_hierarchy = 'fecha_creacion'

    action_form = VerificacionActionForm
    actions = ['aprobar_empresas', 'rechazar_empresas']

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('verified_by')

    def aprobar_empresas(self, request, queryset):
        notes = request.POST.get('notes', '')
        count = 0
        for empresa in queryset:
            if not empresa.activo:
                continue
            empresa.approve(user=request.user, notes=notes)  # 👈 usa el método del modelo
            count += 1
        self.message_user(request, f"{count} empresa(s) aprobada(s).")
    aprobar_empresas.short_description = "Aprobar empresas seleccionadas"

    def rechazar_empresas(self, request, queryset):
        reason = request.POST.get('reason', '')
        count = 0
        for empresa in queryset:
            empresa.reject(user=request.user, reason=reason)  # 👈 usa el método del modelo
            count += 1
        self.message_user(request, f"{count} empresa(s) rechazada(s).")
    rechazar_empresas.short_description = "Rechazar empresas seleccionadas"
    
    def save_model(self, request, obj, form, change):
        # Si el status cambió a aprobado/rechazado desde el admin normal
        if obj.status == 'approved' and not obj.verified_by:
            obj.verified_by = request.user
            obj.verified_at = timezone.now()
        elif obj.status == 'rejected' and not obj.verified_by:
            obj.verified_by = request.user
            obj.verified_at = timezone.now()
        super().save_model(request, obj, form, change)

    exclude = ('seguidores',) # Evita que aparezca en el formulario de edición
    
# from django.contrib import admin
# from django.utils import timezone
# from django import forms
# from httpx import request
# from .models import Empresa
# from django.contrib.admin.helpers import ActionForm


# class VerificacionActionForm(ActionForm):
#     notes = forms.CharField(
#         required=False, label="Notas de aprobación",
#         widget=forms.Textarea(attrs={"rows": 2})
#     )
#     reason = forms.CharField(
#         required=False, label="Motivo de rechazo",
#         widget=forms.Textarea(attrs={"rows": 2})
#     )
# @admin.register(Empresa)
# class EmpresaAdmin(admin.ModelAdmin):
#     list_display = ('nombre', 'rif', 'email', 'lugar', 'activo', 'company_verified', 'status', 'verified_by', 'verified_at')
#     list_filter = ('status', 'activo', 'company_verified', 'lugar')
#     search_fields = ('nombre', 'rif', 'email')
#     readonly_fields = ('verified_by', 'verified_at', 'fecha_creacion')
#     date_hierarchy = 'fecha_creacion'

#     # Formulario que aparece sobre el listado de acciones
#     action_form = VerificacionActionForm
#     actions = ['aprobar_empresas', 'rechazar_empresas']

#     def get_queryset(self, request):
#         qs = super().get_queryset(request)
#         return qs.select_related('verified_by')

#     def aprobar_empresas(self, request, queryset):
#         notes = request.POST.get('notes', '')
#         count = 0
#         for empresa in queryset:
#             if not empresa.activo:
#                 continue
#             empresa.company_verified = True
#             empresa.status = "aprobada"
#             empresa.verified_by = request.user        # 👈 staff que aprobó
#             empresa.verified_at = timezone.now()      # 👈 fecha/hora actual
#             empresa.save(update_fields=["company_verified", "status", "verified_by", "verified_at"])
#             count += 1
#         self.message_user(request, f"{count} empresa(s) aprobada(s).")

#     aprobar_empresas.short_description = "Aprobar empresas seleccionadas"

#     def rechazar_empresas(self, request, queryset):
#         reason = request.POST.get('reason', '')
#         count = 0
#         for empresa in queryset:
#             empresa.company_verified = False
#             empresa.status = "rechazada"
#             empresa.verified_by = request.user        # 👈 staff que rechazó
#             empresa.verified_at = timezone.now()      # 👈 fecha/hora actual
#             empresa.save(update_fields=["company_verified", "status", "verified_by", "verified_at"])
#             count += 1
#         self.message_user(request, f"{count} empresa(s) rechazada(s).")

#     rechazar_empresas.short_description = "Rechazar empresas seleccionadas"