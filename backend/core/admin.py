from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from django.http import HttpResponseRedirect

from .models import Alerta, Establecimiento, Lote, Medicamento, Movimiento

admin.site.register([Medicamento, Establecimiento, Lote, Alerta])


@admin.register(Movimiento)
class MovimientoAdmin(admin.ModelAdmin):
    # El borrado masivo de Django omite Model.delete y sus validaciones.
    actions = None

    def delete_view(self, request, object_id, extra_context=None):
        try:
            return super().delete_view(request, object_id, extra_context)
        except ValidationError as error:
            self.message_user(request, ' '.join(error.messages), level=messages.ERROR)
            return HttpResponseRedirect(request.path)
