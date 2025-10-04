Para el correcto funcionamiento de la app, deben iniciar en terminales distintas
el servidor de django y el npx expo start

NOTA:
Se tiene que cambiar la dirección ip en los archivos screens para el funcionanmiento de la app
(proximamente se creará la fx para automatizar el proceso)

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
