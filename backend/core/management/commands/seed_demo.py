"""Escenario académico aditivo. Fechas relativas al crear; no reinicia cambios."""
from datetime import timedelta
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from core.models import Medicamento, Establecimiento, Lote, Movimiento, Alerta

MEDICAMENTOS = [
    ('Amoxicilina', '500 mg cápsulas', 'AMX'),
    ('Paracetamol', '500 mg tabletas', 'PAR'),
    ('Ibuprofeno', '400 mg tabletas', 'IBU'),
    ('Azitromicina', '500 mg tabletas', 'AZI'),
    ('Omeprazol', '20 mg cápsulas', 'OME'),
    ('Losartán', '50 mg tabletas', 'LOS'),
    ('Metformina', '850 mg tabletas', 'MET'),
    ('Loratadina', '10 mg tabletas', 'LOR'),
    ('Diclofenaco', '50 mg tabletas', 'DIC'),
    ('Cefalexina', '500 mg cápsulas', 'CEF'),
]
ESTABLECIMIENTOS = [
    ('Bodega Central', 'BODEGA', 'Quetzaltenango', 'Quetzaltenango'),
    ('Área de Salud Quetzaltenango', 'AREA_SALUD', 'Quetzaltenango', 'Quetzaltenango'),
    ('Hospital Regional de Occidente', 'HOSPITAL', 'Quetzaltenango', 'Quetzaltenango'),
    ('Centro de Salud Zona 3', 'CENTRO_SALUD', 'Quetzaltenango', 'Quetzaltenango'),
    ('Centro de Salud La Esperanza', 'CENTRO_SALUD', 'Quetzaltenango', 'La Esperanza'),
    ('Hospital de Totonicapán', 'HOSPITAL', 'Totonicapán', 'Totonicapán'),
    ('Bodega Regional Occidente', 'BODEGA', 'Quetzaltenango', 'Quetzaltenango'),
]
# medicamento, número, días hasta vencer, cantidad, ruta, bloqueo
LOTES = [
    (0, 'CMT-AMX-01', 365, 5000, (0, 1, 2), False),
    (1, 'CMT-PAR-01', 30, 5000, (0, 1, 2), False),
    (2, 'CMT-IBU-01', 365, 5000, (0, 1, 2), True),
    (3, 'CMT-AZI-01', 240, 500, (6, 4, 3), False),
    (4, 'CMT-OME-01', 300, 1000, (6, 5, 2), False),
    (5, 'CMT-LOS-01', 45, 2500, (0, 1, 3), False),
    (6, 'CMT-MET-01', 450, 10000, (6, 4, 5), False),
    (7, 'CMT-LOR-01', 200, 1000, (0, 3, 4), False),
    (8, 'CMT-DIC-01', -15, 500, (6, 4, 5), False),
    (9, 'CMT-CEF-01', 270, 2500, (6, 5, 2), True),
    (0, 'CMT-AMX-02', 540, 10000, (0, 1, 5), False),
    (1, 'CMT-PAR-02', -30, 1000, (0, 1, 2), False),
]
LEGACY = ['DEMO-AMX-SEGURO', 'DEMO-PAR-PROXIMO', 'DEMO-IBU-BLOQUEADO']


class Command(BaseCommand):
    help = 'Crea el escenario académico sin duplicar, borrar ni reiniciar registros.'

    @transaction.atomic
    def handle(self, *args, **options):
        hoy = timezone.localdate()
        establecimientos = []
        for nombre, tipo, departamento, municipio in ESTABLECIMIENTOS:
            # Limpieza puntual del nombre exacto del escenario anterior. Conserva IDs y referencias.
            anteriores = Establecimiento.objects.filter(nombre=nombre + ' (demo CloudColor)',
                tipo=tipo, departamento=departamento, municipio=municipio)
            for anterior in anteriores:
                anterior.nombre = nombre
                anterior.save()
            establecimiento = Establecimiento.objects.filter(nombre=nombre, tipo=tipo,
                departamento=departamento, municipio=municipio).order_by('id').first()
            if establecimiento is None:
                establecimiento = Establecimiento.objects.create(nombre=nombre, tipo=tipo,
                    departamento=departamento, municipio=municipio)
            establecimientos.append(establecimiento)
        medicamentos = []
        for index, (nombre, presentacion, _) in enumerate(MEDICAMENTOS):
            registro = f'CMT-ACA-{index + 1:03d}'
            if index < len(LEGACY):
                anterior = Medicamento.objects.filter(registro_sanitario='CMT-' + LEGACY[index],
                    fabricante='CloudColor demo ficticia').first()
                if anterior:
                    if Medicamento.objects.filter(registro_sanitario=registro).exclude(pk=anterior.pk).exists():
                        raise CommandError('Registro académico en conflicto; no se modificó la base.')
                    anterior.registro_sanitario = registro
                    anterior.fabricante = 'Laboratorios CloudColor (ficticio)'
                    if anterior.presentacion in ('500 mg', '400 mg'):
                        anterior.presentacion = presentacion
                    anterior.save()
            medicamento, _ = Medicamento.objects.get_or_create(registro_sanitario=registro,
                defaults=dict(nombre=nombre, principio_activo=nombre, presentacion=presentacion,
                    fabricante='Laboratorios CloudColor (ficticio)'))
            medicamentos.append(medicamento)
        for index, (med, numero, dias, cantidad, ruta, bloqueo) in enumerate(LOTES):
            if index < len(LEGACY):
                anterior = Lote.objects.filter(numero_lote=LEGACY[index], medicamento=medicamentos[med]).first()
                if anterior:
                    if Lote.objects.filter(numero_lote=numero).exclude(pk=anterior.pk).exists():
                        raise CommandError('Número de lote académico en conflicto; no se modificó la base.')
                    anterior.numero_lote = numero
                    anterior.save()
                    for alerta in anterior.alertas.filter(motivo='Alerta ficticia del escenario demo CloudColor.'):
                        alerta.motivo = 'Incidencia ficticia para evaluación académica.'
                        alerta.save()
            lote, creado = Lote.objects.get_or_create(numero_lote=numero, defaults=dict(
                medicamento=medicamentos[med], fecha_fabricacion=hoy - timedelta(days=180),
                fecha_vencimiento=hoy + timedelta(days=dias), cantidad_inicial=cantidad))
            if creado:
                origen, intermedio, destino = [establecimientos[i] for i in ruta]
                Movimiento.objects.create(lote=lote, destino=origen, cantidad=cantidad, tipo_movimiento='INGRESO')
                # Los vencidos se reciben, pero jamás se trasladan.
                if dias >= 0:
                    Movimiento.objects.create(lote=lote, origen=origen, destino=intermedio,
                        cantidad=cantidad * 2 // 5, tipo_movimiento='TRASLADO')
                    Movimiento.objects.create(lote=lote, origen=intermedio, destino=destino,
                        cantidad=cantidad // 5, tipo_movimiento='TRASLADO')
                if bloqueo:
                    Alerta.objects.create(lote=lote, tipo='BLOQUEO', motivo='Incidencia ficticia para evaluación académica.')
            self.stdout.write(f'{numero}: ' + ('creado' if creado else 'existente, conservado'))
        self.stdout.write(self.style.SUCCESS('Escenario preparado. Datos ficticios; sin integración oficial del MSPAS.'))
