from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action, api_view
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response

from .models import Alerta, Establecimiento, Lote, Medicamento, Movimiento
from .serializers import (AlertaSerializer, EstablecimientoSerializer, LoteSerializer,
                          MedicamentoSerializer, MovimientoSerializer, VerificacionSerializer)
from .services import saldos_positivos


@api_view(['GET'])
def status(request):
    return Response({'sistema': 'CloudMed Trace GT', 'empresa': 'CloudColor', 'estado': 'API funcionando'})


class BaseViewSet(viewsets.ModelViewSet):
    # SQLite IMMEDIATE toma el bloqueo ANTES de leer y validar el saldo.
    # Incluye get_object y serializer.is_valid para no actualizar datos obsoletos.
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


class MedicamentoViewSet(BaseViewSet):
    queryset = Medicamento.objects.all()
    serializer_class = MedicamentoSerializer

    def get_queryset(self):
        buscar = self.request.query_params.get('buscar', '').strip()
        return super().get_queryset().filter(Q(nombre__icontains=buscar) | Q(principio_activo__icontains=buscar))


class EstablecimientoViewSet(BaseViewSet):
    queryset = Establecimiento.objects.all()
    serializer_class = EstablecimientoSerializer

    def get_queryset(self):
        buscar = self.request.query_params.get('buscar', '').strip()
        return super().get_queryset().filter(Q(nombre__icontains=buscar) | Q(departamento__icontains=buscar) | Q(municipio__icontains=buscar))


class LoteViewSet(BaseViewSet):
    queryset = Lote.objects.select_related('medicamento').all()
    serializer_class = LoteSerializer

    def get_queryset(self):
        buscar = self.request.query_params.get('buscar', '').strip()
        return super().get_queryset().filter(numero_lote__icontains=buscar)

    @action(detail=False, methods=['get'])
    def buscar(self, request):
        numero = request.query_params.get('numero', '').strip()
        if not numero:
            raise ValidationError({'numero': 'Indica el número de lote.'})
        return Response(self.get_serializer(obtener_lote(numero)).data)


class MovimientoViewSet(BaseViewSet):
    queryset = Movimiento.objects.select_related('lote', 'origen', 'destino').all()
    serializer_class = MovimientoSerializer


class AlertaViewSet(BaseViewSet):
    queryset = Alerta.objects.select_related('lote').all()
    serializer_class = AlertaSerializer


def obtener_lote(numero_lote):
    try:
        return Lote.objects.select_related('medicamento').get(numero_lote=numero_lote)
    except Lote.DoesNotExist:
        raise NotFound('No se encontró un lote con ese número.')


@api_view(['GET'])
@transaction.atomic
def trazabilidad(request, numero_lote):
    # Una sola instantánea para estado, saldos e historial.
    lote = obtener_lote(numero_lote)
    datos = LoteSerializer(lote).data
    movimientos = lote.movimientos.select_related('lote', 'origen', 'destino').order_by('fecha_movimiento', 'id')
    return Response({'lote': datos, 'estado': datos['estado'], 'saldos': saldos_positivos(lote),
                     'movimientos': MovimientoSerializer(movimientos, many=True).data})


@api_view(['GET'])
def verificar(request, numero_lote):
    return Response(VerificacionSerializer(obtener_lote(numero_lote)).data)


@api_view(['GET'])
@transaction.atomic
def dashboard(request):
    # SEGURO o PROXIMO_A_VENCER: no vencido y sin alerta activa.
    activos = Lote.objects.filter(fecha_vencimiento__gte=timezone.localdate()).exclude(alertas__activa=True)
    ultimos = Movimiento.objects.select_related('lote', 'origen', 'destino').order_by('-fecha_movimiento', '-id')[:5]
    return Response({
        'medicamentos': Medicamento.objects.count(),
        'lotes_activos': activos.count(),
        'alertas_activas': Alerta.objects.filter(activa=True).count(),
        'movimientos': Movimiento.objects.count(),
        'ultimos_movimientos': MovimientoSerializer(ultimos, many=True).data,
    })
