"""Cinco entidades del MVP; las existencias y el estado nunca se almacenan."""
from datetime import date

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.db.models import F, Q


class ModeloValidado(models.Model):
    class Meta:
        abstract = True

    def clean_fields(self, exclude=None):
        # También evita textos vacíos desde el admin o create() del ORM.
        for field in self._meta.fields:
            if isinstance(field, models.CharField):
                value = getattr(self, field.name)
                if isinstance(value, str):
                    setattr(self, field.name, value.strip())
        super().clean_fields(exclude=exclude)

    @transaction.atomic
    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class Medicamento(ModeloValidado):
    nombre = models.CharField(max_length=200)
    principio_activo = models.CharField(max_length=200)
    presentacion = models.CharField(max_length=150)
    fabricante = models.CharField(max_length=200)
    registro_sanitario = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f'{self.nombre} ({self.presentacion})'


class Establecimiento(ModeloValidado):
    class Tipo(models.TextChoices):
        HOSPITAL = 'HOSPITAL', 'Hospital'
        CENTRO_SALUD = 'CENTRO_SALUD', 'Centro de salud'
        BODEGA = 'BODEGA', 'Bodega'
        AREA_SALUD = 'AREA_SALUD', 'Área de salud'
        FARMACIA_INSTITUCIONAL = 'FARMACIA_INSTITUCIONAL', 'Farmacia institucional'

    nombre = models.CharField(max_length=200)
    tipo = models.CharField(max_length=25, choices=Tipo.choices)
    departamento = models.CharField(max_length=100)
    municipio = models.CharField(max_length=100)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.nombre


class Lote(ModeloValidado):
    medicamento = models.ForeignKey(Medicamento, on_delete=models.PROTECT, related_name='lotes')
    numero_lote = models.CharField(max_length=100, unique=True)
    fecha_fabricacion = models.DateField()
    fecha_vencimiento = models.DateField()
    cantidad_inicial = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    class Meta:
        ordering = ['id']
        constraints = [
            models.CheckConstraint(condition=Q(cantidad_inicial__gt=0), name='lote_cantidad_positiva'),
            models.CheckConstraint(condition=Q(fecha_vencimiento__gt=F('fecha_fabricacion')), name='lote_fechas_validas'),
        ]

    def clean(self):
        super().clean()
        if isinstance(self.fecha_fabricacion, date) and isinstance(self.fecha_vencimiento, date):
            if self.fecha_vencimiento <= self.fecha_fabricacion:
                raise ValidationError({'fecha_vencimiento': 'Debe ser posterior a la fecha de fabricación.'})
        if self.pk and isinstance(self.cantidad_inicial, int) and self.cantidad_inicial > 0:
            from .services import validar_historial
            try:
                validar_historial(self)
            except ValidationError as error:
                raise ValidationError({'cantidad_inicial': error.messages})

    def __str__(self):
        return self.numero_lote


class Movimiento(ModeloValidado):
    class Tipo(models.TextChoices):
        INGRESO = 'INGRESO', 'Ingreso'
        TRASLADO = 'TRASLADO', 'Traslado'

    lote = models.ForeignKey(Lote, on_delete=models.PROTECT, related_name='movimientos')
    origen = models.ForeignKey(Establecimiento, on_delete=models.PROTECT, related_name='salidas', null=True, blank=True)
    destino = models.ForeignKey(Establecimiento, on_delete=models.PROTECT, related_name='entradas')
    cantidad = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    fecha_movimiento = models.DateTimeField(auto_now_add=True)
    tipo_movimiento = models.CharField(max_length=10, choices=Tipo.choices)

    class Meta:
        ordering = ['fecha_movimiento', 'id']
        constraints = [
            models.CheckConstraint(condition=Q(cantidad__gt=0), name='movimiento_cantidad_positiva'),
            models.CheckConstraint(
                condition=Q(tipo_movimiento='INGRESO') | (
                    Q(tipo_movimiento='TRASLADO', origen__isnull=False) & ~Q(origen=F('destino'))
                ), name='movimiento_ruta_valida',
            ),
        ]

    def clean(self):
        super().clean()
        if self.tipo_movimiento == self.Tipo.TRASLADO:
            if not self.origen_id:
                raise ValidationError({'origen': 'Es obligatorio para un traslado.'})
            if self.origen_id == self.destino_id:
                raise ValidationError({'destino': 'Debe ser distinto del origen.'})
        # full_clean llama clean aun cuando otro campo es inválido.
        if (self.tipo_movimiento in self.Tipo.values and isinstance(self.cantidad, int)
                and self.cantidad > 0 and self.destino_id and Lote.objects.filter(pk=self.lote_id).exists()):
            from .services import validar_movimiento
            validar_movimiento(self)

    @transaction.atomic
    def delete(self, *args, **kwargs):
        from .services import validar_historial
        validar_historial(self.lote, excluir_id=self.pk)
        return super().delete(*args, **kwargs)

    def __str__(self):
        return f'{self.tipo_movimiento}: {self.lote} · {self.cantidad}'


class Alerta(ModeloValidado):
    class Tipo(models.TextChoices):
        BLOQUEO = 'BLOQUEO', 'Bloqueo'
        RETIRO = 'RETIRO', 'Retiro'
        SOSPECHA = 'SOSPECHA', 'Sospecha'

    lote = models.ForeignKey(Lote, on_delete=models.PROTECT, related_name='alertas')
    tipo = models.CharField(max_length=10, choices=Tipo.choices)
    motivo = models.CharField(max_length=1000)
    fecha = models.DateTimeField(auto_now_add=True)
    activa = models.BooleanField(default=True)

    class Meta:
        ordering = ['fecha', 'id']

    def __str__(self):
        return f'{self.tipo}: {self.lote}'
