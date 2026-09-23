from rest_framework import serializers

from .models import Alerta, Establecimiento, Lote, Medicamento, Movimiento
from .services import calcular_estado


class MedicamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medicamento
        fields = ['id', 'nombre', 'principio_activo', 'presentacion', 'fabricante', 'registro_sanitario']
        read_only_fields = ['id']


class EstablecimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Establecimiento
        fields = ['id', 'nombre', 'tipo', 'departamento', 'municipio']
        read_only_fields = ['id']


class LoteSerializer(serializers.ModelSerializer):
    medicamento_nombre = serializers.CharField(source='medicamento.nombre', read_only=True)
    estado = serializers.SerializerMethodField()

    class Meta:
        model = Lote
        fields = ['id', 'numero_lote', 'medicamento', 'medicamento_nombre',
                  'fecha_fabricacion', 'fecha_vencimiento', 'cantidad_inicial', 'estado']
        read_only_fields = ['id']

    def get_estado(self, obj):
        return calcular_estado(obj)


class MovimientoSerializer(serializers.ModelSerializer):
    numero_lote = serializers.CharField(source='lote.numero_lote', read_only=True)
    origen_nombre = serializers.CharField(source='origen.nombre', read_only=True, default=None)
    destino_nombre = serializers.CharField(source='destino.nombre', read_only=True)

    class Meta:
        model = Movimiento
        fields = ['id', 'lote', 'numero_lote', 'origen', 'origen_nombre', 'destino',
                  'destino_nombre', 'cantidad', 'fecha_movimiento', 'tipo_movimiento']
        read_only_fields = ['id', 'fecha_movimiento']


class AlertaSerializer(serializers.ModelSerializer):
    activa = serializers.BooleanField(default=True)
    numero_lote = serializers.CharField(source='lote.numero_lote', read_only=True)

    class Meta:
        model = Alerta
        fields = ['id', 'lote', 'numero_lote', 'tipo', 'motivo', 'fecha', 'activa']
        read_only_fields = ['id', 'fecha']


class VerificacionSerializer(serializers.ModelSerializer):
    medicamento = serializers.CharField(source='medicamento.nombre', read_only=True)
    presentacion = serializers.CharField(source='medicamento.presentacion', read_only=True)
    estado = serializers.SerializerMethodField()

    class Meta:
        model = Lote
        fields = ['medicamento', 'presentacion', 'numero_lote', 'fecha_vencimiento', 'estado']
        read_only_fields = fields

    def get_estado(self, obj):
        return calcular_estado(obj)
