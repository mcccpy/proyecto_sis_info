# Alternativa sin Docker (PostgreSQL + pgAdmin)

1. Instalar PostgreSQL y pgAdmin desde sus páginas oficiales.
2. Iniciar sesión como administrador `postgres` en pgAdmin.
3. Abrir Query Tool y ejecutar (cambia la contraseña si usarás otros valores):

```sql
CREATE ROLE arreglaya LOGIN PASSWORD 'arreglaya_local';
CREATE DATABASE arreglaya OWNER arreglaya;
```

4. Si usas un puerto distinto de 5432, cambiar `DB_PORT` en `backend/.env`.
5. En `backend/.env` configurar `DB_USER`, `DB_PASSWORD` y `DB_NAME` según la instalación.
6. Levantar NestJS: el prototipo usa `synchronize: true` **solo para desarrollo**. Mateo debe convertir el esquema inicial en migraciones TypeORM antes de publicar.

**No ejecuten `CREATE ROLE` o `CREATE DATABASE` varias veces si ya existen. No publiquen contraseñas reales ni permitan acceso remoto a 5432 sin un plan de seguridad.**
