# Plan: Pequeños Atletas en Supabase + GitHub + Netlify (4 fases / 4 días)

## Contexto

La app "Pequeños Atletas" (PWA en React + Vite, monorepo `shared/`, `app/`, `functions/`) ya tiene casi todas las pantallas
del SPEC v1.2 (padre y entrenador), reportes PDF/Excel y la lógica de negocio con tablas OMS y tests. Pero está construida
sobre **Firebase** (Auth, Firestore, Storage, Cloud Functions, FCM). Nicolás debe entregar en **4 días** (inicio 2026-10-22)
la **app publicada en Netlify** + el **repositorio en GitHub**, usando **Supabase** como base de datos. Es su primer proyecto
y no sabe programar: todo se explica en español sencillo, paso a paso.

Hallazgos que cambian el plan:
- `.gitignore` tiene la línea `lib/`, que también ignora `app/src/lib/` → `firebase.ts`, `datos.ts`, `sesion.tsx`,
  `archivos.ts`, `push.ts`, `config.ts`… **nunca se han guardado en git**. Se arregla primero (cambiar a `functions/lib/`).
- No hay remoto git. En el PC no están `gh`, `netlify`, `supabase` ni Docker (sí Node 24). Nicolás ya tiene cuentas en
  GitHub, Supabase y Netlify.
- ~31 archivos de `app/src` importan `firebase/*` directamente.

Decisiones tomadas con Nicolás: **solo campanita** (sin push al celular; queda como extra opcional al final del día 4).
Entrega: **link de Netlify + repo GitHub** (público, para que el profesor lo vea).

## Enfoque técnico (resumen para quien ejecuta)

- **Nada de Docker ni Deno.** Supabase en la nube; migraciones SQL en `supabase/migrations/*.sql` aplicadas con
  `npx supabase@latest link` + `npx supabase db push` (si falla, pegar el SQL en el SQL Editor del panel).
- **Tablas**: una por colección actual, mismos nombres en español (`usuarios`, `ninos`, `categorias`, `pagos`,
  `asistencias`, `medicionesFisicas`→`mediciones_fisicas`, etc.). Columnas reales para claves y filtros
  (`id text`, `nino_id` con FK a `ninos`, `categoria_id`, `acudientes_ids uuid[]`, `estado`, `usuario_id`, fechas)
  + `datos jsonb` con el resto. Así hay relaciones reales sin reescribir los tipos de `shared/src/tipos.ts`.
- **Adaptador único** en `app/src/lib/datos.ts`: mantiene la misma API que hoy usan las pantallas
  (`useColeccion`, `useDocumento`, `useDeFamilia`, `useConfiguracion`, `idNuevo`, `auditoriaNueva`, `limpio`) y agrega
  `obtener`, `listar`, `guardar` (upsert), `actualizar` (parche, reutiliza `asignarRuta` de
  `app/src/pantallas/entrenador/acciones.ts`), `guardarVarios` y `borrar`. Un mapa `COLUMNAS` por tabla convierte
  objeto ⇄ fila (camelCase ⇄ snake_case + `datos`). Tiempo real con Supabase Realtime (`postgres_changes`) → al cambiar,
  se vuelve a consultar. Filtros: `.eq/.in/.contains('acudientes_ids',[uid])`.
- **Seguridad (RLS)**: traducir `firestore.rules` a políticas Postgres. Función `es_entrenador()` (security definer sobre
  `usuarios.rol`). Restricciones por campo (p. ej. padre solo cambia `leida` en notificaciones; niño pendiente solo
  `fotoRuta/documentos/seguroMedico`) con triggers `BEFORE UPDATE`. Storage: buckets `ninos`, `resultados`, `publico`
  con políticas equivalentes a `storage.rules` y URLs firmadas.
- **Auth**: Supabase Auth email+contraseña, verificación y recuperación (pantallas `app/src/pantallas/acceso/*`).
  `app/src/lib/sesion.tsx` escucha `onAuthStateChange` + perfil en `usuarios`.
- **Reemplazo de Cloud Functions**:
  - Notificaciones N01–N15 a la campanita → triggers `AFTER INSERT/UPDATE` en Postgres que insertan en `notificaciones`
    respetando preferencias (port de `functions/src/index.ts` + `notificar.ts`, sin FCM).
  - Vincular segundo acudiente (`alCrearUsuario`, `alCrearInvitacion`) → trigger security definer.
  - Tareas diarias (`functions/src/tareas.ts`: ciclo de pagos 00:05 y recordatorios 07:00 Bogotá) →
    **Netlify Scheduled Functions** en `netlify/functions/` que importan `@pa/shared` sin cambios y usan supabase-js con
    la clave secreta (cron UTC: `5 5 * * *` y `0 12 * * *`). Botón "Ejecutar tareas de hoy" → función Netlify normal que
    valida que el usuario sea entrenador.
- **Reutilizar sin tocar**: todo `shared/src/` (imc, pagos, asistencia, pruebas, catálogo, fechas, formato, tipos) y sus
  tests; `app/src/lib/ics.ts`, `excel.ts`, `errores.ts`, `estilos.ts`; `app/src/pdf/informe.tsx`; `app/src/ui/*`.
- **Netlify**: `netlify.toml` (build `npm run build:app`, publish `app/dist`, redirect SPA `/* → /index.html 200`,
  carpeta de funciones). Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (clave "publishable"),
  `SUPABASE_SERVICE_ROLE_KEY` (clave "secret", solo funciones). Netlify conectado al repo de GitHub → cada `push` publica.
- **Riesgo conocido**: el correo gratis de Supabase envía pocos emails por hora. Las cuentas de prueba del seed se crean ya
  confirmadas; para la demo se puede apagar "Confirm email" si hace falta.
- Sin Firestore offline: la app abre sin internet (PWA) pero los datos requieren conexión. Se documenta en README.

## Archivos que se crean al aprobar este plan (en esta ventana)

1. `CLAUDE.md` (raíz): reglas de trabajo — hablar en español sencillo, Nicolás es principiante, explicar cada paso que él
   deba hacer (clics exactos), usar agentes en paralelo, protocolo de fin de fase, tabla "Estado de las fases", comandos
   de pruebas, y resumen del enfoque técnico de arriba.
2. `PLAN.md` (raíz): copia de este plan, para que cada ventana nueva lo lea.
3. Memoria (`memory/`): perfil del usuario (principiante, español, guía paso a paso), proyecto (4 fases, plazo, stack,
   decisiones), forma de trabajo (fin de fase = pruebas + commit + push + texto para la siguiente ventana). Índice en
   `MEMORY.md`.
4. Arreglar `.gitignore` (`lib/` → `functions/lib/`) y hacer commit local de todo (aún no hay GitHub para `push`).
5. Entregar el texto para abrir la **Fase 1** en una ventana nueva con **Sonnet 5.5**.

## Protocolo al final de CADA fase

1. Correr pruebas: `npm test` (lógica), `npm run typecheck`, `npm run build`, y desde la Fase 1 `npm run test:seguridad`
   (RLS contra Supabase). Además una prueba en el navegador integrado (padre y entrenador).
2. Si algo falla, arreglarlo antes de seguir (y decirlo con honestidad).
3. Actualizar la tabla "Estado de las fases" en `CLAUDE.md`.
4. `git commit` + `git push` (Netlify publica solo).
5. Dar a Nicolás el texto exacto para la siguiente ventana.

## Fase 1 — Día 1: Cuentas, base de datos y entrada a la app

Nicolás (guiado clic a clic): instalar GitHub CLI (`winget install GitHub.cli`) y `gh auth login`; crear proyecto en
Supabase (región São Paulo), copiar URL y claves a `app/.env.local`; crear repo público con
`gh repo create pequenos-atletas --public --source . --push`; en Netlify "Import from GitHub" y poner las variables.

Agentes en paralelo (mientras Nicolás crea cuentas):
- **Agente A – Base de datos**: `supabase/migrations/0001_esquema.sql` (tablas, FKs, índices, realtime publication),
  `0002_seguridad.sql` (RLS + triggers de campos + buckets/políticas Storage). Fuente: `firestore.rules`,
  `storage.rules`, `shared/src/tipos.ts`, SPEC §4.
- **Agente B – Conexión de la app**: `app/src/lib/supabase.ts` (reemplaza `firebase.ts`), `config.ts`, `datos.ts`
  (adaptador), `sesion.tsx`, `archivos.ts`, `pantallas/comun/useFoto.ts`, y las pantallas de `acceso/` (ingresar,
  registro, verificar, recuperar). `app/.env.example` con las variables nuevas.

Después (sesión principal): aplicar migraciones, reescribir `scripts/seed.ts` con supabase-js (usuarios confirmados +
datos de ejemplo), port de `tests/reglas.test.ts` a `tests/seguridad.test.ts` (+ `vitest.seguridad.config.ts`, script
`test:seguridad`), `netlify.toml`, script `build:app`. **Listo cuando**: se puede registrar e ingresar como padre y
entrenador en local y en Netlify; pruebas de seguridad CA-01 (aislamiento de familias) pasan.

## Fase 2 — Día 2: Pantallas del padre y del entrenador sobre Supabase

`app/src/lib/` queda congelado (si un agente necesita cambiarlo, lo reporta y lo hace la sesión principal).
Agentes en paralelo, sin tocar los mismos archivos:
- **Agente A – Padre**: `pantallas/padre/*` (`familia.tsx`, `Inscribir.tsx` con subida de fotos/documentos, `MiHijo`,
  `Cuenta`, `Eventos`, `Invitar`, `Inicio`, `Anuncios`, `Pagos`) + `pantallas/comun/Notificaciones.tsx`.
- **Agente B – Entrenador 1**: `contexto.tsx`, `Panel`, `Ninos`, `FichaNino`, `FormNino`, `Inscripciones`, `Solicitudes`,
  `PagosEntrenador`, `acciones.ts`, `MediosPago`, `Categorias`, `MasEntrenador`.
- **Agente C – Entrenador 2**: `Sesiones`, `FormSesion`, `DetalleSesion`, `TomarAsistencia`, `Captura`, `Mediciones`,
  `Catalogo`, `EventosEntrenador`, `AnunciosEntrenador`, `Reportes`, `Configuracion`.

**Listo cuando**: ningún archivo de pantallas importa `firebase/*`; typecheck y build pasan; en el navegador se recorre
inscripción → aprobación → asistencia → medición → prueba → pago, y el padre ve solo a sus hijos.

## Fase 3 — Día 3: Automatizaciones y adiós a Firebase

Agentes en paralelo:
- **Agente A – Avisos en la base de datos**: `supabase/migrations/0003_notificaciones.sql` (triggers N01–N15 a
  `notificaciones`, preferencias, horario) y `0004_invitaciones.sql` (vincular segundo acudiente).
- **Agente B – Tareas diarias**: `netlify/functions/ciclo-nocturno.mts`, `recordatorios.mts`, `ejecutar-tareas.mts`
  portando `functions/src/tareas.ts`; conectar el botón de `Configuracion.tsx`.
Luego **Agente C** (después de A y B, porque toca `package.json`): quitar Firebase — borrar `functions/`,
`firebase.json`, `.firebaserc`, `firestore.*`, `storage.rules`, `scripts/emuladores.mjs`, `vitest.rules.config.ts`,
`tests/reglas.test.ts`, dependencias firebase, `lib/push.ts` y la parte FCM de `sw.ts` (dejar precache/actualización).

**Listo cuando**: `grep firebase` no encuentra nada en el código; al aprobar un niño o registrar un pago aparece la
campanita; "Ejecutar tareas de hoy" crea pagos del ciclo y recordatorios.

## Fase 4 — Día 4: Publicación final y entrega

- **Sesión principal**: configurar en Supabase Auth la URL de Netlify (Site URL + Redirect URLs); recorrer en la app
  publicada los criterios de aceptación CA-01…CA-09 del SPEC (navegador integrado, móvil y escritorio); probar
  instalación como PWA en el celular de Nicolás.
- **Agente A – Documentación**: `README.md` nuevo (qué es, link, cómo correrla, cuentas de demo, arquitectura Supabase/
  Netlify), actualizar `SPEC.md` a v1.3 (stack), texto legal base en `Terminos.tsx` marcado como plantilla.
- **Agente B – Revisión**: revisión de seguridad/errores del código final (RLS, claves que no deben estar en el cliente).
- Extra solo si sobra tiempo: avisos push al celular.
- Cierre: commit, push, etiqueta `v1.0`, y mensaje final con el **link de Netlify** y el **link del repo** para entregar.

## Texto para iniciar cada ventana (plantilla)

> Abre una ventana nueva, elige el modelo **Sonnet 5.5** y pega:
> "Hola. Vamos a ejecutar la **Fase N** del proyecto Pequeños Atletas. Lee `CLAUDE.md` y `PLAN.md` en la raíz del
> proyecto y sigue la Fase N al pie de la letra. Háblame en español sencillo y guíame paso a paso; no sé programar.
> Usa agentes en paralelo como dice el plan. Al terminar, corre las pruebas, haz commit y push, actualiza el estado en
> `CLAUDE.md` y dame el texto para abrir la Fase N+1 en otra ventana."

## Verificación

- `npm test` → tests de dominio (`shared/src/dominio.test.ts`, CA-02 y CA-06) siguen pasando en todas las fases.
- `npm run typecheck` y `npm run build` sin errores.
- `npm run test:seguridad` → aislamiento entre familias (CA-01), no escalar rol, inscripción solo pendiente, solicitudes
  (CA-07), sin medios sin consentimiento (CA-08), notificaciones propias.
- Navegador integrado: flujo completo padre + entrenador en local (`npm run dev`, puerto 5173) y en el link de Netlify.
- Fase 4: CA-01…CA-09 recorridos en la app publicada; repo en GitHub con todo el código (incluido `app/src/lib/`).
