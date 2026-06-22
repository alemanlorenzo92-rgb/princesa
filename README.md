# EstudioAI

Aplicacion web mobile-first para estudiantes que organiza materias, archivos y estudio con IA, usando Supabase, OpenAI API y Mercado Pago, lista para salir como app full-stack en Railway.

## Descripcion corta

EstudioAI centraliza autenticacion, gestion academica, archivos PDF reales, materiales de estudio generados con IA y planes pagos, con una base lista para deploy en Railway y uso desde celular como PWA.

## Funcionalidades actuales

- Registro, login y logout con Supabase Auth
- Dashboard con resumen semanal y accesos rapidos
- CRUD de materias
- CRUD de eventos academicos
- Subida de PDFs reales a Supabase Storage privado
- Creacion de apuntes manuales en texto
- Extraccion real de texto desde PDFs con `unpdf`
- Generador de materiales con OpenAI API desde backend
- Biblioteca de materiales generados
- Exportacion de materiales a PDF con `jspdf`
- Chat IA general
- Chat IA asociado a materias
- Chat IA con PDFs usando `extracted_text`
- Prueba gratuita unica con limite de tokens
- Planes pagos `student` y `pro`
- Integracion de Mercado Pago para pagos mensuales manuales
- Webhook que activa planes server-side
- PWA instalable
- Proyecto preparado para deploy en Railway

## Stack tecnico

- Next.js App Router
- React 19
- Tailwind CSS v4
- Supabase Auth
- Supabase Database
- Supabase Storage
- OpenAI API
- Mercado Pago Checkout Pro
- `unpdf`
- `jspdf`

## Arquitectura general

- El frontend corre en Next.js con App Router y enfoque mobile-first.
- La autenticacion, base de datos relacional y storage viven en Supabase.
- Los endpoints sensibles de IA, extraccion y billing corren server-side dentro de Next.js.
- OpenAI API se usa solo desde backend mediante [src/lib/server/openai.ts](/C:/Renderbyte/proyecto%20princesa/src/lib/server/openai.ts:1).
- Mercado Pago crea checkouts desde backend y activa planes solo cuando llega un pago aprobado al webhook.
- Los PDFs se guardan en el bucket privado `study-files` y se abren con signed URLs temporales.
- El service worker existe para instalacion PWA, pero no cachea `/api/*`, `/_next/*` ni respuestas sensibles.
- La build usa `output: "standalone"` en Next.js para compatibilidad con deploy full-stack en Railway.

## Variables de entorno

Crear `.env.local` a partir de [.env.example](/C:/Renderbyte/proyecto%20princesa/.env.example:1).
En Railway, estas variables se cargan desde `Project / Service -> Variables`.

### Variables publicas

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave publica para cliente y SSR auth |
| `NEXT_PUBLIC_APP_URL` | URL base de la app para redirects, callbacks y webhook |

### Variables privadas

| Variable | Uso |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor, necesaria para webhook y chequeos administrativos |
| `OPENAI_API_KEY` | Solo servidor, habilita OpenAI API real |
| `OPENAI_MODEL` | Modelo de OpenAI, por defecto `gpt-4.1-mini` |
| `MERCADOPAGO_ACCESS_TOKEN` | Solo servidor, credencial privada de Mercado Pago |
| `MERCADOPAGO_STUDENT_PRICE` | Precio mensual del plan `student` |
| `MERCADOPAGO_PRO_PRICE` | Precio mensual del plan `pro` |
| `MERCADOPAGO_WEBHOOK_SECRET` | Opcional, valida la firma del webhook |

Notas importantes:

- Las variables privadas nunca deben llevar prefijo `NEXT_PUBLIC_`.
- `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `MERCADOPAGO_ACCESS_TOKEN` no deben exponerse en frontend.
- `NEXT_PUBLIC_APP_URL` debe apuntar a la URL publica de Railway, por ejemplo `https://tu-app.up.railway.app`, o a tu dominio propio.
- Si cambia la URL publica, tambien hay que actualizar Supabase Auth y Mercado Pago.
- Las variables privadas van en `.env.local` y en Railway Variables.

## Configuracion de Supabase

1. Crear un proyecto en Supabase.
2. Copiar `Project URL` y `anon key` a `.env.local`.
3. Ejecutar [supabase/schema.sql](/C:/Renderbyte/proyecto%20princesa/supabase/schema.sql:1) desde el SQL Editor.
4. Confirmar que el schema cree las tablas y policies esperadas.

Tablas principales:

- `profiles`
- `subscriptions`
- `ai_trials`
- `ai_monthly_usage`
- `ai_usage_logs`
- `subjects`
- `academic_events`
- `study_files`
- `generated_materials`
- `ai_conversations`
- `ai_messages`
- `billing_events`

Aspectos clave:

- Todas las tablas relevantes usan Row Level Security por usuario.
- El trigger de alta sobre `auth.users` crea automaticamente `profile`, `subscription` inicial y `ai_trial`.
- El estado de planes, trial, consumo mensual y logs de IA vive en Supabase Database.

Auth para produccion:

- Configurar `Site URL` con la URL publica de Railway o con el dominio final.
- Agregar Redirect URLs para:
  - `https://tu-app.up.railway.app/`
  - `https://tu-app.up.railway.app/login`
  - `https://tu-app.up.railway.app/dashboard`
  - `https://tu-app.up.railway.app/billing/success`
  - `https://tu-app.up.railway.app/billing/failure`
  - `https://tu-app.up.railway.app/billing/pending`
- Si usas dominio propio, reemplazar esas URLs por `https://tudominio.com/...`.

## Configuracion de Supabase Storage

- Bucket requerido: `study-files`
- Tipo: privado
- Archivos permitidos: solo PDFs
- Limite actual: 10 MB por archivo
- Acceso: signed URLs temporales

Reglas recomendadas:

- No usar bucket publico para materiales de estudiantes.
- Mantener policies para que cada usuario solo vea sus propios archivos.
- Conservar la estructura por usuario y materia que usa la app.
- Las signed URLs deben seguir siendo temporales tambien en Railway.

## Configuracion de OpenAI API

- La app usa OpenAI API desde backend de Next.js.
- No usa una cuenta personal de ChatGPT.
- No depende de ChatGPT Plus.
- `OPENAI_API_KEY` se usa solo en servidor.
- El frontend nunca debe recibir la API key.
- La generacion de materiales y el chat validan limites por tokens antes de llamar a OpenAI.
- En produccion no debe existir fallback local si falta `OPENAI_API_KEY`.

## Configuracion de Mercado Pago

- El checkout se crea desde backend en `/api/billing/create-checkout`.
- El frontend solo inicia la compra; no activa planes.
- El webhook recibe eventos en `/api/billing/webhook`.
- La activacion del plan ocurre solo server-side cuando Mercado Pago confirma un pago aprobado.
- La integracion actual activa un mes por pago aprobado.
- La renovacion automatica recurrente todavia no esta implementada.
- Si cambias de URL temporal de Railway a dominio propio, actualiza `NEXT_PUBLIC_APP_URL`, Supabase Auth y Mercado Pago.

URLs importantes:

- Webhook: `${NEXT_PUBLIC_APP_URL}/api/billing/webhook`
- Success: `${NEXT_PUBLIC_APP_URL}/billing/success`
- Failure: `${NEXT_PUBLIC_APP_URL}/billing/failure`
- Pending: `${NEXT_PUBLIC_APP_URL}/billing/pending`

## Prueba gratuita unica y planes

- No existe plan gratis mensual renovable.
- Cada usuario nuevo recibe una prueba gratuita unica.
- La prueba gratuita tiene limite de tokens de entrada y salida.
- Cuando el trial se agota, el usuario pasa a `expired_trial`.
- Los planes pagos disponibles son `student` y `pro`.
- Los planes pagos usan limites mensuales de IA.
- El consumo real se registra en Supabase despues de cada generacion o respuesta de chat.

## Desarrollo local

Instalacion:

```bash
npm install
```

Desarrollo:

```bash
npm run dev
```

Verificaciones utiles:

```bash
npm run lint
npm run build
npm run start
```

Abrir `http://localhost:3000`.

Nota:

- `npm run start` sigue siendo util como referencia local tradicional de Next.js.
- Para Railway con `output: "standalone"`, el comando de arranque recomendado es `node .next/standalone/server.js`.

## Deploy en Railway

1. Subir el repositorio a GitHub.
2. Crear un proyecto en Railway.
3. Elegir `Deploy from GitHub repo`.
4. Seleccionar el repositorio.
5. Cargar las variables de entorno publicas y privadas en `Project / Service -> Variables`.
6. Verificar `Build Command`: `npm run build`.
7. Verificar `Start Command`: `node .next/standalone/server.js`.
8. Esperar el primer deploy.
9. Copiar la URL publica de Railway, por ejemplo `https://tu-app.up.railway.app`.
10. Configurar `NEXT_PUBLIC_APP_URL` con esa URL o con tu dominio propio.
11. Configurar `Site URL` y Redirect URLs en Supabase Auth.
12. Configurar el webhook y las `back_urls` de Mercado Pago.
13. Revisar logs de Railway si falla el arranque o el acceso a variables.
14. Ejecutar pruebas reales desde celular.
15. Instalar la PWA desde navegador mobile.

Comandos esperados:

- Build: `npm run build`
- Start en Railway: `node .next/standalone/server.js`
- Start alternativo local: `npm start`

URLs validas:

- URL temporal de Railway: `https://tu-app.up.railway.app`
- Dominio propio: `https://tudominio.com`

Si luego cambias la URL publica:

- actualiza `NEXT_PUBLIC_APP_URL`
- actualiza `Site URL` y Redirect URLs en Supabase Auth
- actualiza webhook de Mercado Pago
- actualiza `back_urls` de Mercado Pago

Checklist minimo de deploy:

- servicio de Railway creado
- variables cargadas
- URL publica de Railway confirmada
- dominio custom opcional configurado
- schema de Supabase aplicado
- bucket `study-files` creado y privado
- webhook de Mercado Pago activo
- redirects de Supabase Auth configurados
- build y start confirmados
- logs de Railway revisados
- login, subida PDF, extraccion, IA, chat y checkout probados

## Checklist de pruebas

- Registrar un usuario nuevo y confirmar creacion de `profile`, `subscription` y `ai_trial`
- Iniciar sesion y cerrar sesion correctamente
- Crear, editar y eliminar materias
- Crear, editar y eliminar eventos
- Subir un PDF real a `/files`
- Abrir el PDF con signed URL temporal
- Ejecutar `Extraer texto` y confirmar guardado en `study_files.extracted_text`
- Crear un apunte manual sin PDF
- Generar material en `/ai`
- Guardar el material y verificarlo en la biblioteca
- Exportar un material a PDF
- Crear un chat general
- Crear un chat ligado a una materia
- Chatear sobre un PDF con `extracted_text`
- Completar un pago sandbox de Mercado Pago
- Verificar activacion del plan por webhook
- Probar la instalacion PWA desde celular

## Limitaciones actuales

- No hay OCR para PDFs escaneados todavia.
- Mercado Pago activa un mes por pago aprobado, pero no existe suscripcion recurrente automatica todavia.
- No hay panel admin todavia.
- No hay notificaciones push todavia.
- Para PDFs largos, el contexto del chat puede truncarse segun el plan.
- Railway puede asignar una URL temporal distinta si cambias el entorno o dominio; al hacerlo, hay que resincronizar callbacks externos.

## Proximas mejoras

- OCR para PDFs escaneados
- Suscripciones recurrentes reales con Mercado Pago
- Panel administrativo
- Notificaciones push
- Mejoras de recuperacion de contexto para documentos largos
- Estadisticas de uso y aprendizaje
