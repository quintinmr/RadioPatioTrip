# RadioPatio Trip 🏴󠁧󠁢󠁳󠁣󠁴󠁿

App privada para organizar y vivir viajes en grupo (la primera parada: **Edimburgo**).
Funciona como **PWA instalable** en cualquier móvil (Android e iPhone) y como **APK nativo de Android** (Capacitor).
Backend en **Supabase** con datos personales tratados conforme al **RGPD**.

## Qué hace

| Pestaña | Funciones |
|---|---|
| **Plan** | Línea temporal día a día con transportes y visitas. Modo **en directo**: banner con lo que está pasando ahora, barra de progreso, cuenta atrás al siguiente evento y marcador "ahora" en la lista. Previsión del tiempo por día (Open-Meteo). Cuenta atrás antes del viaje. |
| **Mapa** | Mapa con todas las visitas, transportes y sitios de comida. Buscador de lugares: escribes "Arthur's Seat", eliges a pie / transporte / coche y pulsas **Ir ahora con Google Maps** → se abre Google Maps con la ruta ya puesta desde donde estás. Cualquier lugar se puede guardar como visita. |
| **Carta** | Gastronomía típica en formato carta de restaurante (desayunos, entrantes, principales, postres, picoteo, bebidas) con foto, precio orientativo, dónde probarlo (con ruta) y valoración de cada miembro ("Lo probé" ⭐). Carta escocesa de ejemplo con un clic. |
| **Fotos** | Fotos, vídeos y documentos del grupo agrupados por día. Las fotos se comprimen y se limpian de EXIF antes de subir. Compartir con la hoja nativa del móvil. |
| **Más** | Grupo (miembros con foto, código de invitación), **gastos compartidos** con balance y "quién paga a quién", **maleta / tareas** compartida, **diario** del viaje (entrada por persona y día, con estado de ánimo), **conversor de divisa** GBP→EUR, mi cuenta y privacidad. |

Cada transporte y visita admite **adjuntos** (PDF del billete, entrada, foto) y un botón **Cómo llegar**.
Todo se sincroniza **en tiempo real** entre los miembros del viaje (Supabase Realtime).

## Stack

- React 19 + TypeScript + Vite 7 + Tailwind CSS 4
- TanStack Query, React Router, Leaflet (mapas OSM/CARTO), date-fns, lucide-react
- Supabase (Auth, Postgres con RLS, Storage privado, Realtime)
- vite-plugin-pwa (instalable + offline de assets) y Capacitor 8 (APK Android)
- APIs sin clave: Nominatim (buscar lugares), Open-Meteo (tiempo), Frankfurter (cambio), Google Maps URLs (rutas)

---

## 0. Camino rápido (todo automático)

```bash
# 1) Token en https://supabase.com/dashboard/account/tokens
SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/setup-supabase.mjs --site-url https://quintinmr.github.io/RadioPatioTrip/
# crea el proyecto en Frankfurt (UE), aplica la migración, configura Auth y escribe .env
# 2) Sube las claves a GitHub Actions (APK + GitHub Pages)
node scripts/setup-github.mjs
```

La web se publica sola en **https://quintinmr.github.io/RadioPatioTrip/** con cada push a `main`
(workflow `pages.yml`), y el APK se genera con `build.yml`.

## 1. Crear el proyecto en Supabase a mano (si no usas el script)

1. Entra en <https://supabase.com> → **New project**.
   - **Region: elige una de la UE** (p. ej. *Frankfurt (eu-central-1)* o *London*). Esto es lo que mantiene los datos personales dentro de la UE.
   - Guarda la contraseña de la base de datos.
2. En **SQL Editor** → **New query**, pega el contenido de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) y pulsa **Run**.
   Crea tablas, políticas RLS, buckets privados, realtime y las funciones RGPD (`export_my_data`, `delete_my_account`).
3. En **Authentication → Providers → Email** deja activado *Email*. Opcional: desactiva *Confirm email* si queréis entrar sin confirmar el correo (para un grupo de amigos es cómodo).
4. En **Authentication → URL Configuration** añade la URL donde vayas a publicar la app (p. ej. `https://radiopatio.vercel.app`) en *Site URL* y en *Redirect URLs*.
5. En **Project Settings → API** copia **Project URL** y **anon public key**.

> La *anon key* es pública por diseño: la seguridad la garantizan las políticas RLS del SQL. Nunca uses la *service_role key* en la app.

## 2. Ejecutar en local

```bash
cp .env.example .env     # y rellena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm install
npm run dev              # http://localhost:5173 (también accesible desde el móvil en la misma wifi)
```

## 3. Publicar la PWA (para que todos la "descarguen")

La forma más sencilla de que tus amigos la instalen (Android **e iPhone**) es publicar la web y que la añadan a la pantalla de inicio:

1. **Vercel** (gratis): importa el repo, framework *Vite*, añade las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en *Environment Variables* y despliega. Netlify o Cloudflare Pages funcionan igual.
2. Añade esa URL en Supabase (paso 1.4).
3. En el móvil: abre la URL → menú del navegador → **"Añadir a pantalla de inicio"** / **"Instalar app"**. Queda con icono propio y a pantalla completa.

> GitHub Pages no sirve con un repositorio privado del plan gratuito; si lo haces público sí puedes usarlo (cambia `base` en `vite.config.ts`).

## 4. APK de Android

### Firma

Todos los APK (CI y local) se firman con la misma clave, guardada en `~/.config/radiopatio/`
(`radiopatio-release.jks` + `keystore.env`) y como secretos `RP_*` en GitHub Actions.
**Haz copia de seguridad de esa carpeta**: si se pierde la clave, las actualizaciones
dejarán de instalarse encima y habrá que desinstalar la app. `node scripts/setup-github.mjs`
vuelve a subir los secretos.

### Local (necesitas Android Studio / SDK y Java 17+)

```bash
npm run apk          # release firmado → RadioPatioTrip.apk
npm run apk:debug    # depuración, firma temporal
```

Pásale el APK a tus amigos por WhatsApp/Drive; al instalarlo Android pedirá permitir "orígenes desconocidos".
`npm run cap:open` abre el proyecto en Android Studio para firmar una versión *release* si queréis.

### Automático con GitHub Actions

El workflow [`.github/workflows/build.yml`](.github/workflows/build.yml) compila el APK en cada push a `main` (se descarga desde la pestaña *Actions* → *Artifacts*) y, si creas un tag, publica una **Release** con el APK:

```bash
git tag v1.0.0 && git push --tags
```

Antes, añade en GitHub **Settings → Secrets and variables → Actions** los secretos `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

## 5. Flujo de uso

1. Cada amigo crea su cuenta (nombre + email + contraseña, aceptando la política de privacidad) y pone su foto en *Mi cuenta*.
2. Uno crea el viaje (*Nuevo viaje*) y comparte el **código de invitación** (pestaña *Grupo* → *Invitar*).
3. Los demás pulsan *Tengo un código* y ya ven y editan todo.

---

## Privacidad y RGPD: cómo está resuelto

| Principio | Implementación |
|---|---|
| Minimización | Solo nombre visible y foto opcional. El email vive únicamente en `auth.users` y nunca se copia a tablas propias. |
| Limitación de acceso | RLS en todas las tablas: solo los miembros de un viaje ven sus datos. Los perfiles solo los ven quienes comparten viaje contigo. |
| Archivos privados | Buckets `media` y `avatars` **no públicos**; se sirven con URLs firmadas de 1 h. Límite de tipos MIME y tamaño en el bucket. |
| Consentimiento | Checkbox obligatorio al registrarse; se guarda `consent_version` y `consent_at` en el perfil. |
| Sin geolocalización personal | La posición del móvil solo se usa en el cliente (mapa / Google Maps). Las fotos se recomprimen en canvas, lo que elimina el EXIF (GPS incluido). |
| Derecho de acceso y portabilidad | *Mi cuenta → Descargar mis datos* llama a `export_my_data()` y descarga un JSON. |
| Derecho de supresión | *Mi cuenta → Borrar mi cuenta*: la app borra por la Storage API los archivos que devuelve `my_storage_paths()` (avatar, lo subido, viajes donde estás solo) y después `delete_my_account()` elimina usuario, perfil, valoraciones, gastos y diario; los viajes sin más miembros se eliminan enteros; si eras owner, cede la propiedad. Probado de extremo a extremo. |
| Residencia de datos | Proyecto Supabase en región UE (elegido al crearlo). |
| Terceros | Sin analítica ni trackers. Nominatim recibe el texto buscado; Open-Meteo, coordenadas de la ciudad; Frankfurter, códigos de moneda; Google Maps se abre en el dispositivo del usuario. |
| Transparencia | Política de privacidad dentro de la app (`/privacidad`). |

## Estructura

```
supabase/migrations/0001_init.sql   esquema, RLS, storage, funciones RGPD
src/lib/        supabase, tipos, maps (Google Maps URLs + Nominatim), images (compresión/EXIF), storage (URLs firmadas)
src/hooks/      auth, trip (contexto + realtime), datos por tabla, reloj, geolocalización, subida de media
src/components/ UI base, PlacePicker, GoButton, formularios de transporte/visita, adjuntos, detalle de evento
src/pages/      Auth, Trips, TripLayout, Timeline, Map, Food, Gallery, More, Expenses, Checklist, Journal, Members, Settings, Privacy
android/        proyecto Capacitor (APK)
```

## Créditos

- Logo: clave de sol del tipo de letra [Noto Music](https://fonts.google.com/noto/specimen/Noto+Music) (licencia OFL).
- Melodía al abrir el viaje: unos compases de *The Skye Boat Song* (tradicional escocesa, dominio público) sintetizados con Web Audio. Se desactiva en *Mi cuenta*.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo |
| `npm run build` | build de producción en `dist/` (PWA) |
| `npm run typecheck` | comprobación TypeScript |
| `npm run icons` | regenera iconos PWA desde `public/favicon.svg` |
| `npm run cap:sync` | build + copia a Android |
| `npm run apk:debug` | genera el APK de depuración |
