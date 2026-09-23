"""Configuración exclusiva para el prototipo local, sin autenticación."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
# Valor público de desarrollo. No utilizar esta configuración en producción.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "django-insecure-cloudmed-local-development-only")
DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"]

INSTALLED_APPS = ["corsheaders", "rest_framework", "core"]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "cloudmed_api.urls"
WSGI_APPLICATION = "cloudmed_api.wsgi.application"
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}
LANGUAGE_CODE = "es-gt"
TIME_ZONE = "America/Guatemala"
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Orígenes exactos del frontend local; no se permiten comodines ni credenciales.
CORS_ALLOWED_ORIGINS = ["http://localhost:5100", "http://127.0.0.1:5100"]
CORS_URLS_REGEX = r"^/api/"
CORS_ALLOW_METHODS = ["GET", "OPTIONS"]
CORS_ALLOW_CREDENTIALS = False

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "UNAUTHENTICATED_USER": None,
}
