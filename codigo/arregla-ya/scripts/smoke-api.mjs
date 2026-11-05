// Ejecutar tras arrancar PostgreSQL y NestJS: node scripts/smoke-api.mjs
// Crea cuentas de PRUEBA; no usar con una base de datos real de producción.
const base=process.env.API_URL || 'http://localhost:3000/api';
const stamp=Date.now();
async function call(method,path,body,token,expected=[200,201]){
 const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const text=await r.text();let json;try{json=JSON.parse(text)}catch{json={raw:text}};
 if(!expected.includes(r.status))throw new Error(`${method} ${path}: HTTP ${r.status} ${JSON.stringify(json)}`);
 return json;
}
try{
 console.log('Health:',await call('GET','/health'));
 const categories=await call('GET','/catalogo/categorias');
 if(!categories.length)throw new Error('Faltan categorías');
 const password='PruebaSegura2026!';
 const client=await call('POST','/auth/registro',{nombre:'Cliente automático',email:`cliente${stamp}@example.test`,password,rol:'CLIENTE'});
 const worker=await call('POST','/auth/registro',{nombre:'Técnico automático',email:`tecnico${stamp}@example.test`,password,rol:'TRABAJADOR'});
 console.log('Registro:',client.usuario.rol,worker.usuario.rol);
 await call('PATCH','/trabajadores/mi-perfil',{experiencia:'Cinco años realizando reparaciones y mantenimientos',zona:'Centro',disponibilidad:'Lunes a viernes',categoriaId:categories[0].id},worker.token);
 await call('GET','/solicitudes/disponibles',undefined,worker.token,[403]);console.log('Técnico NO aprobado correctamente bloqueado');
 const job=await call('POST','/solicitudes',{titulo:'Prueba de tubería',descripcion:'Necesito arreglar una fuga en la cocina, trabajo de prueba.',direccion:'Calle ficticia de pruebas 1',zona:'Centro',disponibilidad:'Sábado por la mañana',categoriaId:categories[0].id},client.token);
 console.log('Solicitud:',job.id);
 const adminEmail=process.env.ADMIN_EMAIL,adminPass=process.env.ADMIN_PASSWORD;
 if(adminEmail&&adminPass){const admin=await call('POST','/auth/login',{email:adminEmail,password:adminPass});await call('PATCH',`/trabajadores/${worker.usuario.id}/aprobar`,{},admin.token);const jobs=await call('GET','/solicitudes/disponibles',undefined,worker.token);if(jobs.some(j=>'direccion' in j))throw new Error('FUGA: la dirección privada apareció en el listado para técnicos');
 const proposal=await call('POST',`/propuestas/solicitud/${job.id}`,{precio:180,costoVisita:20,materialesIncluidos:false,detalleMateriales:'Materiales por separado'},worker.token);
 await call('PATCH',`/propuestas/${proposal.id}/aceptar`,{},client.token);console.log('Flujo de propuesta ACEPTADA OK');
 }else console.log('No se probaron aprobación/propuesta: configurar ADMIN_EMAIL y ADMIN_PASSWORD para este comando.');
 console.log('PRUEBAS SMOKE TERMINADAS');
}catch(e){console.error('PRUEBA FALLÓ:',e.message);process.exitCode=1;}
