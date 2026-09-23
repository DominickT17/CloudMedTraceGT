from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, OperationalError
from django.db.models.deletion import ProtectedError
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    if isinstance(exc, ProtectedError):
        return Response({'detail': 'No se puede eliminar: existen registros relacionados.'}, status=400)
    if isinstance(exc, DjangoValidationError):
        errors = exc.message_dict if hasattr(exc, 'message_dict') else {'non_field_errors': exc.messages}
        if '__all__' in errors:
            errors['non_field_errors'] = errors.pop('__all__')
        exc = ValidationError(errors)
    if isinstance(exc, IntegrityError):
        return Response({'detail': 'La operación incumple una restricción de integridad o unicidad.'}, status=400)
    if isinstance(exc, OperationalError) and 'locked' in str(exc).lower():
        return Response({'detail': 'Base de datos ocupada. Consulta el resultado antes de reintentar.'}, status=409)
    return exception_handler(exc, context)
