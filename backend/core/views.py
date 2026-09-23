from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def status(request):
    """Comprueba comunicación HTTP; no consulta inventario ni base de datos."""
    return Response({
        "sistema": "CloudMed Trace GT",
        "empresa": "CloudColor",
        "estado": "API funcionando",
    })
