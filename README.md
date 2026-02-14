# WrenchBuddy Frontend (React)

Frontend en React + Vite + TypeScript para conectarse a la API de **WrenchBuddy** (Django REST Framework).

## Requisitos

- Node.js 18+
- Backend Django levantado (por defecto en `http://localhost:8000`)

## Ejecutar

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

### Configurar la URL del backend

Por defecto el frontend usa rutas relativas (`/api/...`) y Vite hace **proxy** a `http://localhost:8000`.

Si necesitas apuntar a otro backend:

1. Crea un fichero `.env` en la raíz del frontend:

```bash
VITE_API_BASE_URL=http://mi-backend:8000
```

2. Reinicia `npm run dev`.

## Login por sesión (IMPORTANTE)

Tu backend usa `SessionAuthentication` y `IsAuthenticated`. Para que el frontend pueda hacer login/logout sin depender del panel admin, lo más sencillo es habilitar las rutas de DRF para sesión.

En `wrench_buddy/urls.py` añade:

```python
from django.urls import path, include

urlpatterns = [
    ...
    path('api-auth/', include('rest_framework.urls')),
]
```

Con esto tendrás:

- `POST /api-auth/login/`
- `POST /api-auth/logout/`

> Nota: estas vistas son HTML por defecto, pero DRF maneja sesión/cookies.

### CORS (si sirves frontend y backend en dominios distintos)

En desarrollo, el proxy de Vite suele evitar CORS.
En producción, si el frontend está en otro dominio, instala y configura `django-cors-headers`.

## Qué incluye

- Registro de usuario (POST `/api/users/`)
- Login/logout por sesión (DRF: `/api-auth/login/`)
- CRUD de vehículos (GET/POST `/api/vehicles/`)
- Vista de detalle con:
  - Historial de eventos (GET/POST `/api/maintenance/events/?vehicle=...`)
  - Tareas (GET `/api/maintenance/tasks/?vehicle=...`)
  - Completar/descartar tareas (`POST /api/maintenance/tasks/{id}/complete/` y `/dismiss/`)
- Catálogo (GET `/api/maintenance/catalog/?vehicle_type=...`)

## Notas técnicas

- Las requests usan `credentials: 'include'` para enviar cookies de sesión.
- Se añade `X-CSRFToken` automáticamente para métodos no seguros (POST/PATCH/DELETE) leyendo la cookie `csrftoken`.



## Dev sin proxy (frontend en :5173 llamando a backend en :8000)

Si vas a llamar al backend **directamente** (por ejemplo `http://localhost:8000`) necesitas:

1) Definir la URL del backend en el frontend:

```bash
# .env
VITE_API_BASE_URL=http://localhost:8000
```

2) Backend (Django) permitir el origin de Vite y habilitar CSRF para SPA:

En `settings.py`:

```python
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Si usas django-cors-headers:
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
CORS_ALLOW_CREDENTIALS = True
```

3) Exponer un endpoint que fuerce la cookie CSRF (GET `/api/csrf/`):

```python
# core/views.py
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie

@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({"detail": "CSRF cookie set"})
```

```python
# urls.py
from django.urls import path, include
from core.views import csrf

urlpatterns = [
    path("api/csrf/", csrf),
    path("api-auth/", include("rest_framework.urls")),
]
```

> Nota: Con cookies de sesión, el navegador debe aceptar cookies entre puertos. En `localhost` suele funcionar bien.
