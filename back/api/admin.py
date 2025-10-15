# admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Usuario

class UsuarioAdmin(BaseUserAdmin):
    model = Usuario
    list_display = ('email', 'username', 'phone', 'region', 'gender', 'is_staff', 'is_superuser', 'is_active')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'region', 'gender')
    search_fields = ('email', 'username', 'phone')
    ordering = ('email',)

    fieldsets = (
        (None, {'fields': ('email', 'username', 'phone', 'password')}),
        ('Información personal', {'fields': ('birthday', 'region', 'gender', 'avatar_path', 'avatar_url')}),
        ('Permisos', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'phone', 'password1', 'password2', 'is_staff', 'is_active')}
        ),
    )

admin.site.register(Usuario, UsuarioAdmin)