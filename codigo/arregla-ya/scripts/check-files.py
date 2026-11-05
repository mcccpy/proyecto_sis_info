"""Inspección estructural del ZIP, no reemplaza compilar ni probar la API."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
required=['README.md','docker-compose.yml','frontend/angular.json','frontend/package.json','frontend/src/main.ts','frontend/src/styles.css','backend/package.json','backend/src/main.ts','backend/src/app.module.ts','backend/src/entities.ts','backend/src/auth/auth.ts','backend/src/solicitudes/solicitudes.ts','backend/src/propuestas/propuestas.ts','backend/.env.example','preview/index.html']
for fn in required:assert (root/fn).is_file(),f'Archivo faltante: {fn}'
for fn in ['frontend/angular.json','frontend/package.json','frontend/tsconfig.json','frontend/tsconfig.app.json','backend/package.json','backend/tsconfig.json','backend/tsconfig.build.json']:
 json.loads((root/fn).read_text(encoding='utf-8'))
print(f'OK estructura: {len(required)} archivos clave; JSON válido. No se ejecutaron dependencias npm ni PostgreSQL.')
