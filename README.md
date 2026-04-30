Para el correcto funcionamiento de la app, deben iniciar en terminales distintas
el servidor de django y el npx expo start

NOTA:
Se tiene que cambiar la dirección ip en front/src/services/api.js

Para crear el entorno virtual: python -m venv venv

Para activar el entorno virtual en la carpeta back (Debes tenerlo creado):
./venv/Scripts/Activate.ps1

Para iniciar el servidor de django, si están usando un telefono para correr la app
usar este comando:
python manage.py runserver 0.0.0.0:8000

Para iniciar el servidor del front:
npx expo start 

Para instalar las versiones del back:
pip install -r requirements.txt


---

Registro de redes sociales (normalización automática)

- El backend acepta redes sociales en dos formatos cuando se crea una empresa:
	1) Lista de strings con URLs o dominios parcial: ["instagram.com/mi", "https://facebook.com/mi"]
	2) Lista de objetos con tipo y url: [{"tipo":"instagram","url":"instagram.com/mi"}, {"tipo":"facebook","url":"https://facebook.com/mi"}]

- Normalización automática: si el valor no contiene esquema (http:// o https://), el backend antepone "https://". Ejemplo: "instagram.com/mi" -> "https://instagram.com/mi".

- Tipos válidos: 'instagram', 'facebook', 'tiktok', 'x', 'youtube', 'whatsapp'. Si envías solo la URL (string), se asigna por defecto el tipo 'instagram'.

Ejemplo de payload para creación final (validación de pin):

{
	"email": "contacto@miempresa.com",
	"password": "MiPass123!",
	"pin": "123456",
	"empresa": {
		"nombre": "Mi Empresa",
		"rif": "J-12345678-9",
		"descripcion": "Una empresa",
		"lugar": "Caracas",
		"telefono": "+584XXXXXXXXX",
		"email_contacto": "contacto@miempresa.com",
		"logo": "https://example.com/logo.png",
		"redes_sociales": [
			{"tipo": "instagram", "url": "instagram.com/miempresa"},
			"facebook.com/miempresa"
		]
	}
}

La respuesta incluirá la empresa creada y las redes normalizadas, por ejemplo:

"empresa": { "id": 12, "nombre": "Mi Empresa", "redes_sociales": [{"tipo":"instagram","url":"https://instagram.com/miempresa"}, {"tipo":"instagram","url":"https://facebook.com/miempresa"}], ... }

Si prefieres que URLs inválidas provoquen un error en vez de ser ignoradas, avísame y lo cambio para que el endpoint devuelva 400 con detalles.

-----------------------------------------------------------------------------------------------------------------

🚀 Guía para ejecutar tareas en segundo plano (Celery + Redis)

Esta guía explica cuándo y cómo activar Celery y Redis para que las notificaciones automáticas funcionen correctamente en el proyecto.

---

🧠 ¿Cuándo necesitas activar Celery?

Celery debe estar activo cuando quieras que se ejecuten tareas en segundo plano como:

- Notificar a usuarios cuando falten 10, 5, 3 o 1 días para un evento guardado
- Notificar a usuarios cuando su evento guardado ocurra mañana
- Ejecutar cualquier tarea programada con celery-beat

---

🧱 Servicios necesarios

Servicio        | ¿Para qué sirve?                         | ¿Cómo se activa?
--------------- | ----------------------------------------- | ------------------
Redis           | Cola de mensajes para Celery             | Se activa con Docker
Celery Worker   | Ejecuta tareas en segundo plano          | Se activa con comando en terminal
Celery Beat     | Programa tareas recurrentes              | Se activa con comando en terminal

---

🐳 Paso 1: Activar Redis con Docker

Requisitos:
- Tener Docker Desktop instalado y corriendo

Comando para iniciar Redis:

    docker run -d --name redis-server -p 6379:6379 redis

Verifica que Redis está corriendo:

    docker ps

---

⚙️ Paso 2: Activar Celery Worker

Desde la raíz del proyecto (donde está manage.py):

    celery -A Backend worker --loglevel=info --pool=solo

⚠️ Usa --pool=solo en Windows para evitar errores de permisos

---

🕒 Paso 3: Activar Celery Beat (solo si usas tareas programadas)

    celery -A Backend beat --loglevel=info

Esto activa el reloj que dispara tareas como:

- notificar_eventos_guardados_por_dias
- notificar_eventos_proximos

---

🧪 Paso 4: Verificar que todo está funcionando

- Revisa que los workers estén activos en la terminal
- Revisa que las tareas aparezcan en el admin de Django → Periodic Tasks
- Revisa que se estén creando notificaciones en la tabla NotificacionUsuario

---

👥 ¿Qué debe hacer cada miembro del equipo?

Rol        | Acción recomendada
---------- | ---------------------
Backend    | Activar Redis + Celery Worker + Beat si trabaja con tareas
Frontend   | No necesita activar nada, solo consumir los endpoints
QA / Testing | Puede activar Redis + Celery para pruebas completas
Producción | Usar supervisores (systemd, Docker Compose, etc.) para mantener Celery activo

---

🧼 Limpieza opcional

Para detener Redis:

    docker stop redis-server

Para eliminar el contenedor:

    docker rm redis-server
-----------------------------------------------------------------------------------------------------------------


Version web:

npx expo start --web

Forzar puerto distinto: --port 8082