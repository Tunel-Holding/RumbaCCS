<!-- Para el correcto funcionamiento de la app, deben iniciar en terminales distintas
el servidor de django y el npx expo start -->

Para activar el entorno virtual en la carpeta back (Debes tenerlo creado):

./venv/Scripts/Activate.ps1

<!-- Para iniciar el servidor de django, si están usando un telefono para correr la app
usar este comando. -->
python manage.py runserver 0.0.0.0:8000 

<!-- Para iniciar el servidor del front -->
npx expo start 

<!-- Para instalar las versiones del back -->
pip install -r requirements.txt