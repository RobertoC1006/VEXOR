# Certificado público de Supabase

`prod-ca-2021.crt` se descargó el 20 de octubre de 2026 desde el enlace **Download certificate** de Database / Settings en el Dashboard de Supabase.

Fuente oficial: https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

Se usa como `sslrootcert` con `sslmode=verify-full` para verificar la conexión PostgreSQL al pooler de sesión. Es un certificado público de autoridad raíz, sin clave privada. Las credenciales SQL se guardan aparte y no se versionan.
