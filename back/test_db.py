import psycopg2

try:
    conn = psycopg2.connect(
        dbname="postgres",
        user="postgres",
        password="primer_project123",
        host="db.nijunjaerhiskjcaieii.supabase.co",
        port="5432",
        sslmode="require"
    )
    print("Conexión exitosa")
    conn.close()
except Exception as e:
    print("Error:", e)
