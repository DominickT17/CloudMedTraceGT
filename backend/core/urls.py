from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('medicamentos', views.MedicamentoViewSet)
router.register('establecimientos', views.EstablecimientoViewSet)
router.register('lotes', views.LoteViewSet)
router.register('movimientos', views.MovimientoViewSet)
router.register('alertas', views.AlertaViewSet)

urlpatterns = [
    path('status/', views.status, name='api-status'),
    path('trazabilidad/<path:numero_lote>/', views.trazabilidad, name='trazabilidad'),
    path('verificar/<path:numero_lote>/', views.verificar, name='verificar'),
    path('', include(router.urls)),
]
