# Plan de pulimiento: Pequeños Atletas v1.1 (5 fases)

## Contexto

La app ya está publicada y funciona (ver `PLAN.md`, fases 0–4 hechas). Ahora se **pule**: que se vea y se sienta bien en el
celular, que no falle en silencio, que cargue rápido, que sea segura y que la documentación esté al día.
Se sigue con **Supabase + GitHub + Netlify**. Se planifica con **Opus 5.5** y se ejecuta con **Sonnet 5.5**, una fase por
ventana nueva. Nicolás no sabe programar: español sencillo y pasos numerados cuando él deba hacer algo.

Hallazgos de la revisión (2 agentes, 2026-10-27) que sustentan este plan:
- `Estado.error` existe en `lib/datos.ts` pero **ninguna pantalla lo usa**: si falla la red se ve vacío o un spinner eterno.
- Botones táctiles pequeños (28–38 px; lo mínimo es 44 px), críticos en `TomarAsistencia`. Modal y Toast sin accesibilidad.
- Contraste bajo del color `apagado` (~3:1) y ~46 textos de 10–11 px. Sin `:focus-visible` ni `prefers-reduced-motion`.
- Formularios de acceso sin etiqueta visible (solo placeholder), sin mostrar/ocultar contraseña, sin `inputMode/autoComplete`.
- `confirm()` nativo del navegador en Anuncios y Eventos (rompe el estilo).
- Rendimiento: pantallas de acceso en el chunk principal (464 kB); `Inscribir` 173 kB; `listar` baja tablas completas;
  `chunkSizeWarningLimit: 2500` esconde el aviso del PDF (1,2 MB).
- PWA: solo precache; sin caché de fuentes ni página sin conexión; ícono maskable repetido; sin capturas en el manifest.
- Seguridad/pendientes: migración **0005 sin aplicar**; **Auth URL** de Supabase sin configurar; revisar `set search_path` en
  funciones `security definer`; confirmar que `ejecutar-tareas` exige rol entrenador y que las programadas no se pueden
  invocar desde fuera.
- Calidad: SPEC aún dice Firebase en 2 sitios; basura en la raíz (`firebase-debug.log`, `firestore-debug.log`,
  `Mobile app design form 1.zip`); archivos grandes (`FichaNino` 400 líneas, `MiHijo` 319, `Captura` 304); sin CI.

## Reglas para todas las fases

- No cambiar `shared/src/` salvo que sea indispensable. Claves secretas nunca en el código ni en git.
- Agentes en paralelo con **archivos distintos** (nunca dos tocando el mismo). Si un agente necesita un archivo ajeno, lo
  reporta y lo hace la sesión principal.
- Cada fase termina con el **protocolo de cierre** de `CLAUDE.md`: `npm test`, `npm run typecheck`, `npm run build`,
  `npm run test:seguridad`, prueba en el navegador integrado (celular 375 px) como padre y como entrenador, arreglar lo que
  falle, actualizar la tabla de estado, `git add` + `commit` + `push`, y dar el texto de la siguiente fase.
- Cuentas de demo: contraseña `Atletas2026`; `entrenador@pequenosatletas.co`, `carolina.rojas@ejemplo.co`.

## Fase 1 — Cimientos: errores, accesibilidad base y pendientes de Supabase

Es la base: las demás fases usan estos componentes, por eso va primero y la hace la sesión principal con agentes.

Nicolás (guiado clic a clic):
1. Pegar `supabase/migrations/0005_*.sql` en el SQL Editor de Supabase y pulsar Run.
2. En Supabase → Authentication → URL Configuration: Site URL = `https://pequenos-atletas2.netlify.app` y agregar la misma
   dirección (con `/**`) en Redirect URLs.

Agentes en paralelo:
- **Agente A – Componentes comunes** (`app/src/ui/base.tsx`, `ui/marco.tsx`, `index.css`, `tailwind.config.js`):
  componente `ErrorCarga` con botón "Reintentar"; `Cargando` con `role="status"` y esqueletos para listas; `Modal` con
  `role="dialog"`, `aria-modal`, título enlazado, foco atrapado y botón cerrar de 44 px; `ConfirmModal` reutilizable (para
  reemplazar `confirm()`); `Toast` con `aria-live` y duración mayor para errores; `alto="sm"` a 44 px; `Campo` con
  etiqueta visible, `aria-invalid` y texto de error; `BarraNav` con `aria-label`; `:focus-visible` global;
  `prefers-reduced-motion`; subir el tono de `apagado` a contraste ≥ 4,5:1 y tamaño mínimo de texto 12 px.
- **Agente B – Limpieza del repo y base de datos**: borrar `firebase-debug.log`, `firestore-debug.log`; mover/eliminar
  `Mobile app design form 1.zip` (preguntar a Nicolás si quiere conservarlo fuera del proyecto); revisar que todas las
  funciones `security definer` de `supabase/migrations/` tengan `set search_path`; si falta alguna, nueva migración
  `0006_endurecer.sql`; revisar `netlify/functions/*` (rol entrenador en `ejecutar-tareas`; cron protegidas).
  No toca `app/src/ui/`.

Cierre de Fase 1: la sesión principal usa `ErrorCarga` en el panel del padre y del entrenador como ejemplo y prueba apagando
la red en el navegador. **Listo cuando**: componentes nuevos documentados en comentarios; migración 0005 aplicada; Auth URL
puesta; pruebas pasan; recuperar contraseña por correo lleva a la app publicada.

## Fase 2 — Acceso y pantallas del padre

Usa los componentes de la Fase 1. Agentes en paralelo:
- **Agente A – Acceso** (`pantallas/acceso/*`): etiquetas visibles, botón mostrar/ocultar contraseña, `inputMode="email"`,
  `autoComplete`, `autoCapitalize="none"`, requisitos de contraseña mientras se escribe, mensajes de error amables,
  enlace "¿Olvidaste tu contraseña?" visible, Términos legible en celular, pantallas de acceso con `lazy`.
- **Agente B – Padre 1** (`Inicio`, `Pagos`, `Anuncios`, `Eventos`, `Mas`, `SinHijos`, `Cuenta`, `Invitar`): `ErrorCarga`,
  esqueletos, estados vacíos con texto cálido, 44 px, textos ≥ 12 px.
- **Agente C – Padre 2** (`MiHijo`, `Inscribir`, `Asistencia`, `Historial`, `DetallePrueba`, `Informe`, `useFoto.ts`,
  `lib/archivos.ts`): calendario de asistencia con botones de 44 px y estado en texto (no solo color); `select` con etiqueta;
  botones accesibles para subir archivos y avisos claros de tamaño/tipo; foto con iniciales de respaldo y sin tragar errores;
  partir `MiHijo.tsx` en componentes más chicos.

**Listo cuando**: en 375 px nada se sale de la pantalla, todo botón mide ≥ 44 px, apagar la red muestra "Reintentar" en cada
pantalla del padre, y se puede registrar/ingresar/recuperar sin trabarse.

## Fase 3 — Pantallas del entrenador

Agentes en paralelo:
- **Agente A – Día a día** (`TomarAsistencia`, `Sesiones`, `FormSesion`, `DetalleSesion`, `Captura`, `Mediciones`):
  botones grandes para tocar con prisa en la cancha, progreso al subir foto/video y límite visible, confirmación antes de
  cambios importantes, partir `Captura.tsx`.
- **Agente B – Gestión** (`Panel`, `Ninos`, `FichaNino`, `FormNino`, `Inscripciones`, `Solicitudes`, `PagosEntrenador`,
  `MasEntrenador`, `contexto.tsx`): `ErrorCarga` y esqueletos por colección (el panel no debe mostrar ceros si falló),
  buscador/filtros claros, partir `FichaNino.tsx`.
- **Agente C – Contenido y ajustes** (`AnunciosEntrenador`, `EventosEntrenador`, `MediosPago`, `Categorias`, `Catalogo`,
  `Reportes`, `Configuracion`): reemplazar `confirm()` por `ConfirmModal`, errores de validación junto al campo con
  desplazamiento hasta él, selector de color usable en celular, estado de espera en reportes PDF/Excel.

**Listo cuando**: tomar asistencia de 10 niños se hace cómodo con una mano en 375 px; ninguna pantalla muestra datos falsos
(ceros/vacío) cuando falla la carga; no queda ningún `confirm(` nativo (`grep` lo comprueba).

## Fase 4 — Rendimiento y PWA

Agentes en paralelo:
- **Agente A – Velocidad** (`App.tsx`, `lib/datos.ts`, `vite.config.ts`): rutas de acceso con `lazy`; investigar por qué
  `Inscribir` pesa 173 kB; en `listar` filtrar en el servidor (no bajar tablas completas) y evitar consultas repetidas;
  quitar `chunkSizeWarningLimit: 2500` o dejarlo con justificación; meta: chunk principal < 300 kB.
- **Agente B – PWA** (`sw.ts`, `public/`, manifest): caché en ejecución para fuentes y datos recientes, página
  "Sin conexión" amable, ícono maskable propio con margen, `id` y capturas de pantalla en el manifest, aviso "Hay una versión
  nueva" al actualizar; documentar que PDF/Excel necesitan internet.

Luego la sesión principal mide antes/después (`npm run build`, tamaños) y prueba instalar la app en el celular de Nicolás.
**Listo cuando**: la app abre en < 3 s en 4G simulado, abre sin internet mostrando la pantalla de "Sin conexión", y se puede
instalar con ícono correcto.

## Fase 5 — Seguridad, documentación, pruebas automáticas y entrega v1.1

Agentes en paralelo:
- **Agente A – Documentación**: `README.md` (qué es, link, cómo correrla, cuentas de demo, Supabase/Netlify, qué requiere
  internet), `SPEC.md` v1.4 (quitar "Firebase Auth" en las 2 menciones, reflejar cambios), nota de privacidad base.
- **Agente B – Pruebas y CI**: script `npm run verificar` (typecheck + test + build), GitHub Actions
  (`.github/workflows/ci.yml`) que lo corre en cada push, pruebas nuevas de `datos.ts` y de componentes clave si es viable.
- **Agente C – Revisión final** (solo lectura): revisión de seguridad y errores de todo el cambio (`/code-review` en nivel
  alto), claves en el cliente, RLS, funciones Netlify; entrega lista de hallazgos que la sesión principal corrige.

Cierre: recorrer CA-01…CA-09 del SPEC en el sitio publicado (padre y entrenador, móvil y escritorio), etiqueta `v1.1`,
commit y push, y mensaje final con el link de Netlify y el link del repo.

## Textos para abrir cada ventana

> Abre una ventana nueva, elige el modelo **Sonnet 5.5** y pega:
> "Hola. Vamos a ejecutar la **Fase N del pulimiento** del proyecto Pequeños Atletas. Lee `CLAUDE.md` y `PLAN-PULIDO.md`
> en la raíz y sigue la Fase N al pie de la letra. Háblame en español sencillo y guíame paso a paso; no sé programar.
> Usa agentes en paralelo como dice el plan. Al terminar, corre las pruebas (`npm test`, `npm run typecheck`,
> `npm run build`, `npm run test:seguridad`), pruébalo en el navegador como padre y como entrenador, haz commit y push,
> actualiza la tabla de pulimiento en `CLAUDE.md` y dame el texto para abrir la Fase N+1 en otra ventana."
