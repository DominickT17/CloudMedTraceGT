"""Reglas compartidas por serializers, modelos y consultas de trazabilidad."""
from collections import defaultdict

from django.core.exceptions import ValidationError
from django.utils import timezone

from .models import Establecimiento, Lote, Movimiento


def calcular_estado(lote, hoy=None):
    hoy = hoy or timezone.localdate()
    if lote.alertas.filter(activa=True).exists():
        return 'BLOQUEADO'
    dias = (lote.fecha_vencimiento - hoy).days
    if dias < 0:
        return 'VENCIDO'
    if dias <= 90:
        return 'PROXIMO_A_VENCER'
    return 'SEGURO'


def calcular_saldos(lote):
    saldos = defaultdict(int)
    for movimiento in lote.movimientos.all():
        saldos[movimiento.destino_id] += movimiento.cantidad
        if movimiento.tipo_movimiento == Movimiento.Tipo.TRASLADO:
            saldos[movimiento.origen_id] -= movimiento.cantidad
    return dict(saldos)


def saldo_en_establecimiento(lote, establecimiento):
    establecimiento_id = getattr(establecimiento, 'pk', establecimiento)
    return calcular_saldos(lote).get(establecimiento_id, 0)


def saldos_positivos(lote):
    saldos = calcular_saldos(lote)
    establecimientos = Establecimiento.objects.filter(pk__in=saldos).order_by('id')
    return [
        {'establecimiento_id': e.pk, 'establecimiento': e.nombre, 'cantidad': saldos[e.pk]}
        for e in establecimientos if saldos[e.pk] > 0
    ]


def validar_historial(lote, candidato=None, excluir_id=None):
    """Simula el historial final; una corrección no puede invalidar pasos posteriores."""
    movimientos = list(lote.movimientos.exclude(pk=excluir_id))
    if candidato is not None:
        movimientos.append(candidato)
    # Un movimiento nuevo obtiene la fecha del servidor y queda al final.
    ahora = timezone.now()
    movimientos.sort(key=lambda m: (m.fecha_movimiento or ahora, m.pk or float('inf')))
    saldos = defaultdict(int)
    ingresos = 0
    for movimiento in movimientos:
        if movimiento.tipo_movimiento == Movimiento.Tipo.INGRESO:
            ingresos += movimiento.cantidad
            if ingresos > lote.cantidad_inicial:
                raise ValidationError({'cantidad': 'La suma de ingresos supera la cantidad inicial del lote.'})
        else:
            disponible = saldos[movimiento.origen_id]
            if movimiento.cantidad > disponible:
                raise ValidationError({'cantidad': (
                    f'Saldo insuficiente en el origen: disponible {disponible}, '
                    f'solicitado {movimiento.cantidad}. La operación invalidaría el historial.'
                )})
            saldos[movimiento.origen_id] -= movimiento.cantidad
        saldos[movimiento.destino_id] += movimiento.cantidad


def validar_movimiento(movimiento):
    # Leer el lote de nuevo evita usar una relación cacheada con cantidad antigua.
    lote = Lote.objects.get(pk=movimiento.lote_id)
    if movimiento.tipo_movimiento == Movimiento.Tipo.TRASLADO:
        estado = calcular_estado(lote)
        if estado in ('BLOQUEADO', 'VENCIDO'):
            raise ValidationError({'lote': f'No se permiten traslados de un lote {estado}.'})
    if movimiento.pk:
        anterior = Movimiento.objects.filter(pk=movimiento.pk).first()
        if anterior and anterior.lote_id != movimiento.lote_id:
            validar_historial(anterior.lote, excluir_id=movimiento.pk)
    validar_historial(lote, candidato=movimiento, excluir_id=movimiento.pk)
