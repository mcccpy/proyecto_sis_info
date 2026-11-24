# Pruebas del backend

## Unitarias

Ejecuta `npm test`. Usa `node:test` y repositorios simulados; no se conecta a PostgreSQL. Cubre reglas de cuentas y roles, categorias, trabajos, propuestas, zonas, visitas, presupuestos, servicios, pagos, calificaciones y reclamos.

## Integracion HTTP + PostgreSQL

Ejecuta solo contra la base descartable/de pruebas:

```powershell
$env:RUN_DB_INTEGRATION = "1"
npm run test:integration
Remove-Item Env:RUN_DB_INTEGRATION
```

La suite compila y levanta Nest en un puerto local. Comprueba CRUD y unicidad de categorias, JWT, altas, moderacion, asignacion de categorias, busqueda por cobertura, postulaciones, republicacion disparada por SQL, visitas, bitacora, presupuestos, pagos, calificaciones, reclamos, cancelaciones, autorizacion y limpieza. Los datos agregados tienen sufijo aleatorio; la suite no trunca tablas ni modifica los 100 registros generados por el script.

Requiere `DATABASE_URL` con el esquema y triggers instalados, al menos una cuenta administradora y permisos para insertar y limpiar los datos temporales. Configura `JWT_SECRET` en `.env` con minimo 32 bytes aleatorios. Para generarlo: `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`.

## Archivos de prueba

Las solicitudes de ejemplo usan URLs `test://`; no cargan archivos binarios. La integracion con almacenamiento real depende de definir proveedor, credenciales y politica de retencion.

El script de carga contiene `TRUNCATE ... RESTART IDENTITY CASCADE`: usalo unicamente en una base descartable. No es parte de `npm test` ni de `npm run test:integration`.

Consulta [HISTORIAS_TESTING.md](./HISTORIAS_TESTING.md) para la matriz de cobertura.
