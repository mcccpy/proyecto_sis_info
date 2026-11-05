# Contrato REST inicial

Todas las rutas están bajo `/api` y el backend corre en http://localhost:3000.

| Método | Ruta | Permisos | Uso |
|---|---|---|---|
| GET | `/health` | Pública | Verificar servidor |
| GET | `/catalogo/categorias` | Pública | Consultar categorías |
| POST | `/auth/registro` | Pública | Crear cliente/empresa/técnico |
| POST | `/auth/login` | Pública | Obtener JWT |
| GET | `/auth/perfil` | Token | Usuario actual |
| GET | `/trabajadores?categoria=1&zona=Centro` | Pública | Solo técnicos aprobados |
| GET / PATCH | `/trabajadores/mi-perfil` | TRABAJADOR | Consultar/actualizar perfil |
| GET | `/trabajadores/pendientes` | ADMIN | Pendientes |
| PATCH | `/trabajadores/:id/aprobar` | ADMIN | Aprobar técnico |
| POST | `/solicitudes` | CLIENTE/EMPRESA | Crear trabajo |
| GET | `/solicitudes/mias` | CLIENTE/EMPRESA | Mis solicitudes y sus direcciones |
| GET | `/solicitudes/disponibles` | TRABAJADOR aprobado | Sin direcciones exactas |
| POST | `/propuestas/solicitud/:id` | TRABAJADOR aprobado | Cotizar |
| GET | `/propuestas/solicitud/:id` | Dueño CLIENTE/EMPRESA | Ver propuestas |
| PATCH | `/propuestas/:id/aceptar` | Dueño CLIENTE/EMPRESA | Aceptar oferta |
| GET | `/propuestas/mias` | TRABAJADOR | Mis ofertas |

## JSON de ejemplo

POST `/api/auth/registro`:
```json
{"nombre":"Cliente de Prueba","email":"cliente@example.test","password":"ClaveSegura123!","rol":"CLIENTE"}
```

POST `/api/solicitudes`:
```json
{"titulo":"Reparar fuga del lavaplatos","descripcion":"El lavaplatos pierde agua debajo del mueble y necesito una revisión.","direccion":"Calle ficticia 123","zona":"Centro","disponibilidad":"Sábado en la mañana","categoriaId":1,"fotoUrl":""}
```

POST `/api/propuestas/solicitud/1`:
```json
{"precio":180.00,"costoVisita":20,"materialesIncluidos":false,"detalleMateriales":"Materiales cotizados aparte"}
```

**Nota:** el frontend guarda el token temporalmente en `localStorage` para la demo. No es estrategia de autenticación final de producción.
