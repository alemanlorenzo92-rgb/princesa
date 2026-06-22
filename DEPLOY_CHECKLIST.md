# Deploy Checklist

## Antes del deploy

- [ ] Aplicar [supabase/schema.sql](/C:/Renderbyte/proyecto%20princesa/supabase/schema.sql:1) en el proyecto real de Supabase.
- [ ] Crear el servicio en Railway y conectar el repositorio correcto.
- [ ] Confirmar que existe el bucket privado `study-files`.
- [ ] Verificar que el bucket siga privado, acepte solo PDFs y mantenga limite inicial de 10 MB.
- [ ] Confirmar policies activas para `storage.objects` y tablas con RLS por usuario.
- [ ] Cargar en Railway todas las variables publicas y privadas requeridas en `Project / Service -> Variables`.
- [ ] Revisar que ninguna clave privada use prefijo `NEXT_PUBLIC_`.
- [ ] Confirmar la URL publica de Railway, por ejemplo `https://tu-app.up.railway.app`.
- [ ] Configurar dominio custom si aplica.

## Supabase Auth

- [ ] Configurar `Site URL` con la URL publica de Railway o con el dominio final.
- [ ] Agregar Redirect URLs:
  - [ ] `https://tu-app.up.railway.app/`
  - [ ] `https://tu-app.up.railway.app/login`
  - [ ] `https://tu-app.up.railway.app/dashboard`
  - [ ] `https://tu-app.up.railway.app/billing/success`
  - [ ] `https://tu-app.up.railway.app/billing/failure`
  - [ ] `https://tu-app.up.railway.app/billing/pending`
- [ ] Probar registro, login, logout y restauracion de sesion en produccion.
- [ ] Si usas dominio propio, reemplazar las Redirect URLs por el dominio final.

## Mercado Pago

- [ ] Configurar `NEXT_PUBLIC_APP_URL` con la URL publica de Railway o con el dominio final.
- [ ] Confirmar que el checkout use `back_urls` a `/billing/success`, `/billing/failure` y `/billing/pending`.
- [ ] Configurar webhook a `https://tu-app.up.railway.app/api/billing/webhook`.
- [ ] Usar credenciales sandbox para pruebas y credenciales productivas solo al salir a produccion real.
- [ ] Verificar activacion server-side del plan despues de un pago aprobado.
- [ ] Revisar que `billing_events` registre el webhook y el `payment_id`.
- [ ] Si cambia la URL publica, actualizar `NEXT_PUBLIC_APP_URL`, webhook y `back_urls`.

## IA y archivos

- [ ] Confirmar que `OPENAI_API_KEY` y `OPENAI_MODEL` esten cargadas en Railway.
- [ ] Confirmar que no existe fallback local de OpenAI en produccion.
- [ ] Probar generacion de materiales desde `/ai`.
- [ ] Probar chat IA general y chat con PDF.
- [ ] Subir un PDF real a `/files`.
- [ ] Ejecutar extraccion de texto y validar que se guarde en `study_files.extracted_text`.
- [ ] Abrir el PDF con signed URL en produccion.

## PWA y validacion final

- [ ] Ejecutar `npm run lint`.
- [ ] Ejecutar `npm run build`.
- [ ] Ejecutar `npm run start` como smoke test local de produccion.
- [ ] Confirmar que Railway usa `node .next/standalone/server.js` como start command.
- [ ] Confirmar que Railway completa `build` y arranque standalone sin errores.
- [ ] Revisar logs del servicio en Railway.
- [ ] Probar la app desde un celular real.
- [ ] Verificar instalacion PWA desde navegador mobile.
- [ ] Confirmar que el service worker no cachea `/api/*` ni respuestas sensibles.
- [ ] Confirmar que dashboard, login, archivos, IA, chat y checkout funcionan en mobile.
