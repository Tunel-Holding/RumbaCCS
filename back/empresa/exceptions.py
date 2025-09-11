from rest_framework.exceptions import APIException

class BusinessRuleException(APIException):
    status_code = 403
    default_detail = "Acción no permitida por reglas de negocio."
    default_code = "business_rule"

class SoloUsuariosPuedenCalificar(BusinessRuleException):
    default_detail = "Solo usuarios pueden calificar empresas."
    default_code = "solo_usuarios"

class DebesEstarAutenticado(BusinessRuleException):
    default_detail = "Debes iniciar sesión para realizar esta acción."
    default_code = "no_autenticado"

class NoPuedesCalificarTuEmpresa(BusinessRuleException):
    default_detail = "No puedes calificar tu propia empresa."
    default_code = "auto_calificacion"