"""Pruebas del contrato REST y de la conservación de existencias."""
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from unittest.mock import patch

from django.contrib import admin
from django.core.exceptions import ValidationError
from django.db import close_old_connections
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient

from .models import Alerta, Establecimiento, Lote, Medicamento, Movimiento
from .services import calcular_estado, saldo_en_establecimiento, saldos_positivos


def medicamento_datos():
    return dict(nombre='Amoxicilina', principio_activo='Amoxicilina',
                presentacion='500 mg', fabricante='Fabricante demo', registro_sanitario='DEMO-001')


def preparar_dominio():
    medicamento = Medicamento.objects.create(**medicamento_datos())
    origen = Establecimiento.objects.create(nombre='Bodega Central', tipo='BODEGA',
                                           departamento='Quetzaltenango', municipio='Quetzaltenango')
    destino = Establecimiento.objects.create(nombre='Hospital Regional de Occidente', tipo='HOSPITAL',
                                            departamento='Quetzaltenango', municipio='Quetzaltenango')
    lote = Lote.objects.create(medicamento=medicamento, numero_lote='AMX-260923',
                              fecha_fabricacion=timezone.localdate() - timedelta(days=30),
                              fecha_vencimiento=timezone.localdate() + timedelta(days=365), cantidad_inicial=5000)
    return medicamento, origen, destino, lote


class ApiTests(APITestCase):
    def setUp(self):
        self.medicamento, self.origen, self.destino, self.lote = preparar_dominio()

    def movimiento(self, cantidad=5000, tipo='INGRESO', **cambios):
        datos = dict(lote=self.lote.pk, origen=None, destino=self.origen.pk,
                     cantidad=cantidad, tipo_movimiento=tipo)
        if tipo == 'TRASLADO':
            datos.update(origen=self.origen.pk, destino=self.destino.pk)
        datos.update(cambios)
        return self.client.post('/api/movimientos/', datos, format='json')

    def ingreso(self):
        response = self.movimiento()
        self.assertEqual(response.status_code, 201, response.data)
        return response.data['id']

    def test_status_conserva_contrato(self):
        response = self.client.get('/api/status/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'sistema': 'CloudMed Trace GT', 'empresa': 'CloudColor', 'estado': 'API funcionando'})

    def test_crear_medicamento(self):
        datos = medicamento_datos() | {'registro_sanitario': 'DEMO-002'}
        response = self.client.post('/api/medicamentos/', datos)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['nombre'], datos['nombre'])

    def test_rechazar_registro_duplicado(self):
        response = self.client.post('/api/medicamentos/', medicamento_datos())
        self.assertEqual(response.status_code, 400)
        self.assertIn('registro_sanitario', response.data)

    def test_campos_de_medicamento_obligatorios(self):
        for campo in medicamento_datos():
            with self.subTest(campo=campo):
                datos = medicamento_datos() | {'registro_sanitario': 'OTRO', campo: '   '}
                self.assertEqual(self.client.post('/api/medicamentos/', datos).status_code, 400)

    def test_crear_establecimiento(self):
        response = self.client.post('/api/establecimientos/', dict(nombre='Área de Salud Quetzaltenango',
            tipo='AREA_SALUD', departamento='Quetzaltenango', municipio='Quetzaltenango'))
        self.assertEqual(response.status_code, 201)

    def test_tipo_establecimiento_invalido(self):
        response = self.client.patch(f'/api/establecimientos/{self.origen.pk}/', {'tipo': 'OTRO'})
        self.assertEqual(response.status_code, 400)

    def test_crear_lote(self):
        response = self.client.post('/api/lotes/', dict(medicamento=self.medicamento.pk, numero_lote='OTRO',
            fecha_fabricacion='2026-01-01', fecha_vencimiento='2027-01-01', cantidad_inicial=100))
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['medicamento_nombre'], 'Amoxicilina')
        self.assertIn('estado', response.data)
        self.assertEqual(Movimiento.objects.count(), 0)  # El ingreso se registra por separado.

    def test_numero_lote_unico(self):
        response = self.client.post('/api/lotes/', dict(medicamento=self.medicamento.pk,
            numero_lote=self.lote.numero_lote, fecha_fabricacion='2026-01-01',
            fecha_vencimiento='2027-01-01', cantidad_inicial=100))
        self.assertEqual(response.status_code, 400)
        self.assertIn('numero_lote', response.data)

    def test_cantidad_inicial_positiva_entera(self):
        for cantidad in [0, -1, 1.5]:
            with self.subTest(cantidad=cantidad):
                response = self.client.patch(f'/api/lotes/{self.lote.pk}/', {'cantidad_inicial': cantidad})
                self.assertEqual(response.status_code, 400)

    def test_fechas_invalidas_en_patch(self):
        for fecha in [self.lote.fecha_fabricacion, self.lote.fecha_fabricacion - timedelta(days=1)]:
            with self.subTest(fecha=fecha):
                response = self.client.patch(f'/api/lotes/{self.lote.pk}/', {'fecha_vencimiento': str(fecha)})
                self.assertEqual(response.status_code, 400)
                self.assertIn('fecha_vencimiento', response.data)

    def test_no_reducir_cantidad_de_lote_bajo_ingresos(self):
        self.ingreso()
        response = self.client.patch(f'/api/lotes/{self.lote.pk}/', {'cantidad_inicial': 4999})
        self.assertEqual(response.status_code, 400)
        self.lote.refresh_from_db()
        self.assertEqual(self.lote.cantidad_inicial, 5000)

    def test_ingreso_y_traslado_parcial(self):
        self.ingreso()
        response = self.movimiento(2000, 'TRASLADO')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(saldo_en_establecimiento(self.lote, self.origen), 3000)
        self.assertEqual(saldo_en_establecimiento(self.lote, self.destino), 2000)
        self.assertEqual(sum(s['cantidad'] for s in saldos_positivos(self.lote)), 5000)

    def test_ingresos_parciales_y_tope(self):
        self.assertEqual(self.movimiento(3000).status_code, 201)
        self.assertEqual(self.movimiento(2000).status_code, 201)
        self.assertEqual(self.movimiento(1).status_code, 400)
        self.assertEqual(Movimiento.objects.count(), 2)

    def test_ingreso_con_origen_informativo_no_lo_debita(self):
        response = self.movimiento(100, origen=self.destino.pk)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(saldo_en_establecimiento(self.lote, self.destino), 0)
        self.assertEqual(saldo_en_establecimiento(self.lote, self.origen), 100)

    def test_traslado_sin_ingreso(self):
        self.assertEqual(self.movimiento(1, 'TRASLADO').status_code, 400)

    def test_traslado_excesivo(self):
        self.ingreso()
        response = self.movimiento(5001, 'TRASLADO')
        self.assertEqual(response.status_code, 400)
        self.assertIn('Saldo insuficiente', str(response.data))
        self.assertEqual(Movimiento.objects.count(), 1)

    def test_reglas_basicas_movimiento(self):
        self.ingreso()
        for cambios in [dict(origen=None), dict(destino=self.origen.pk), dict(cantidad=0),
                        dict(cantidad=-2), dict(cantidad=1.2), dict(destino=99999), dict(lote=99999)]:
            with self.subTest(cambios=cambios):
                self.assertEqual(self.movimiento(tipo='TRASLADO', **(dict(cantidad=1) | cambios)).status_code, 400)

    def test_estado_seguro(self):
        self.assertEqual(calcular_estado(self.lote), 'SEGURO')

    def test_limites_de_vencimiento(self):
        hoy = timezone.localdate()
        for dias, estado in [(-1, 'VENCIDO'), (0, 'PROXIMO_A_VENCER'), (90, 'PROXIMO_A_VENCER'), (91, 'SEGURO')]:
            with self.subTest(dias=dias):
                self.lote.fecha_vencimiento = hoy + timedelta(days=dias)
                self.assertEqual(calcular_estado(self.lote, hoy), estado)

    def test_estado_usa_dia_de_guatemala(self):
        with patch('core.services.timezone.localdate', return_value=self.lote.fecha_vencimiento + timedelta(days=1)):
            self.assertEqual(calcular_estado(self.lote), 'VENCIDO')

    def test_todas_alertas_activas_bloquean_incluso_vencido(self):
        for tipo in Alerta.Tipo.values:
            with self.subTest(tipo=tipo):
                alerta = Alerta.objects.create(lote=self.lote, tipo=tipo, motivo='Ejemplo ficticio')
                self.assertEqual(calcular_estado(self.lote, self.lote.fecha_vencimiento + timedelta(days=1)), 'BLOQUEADO')
                alerta.delete()

    def test_alerta_inactiva_no_bloquea(self):
        Alerta.objects.create(lote=self.lote, tipo='BLOQUEO', motivo='Demo', activa=False)
        self.assertEqual(calcular_estado(self.lote), 'SEGURO')

    def test_alerta_api_default_y_desactivar(self):
        response = self.client.post('/api/alertas/', {'lote': self.lote.pk, 'tipo': 'SOSPECHA', 'motivo': 'Solo demostración'})
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data['activa'])
        self.assertEqual(calcular_estado(self.lote), 'BLOQUEADO')
        response = self.client.patch(f"/api/alertas/{response.data['id']}/", {'activa': False}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(calcular_estado(self.lote), 'SEGURO')

    def test_alerta_requiere_motivo_y_tipo_valido(self):
        for datos in [{'tipo': 'BLOQUEO', 'motivo': ' '}, {'tipo': 'OTRO', 'motivo': 'Demo'}]:
            self.assertEqual(self.client.post('/api/alertas/', datos | {'lote': self.lote.pk}).status_code, 400)

    def test_bloqueado_no_se_traslada(self):
        self.ingreso()
        Alerta.objects.create(lote=self.lote, tipo='RETIRO', motivo='Demo')
        self.assertEqual(self.movimiento(1, 'TRASLADO').status_code, 400)

    def test_vencido_no_se_traslada(self):
        self.ingreso()
        self.lote.fecha_vencimiento = timezone.localdate() - timedelta(days=1)
        self.lote.save()
        self.assertEqual(self.movimiento(1, 'TRASLADO').status_code, 400)

    def test_campos_derivados_y_fechas_son_read_only(self):
        response = self.movimiento(10, fecha_movimiento='2000-01-01T00:00:00Z')
        self.assertEqual(response.status_code, 201)
        self.assertNotIn('2000', response.data['fecha_movimiento'])
        response = self.client.patch(f'/api/lotes/{self.lote.pk}/', {'estado': 'BLOQUEADO', 'medicamento_nombre': 'Falso'})
        self.assertEqual(response.data['estado'], 'SEGURO')
        self.assertEqual(response.data['medicamento_nombre'], 'Amoxicilina')

    def test_trazabilidad_ordenada_y_saldos_positivos(self):
        ingreso_id = self.ingreso()
        traslado_id = self.movimiento(5000, 'TRASLADO').data['id']
        response = self.client.get(f'/api/trazabilidad/{self.lote.numero_lote}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([m['id'] for m in response.data['movimientos']], [ingreso_id, traslado_id])
        self.assertEqual(response.data['saldos'], [{'establecimiento_id': self.destino.pk,
            'establecimiento': self.destino.nombre, 'cantidad': 5000}])
        self.assertEqual(response.data['estado'], response.data['lote']['estado'])

    def test_buscar_lote_exacto_y_parametro_obligatorio(self):
        response = self.client.get('/api/lotes/buscar/', {'numero': self.lote.numero_lote})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['id'], self.lote.pk)
        self.assertEqual(self.client.get('/api/lotes/buscar/').status_code, 400)

    def test_lote_inexistente_404(self):
        for url in ['/api/lotes/99999/', '/api/lotes/buscar/?numero=NO-EXISTE',
                    '/api/trazabilidad/NO-EXISTE/', '/api/verificar/NO-EXISTE/']:
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 404)

    def test_verificacion_solo_campos_publicos(self):
        response = self.client.get(f'/api/verificar/{self.lote.numero_lote}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.data), {'medicamento', 'presentacion', 'numero_lote', 'fecha_vencimiento', 'estado'})

    def test_numero_con_barra_en_consultas(self):
        self.lote.numero_lote = 'DEMO/001'
        self.lote.save()
        self.assertEqual(self.client.get('/api/verificar/DEMO%2F001/').status_code, 200)
        self.assertEqual(self.client.get('/api/trazabilidad/DEMO%2F001/').status_code, 200)

    def test_filtros_sin_paquetes(self):
        for url, buscar in [('/api/medicamentos/', 'amoxi'), ('/api/lotes/', 'AMX'), ('/api/establecimientos/', 'Quetzaltenango')]:
            with self.subTest(url=url):
                response = self.client.get(url, {'buscar': buscar})
                self.assertEqual(response.status_code, 200)
                self.assertTrue(response.data)
                self.assertEqual(self.client.get(url, {'buscar': 'NO-EXISTE'}).data, [])

    def test_borrado_protege_relaciones(self):
        self.ingreso()
        for url in [f'/api/medicamentos/{self.medicamento.pk}/', f'/api/lotes/{self.lote.pk}/',
                    f'/api/establecimientos/{self.origen.pk}/']:
            with self.subTest(url=url):
                self.assertEqual(self.client.delete(url).status_code, 400)

    def test_editar_y_eliminar_ingreso_no_rompe_traslado(self):
        ingreso_id = self.ingreso()
        self.movimiento(2000, 'TRASLADO')
        url = f'/api/movimientos/{ingreso_id}/'
        self.assertEqual(self.client.patch(url, {'cantidad': 1999}).status_code, 400)
        self.assertEqual(self.client.delete(url).status_code, 400)
        self.assertEqual(Movimiento.objects.get(pk=ingreso_id).cantidad, 5000)

    def test_editar_o_eliminar_traslado_no_rompe_pasos_posteriores(self):
        self.ingreso()
        traslado_id = self.movimiento(2000, 'TRASLADO').data['id']
        self.movimiento(1500, 'TRASLADO', origen=self.destino.pk, destino=self.origen.pk)
        url = f'/api/movimientos/{traslado_id}/'
        self.assertEqual(self.client.patch(url, {'cantidad': 1499}).status_code, 400)
        self.assertEqual(self.client.delete(url).status_code, 400)
        self.assertEqual(Movimiento.objects.count(), 3)

    def test_cambiar_lote_de_ingreso_valida_lote_anterior(self):
        ingreso_id = self.ingreso()
        self.movimiento(2000, 'TRASLADO')
        otro = Lote.objects.create(medicamento=self.medicamento, numero_lote='OTRO',
            fecha_fabricacion=self.lote.fecha_fabricacion, fecha_vencimiento=self.lote.fecha_vencimiento, cantidad_inicial=5000)
        response = self.client.patch(f'/api/movimientos/{ingreso_id}/', {'lote': otro.pk})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(otro.movimientos.count(), 0)

    def test_crud_movimiento_valido_conserva_fecha(self):
        ingreso_id = self.ingreso()
        response = self.movimiento(2000, 'TRASLADO')
        url = f"/api/movimientos/{response.data['id']}/"
        fecha = response.data['fecha_movimiento']
        self.assertEqual(self.client.patch(url, {'cantidad': 1000}).status_code, 200)
        self.assertEqual(self.client.get(url).data['fecha_movimiento'], fecha)
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertEqual(self.client.delete(f'/api/movimientos/{ingreso_id}/').status_code, 204)
        self.assertEqual(saldos_positivos(self.lote), [])

    def test_put_y_delete_en_todos_los_catalogos(self):
        casos = [('medicamentos', self.medicamento.pk, medicamento_datos()),
                 ('establecimientos', self.destino.pk, dict(nombre='Hospital demo', tipo='HOSPITAL', departamento='Quetzaltenango', municipio='Quetzaltenango')),
                 ('lotes', self.lote.pk, dict(medicamento=self.medicamento.pk, numero_lote='AMX-260923', fecha_fabricacion=str(self.lote.fecha_fabricacion), fecha_vencimiento=str(self.lote.fecha_vencimiento), cantidad_inicial=5000))]
        alerta = self.client.post('/api/alertas/', dict(lote=self.lote.pk, tipo='BLOQUEO', motivo='Demo')).data
        casos.append(('alertas', alerta['id'], dict(lote=self.lote.pk, tipo='RETIRO', motivo='Demo actualizada', activa=False)))
        for recurso, pk, datos in casos:
            with self.subTest(recurso=recurso):
                url = f'/api/{recurso}/{pk}/'
                self.assertEqual(self.client.put(url, datos, format='json').status_code, 200)
                self.assertEqual(self.client.get(url).status_code, 200)
        for recurso, pk in [('alertas', alerta['id']), ('lotes', self.lote.pk), ('medicamentos', self.medicamento.pk), ('establecimientos', self.destino.pk)]:
            self.assertEqual(self.client.delete(f'/api/{recurso}/{pk}/').status_code, 204)

    def test_cors_preflight_crud_y_origen_externo(self):
        for metodo in ['POST', 'PUT', 'PATCH', 'DELETE']:
            response = self.client.options('/api/movimientos/', HTTP_ORIGIN='http://localhost:5100',
                HTTP_ACCESS_CONTROL_REQUEST_METHOD=metodo, HTTP_ACCESS_CONTROL_REQUEST_HEADERS='content-type')
            self.assertEqual(response['Access-Control-Allow-Origin'], 'http://localhost:5100')
            self.assertIn(metodo, response['Access-Control-Allow-Methods'])
        response = self.client.options('/api/lotes/', HTTP_ORIGIN='https://example.com', HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST')
        self.assertNotIn('Access-Control-Allow-Origin', response)

    def test_modelos_registrados_admin_y_borrado_masivo_deshabilitado(self):
        for model in [Medicamento, Establecimiento, Lote, Movimiento, Alerta]:
            self.assertTrue(admin.site.is_registered(model))
        self.assertIsNone(admin.site._registry[Movimiento].actions)
        self.assertEqual(self.client.get('/admin/').status_code, 302)

    def test_admin_rechaza_correccion_y_borrado_que_rompen_historial(self):
        from django.contrib.auth.models import User
        from django.test import Client
        usuario = User.objects.create_superuser(username='admin-prueba', password='solo-para-tests')
        cliente = Client()
        cliente.force_login(usuario)
        ingreso_id = self.ingreso()
        self.movimiento(2000, 'TRASLADO')
        response = cliente.post(f'/admin/core/movimiento/{ingreso_id}/delete/', {'post': 'yes'})
        self.assertEqual(response.status_code, 302)
        self.assertTrue(Movimiento.objects.filter(pk=ingreso_id).exists())
        response = cliente.post(f'/admin/core/lote/{self.lote.pk}/change/', dict(
            medicamento=self.medicamento.pk, numero_lote=self.lote.numero_lote,
            fecha_fabricacion=str(self.lote.fecha_fabricacion),
            fecha_vencimiento=str(self.lote.fecha_vencimiento), cantidad_inicial=1000))
        self.assertEqual(response.status_code, 200)
        self.lote.refresh_from_db()
        self.assertEqual(self.lote.cantidad_inicial, 5000)

    def test_put_movimiento_valido(self):
        ingreso_id = self.ingreso()
        response = self.client.put(f'/api/movimientos/{ingreso_id}/', dict(
            lote=self.lote.pk, destino=self.destino.pk, cantidad=4000, tipo_movimiento='INGRESO'), format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(saldo_en_establecimiento(self.lote, self.destino), 4000)
        self.assertEqual(saldo_en_establecimiento(self.lote, self.origen), 0)

    def test_orm_valida_ingreso_excesivo(self):
        with self.assertRaises(ValidationError):
            Movimiento.objects.create(lote=self.lote, destino=self.origen, cantidad=5001, tipo_movimiento='INGRESO')
        self.assertEqual(Movimiento.objects.count(), 0)


class ConcurrenciaTests(TransactionTestCase):
    def setUp(self):
        self.medicamento, self.origen, self.destino, self.lote = preparar_dominio()

    def solicitudes_simultaneas(self, datos):
        barrera = Barrier(2)
        def enviar():
            close_old_connections()
            try:
                barrera.wait(timeout=10)
                return APIClient().post('/api/movimientos/', datos, format='json').status_code
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as pool:
            futuros = [pool.submit(enviar) for _ in range(2)]
            resultados = sorted(f.result(timeout=20) for f in futuros)
        # SQLite en memoria puede rechazar el segundo escritor con 409;
        # en disco espera el bloqueo y revalida, devolviendo 400.
        self.assertIn(resultados, [[201, 400], [201, 409]])

    def test_dos_traslados_no_gastan_el_mismo_saldo(self):
        Movimiento.objects.create(lote=self.lote, destino=self.origen, cantidad=5000, tipo_movimiento='INGRESO')
        self.solicitudes_simultaneas(dict(lote=self.lote.pk, origen=self.origen.pk,
            destino=self.destino.pk, cantidad=4000, tipo_movimiento='TRASLADO'))
        self.assertEqual(saldo_en_establecimiento(self.lote, self.origen), 1000)
        self.assertEqual(Movimiento.objects.filter(tipo_movimiento='TRASLADO').count(), 1)

    def test_dos_ingresos_no_superan_el_tope(self):
        self.solicitudes_simultaneas(dict(lote=self.lote.pk, destino=self.origen.pk,
            cantidad=4000, tipo_movimiento='INGRESO'))
        self.assertEqual(saldo_en_establecimiento(self.lote, self.origen), 4000)
        self.assertEqual(Movimiento.objects.count(), 1)
