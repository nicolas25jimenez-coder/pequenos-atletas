# Plan de pulimiento: Pequeños Atletas v1.1 (6 fases)

## Contexto

La app ya está publicada y funciona (ver `PLAN.md`, fases 0–4 hechas). Ahora se **pule**: corregir y agregar cosas de
**interfaz, diseño e interacción**. Se sigue con **Supabase + GitHub + Netlify**. Se planifica con **Opus 5.5** y se ejecuta
con **Sonnet 5.5**, una fase por ventana nueva. Nicolás no sabe programar: español sencillo y pasos numerados cuando él deba
hacer algo.

**Reparto (decidido por Nicolás, 2026-10-27):**
- **Fases 1, 2 y 3 → lado del ENTRENADOR.** La Fase 1 empieza con una entrevista: Claude hace preguntas, Nicolás da sus ideas
  y entre los dos las pulen antes de programar.
- **Fases 4, 5 y 6 → lado del PADRE.** La Fase 4 empieza con otra entrevista igual para el padre.
- La Fase 6 además cierra lo técnico (rendimiento, PWA, seguridad, documentación, entrega v1.1).

## Cómo se hace la "entrevista" (Fases 1 y 4)

Antes de tocar código, la sesión:
1. Recorre en el navegador integrado las pantallas de ese lado (celular 375 px) y anota lo que ve.
2. Le hace a Nicolás **preguntas cortas, de a pocas** (usa la herramienta de preguntas con opciones, no textos largos):
   qué es lo que más usa, qué le molesta, qué le falta, qué le gustaría ver al abrir la app, colores/estilo, qué hace con prisa
   en la cancha, etc.
3. Nicolás cuenta sus ideas; Claude las **pule**: las aclara, dice si son fáciles o difíciles, propone cómo se verían y
   en qué fase caben.
4. Se guarda el resultado en **`IDEAS-ENTRENADOR.md`** (Fase 1) o **`IDEAS-PADRE.md`** (Fase 4): lista numerada, cada idea con
   "qué", "por qué", "fase donde se hace" y estado. Nicolás aprueba la lista antes de programar.
Lo que no quepa en la fase se pasa a la siguiente de su lado (o a "ideas para después" si no cabe en ninguna).

## Hallazgos técnicos de la revisión (2 agentes, 2026-10-27) que alimentan las fases

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
- Las mejoras técnicas de cada fase se mezclan con las ideas de Nicolás; si chocan, manda lo que Nicolás aprobó.

---

# LADO ENTRENADOR

## Fase 1 — Entrevista del entrenador + cimientos + día a día en la cancha

**Paso 1 – Entrevista** (ver arriba). Resultado: `IDEAS-ENTRENADOR.md` aprobado por Nicolás. Pantallas a recorrer:
Panel, Niños, Ficha, Sesiones, Tomar asistencia, Captura, Mediciones, Inscripciones, Solicitudes, Pagos, Anuncios, Eventos,
Reportes, Configuración.

**Paso 2 – Pendientes de Supabase** (Nicolás guiado clic a clic):
1. Pegar `supabase/migrations/0005_*.sql` en el SQL Editor de Supabase y pulsar Run.
2. Authentication → URL Configuration: Site URL = `https://pequenos-atletas2.netlify.app` y la misma dirección con `/**`
   en Redirect URLs.

**Paso 3 – Cimientos** (sesión principal primero, porque las 5 fases siguientes usan estos componentes). Agentes en paralelo:
- **Agente A – Componentes comunes** (`app/src/ui/base.tsx`, `ui/marco.tsx`, `index.css`, `tailwind.config.js`):
  `ErrorCarga` con "Reintentar"; `Cargando` con `role="status"` y esqueletos; `Modal` accesible (foco atrapado, cerrar 44 px);
  `ConfirmModal` reutilizable (reemplaza `confirm()`); `Toast` con `aria-live`; `alto="sm"` a 44 px; `Campo` con etiqueta
  visible y error; `BarraNav` con `aria-label`; `:focus-visible`; `prefers-reduced-motion`; contraste de `apagado` ≥ 4,5:1 y
  texto mínimo 12 px.
- **Agente B – Limpieza y base de datos**: borrar `firebase-debug.log`, `firestore-debug.log`; preguntar a Nicolás qué hacer
  con `Mobile app design form 1.zip`; revisar `set search_path` en funciones `security definer` (si falta, migración
  `0006_endurecer.sql`); revisar `netlify/functions/*` (rol entrenador; cron protegidas). No toca `app/src/ui/`.

**Paso 4 – Día a día** (después de A y B). Agente C – `TomarAsistencia`, `Sesiones`, `FormSesion`, `DetalleSesion`:
botones grandes para tocar con prisa, confirmación antes de cambios importantes, más las ideas aprobadas que caigan aquí.

**Listo cuando**: `IDEAS-ENTRENADOR.md` aprobado; migración 0005 y Auth URL listas; componentes nuevos comentados; tomar
asistencia de 10 niños se hace cómodo con una mano en 375 px; recuperar contraseña por correo lleva a la app publicada.

## Fase 2 — Entrenador: gestión de niños, inscripciones y pagos

Usa los componentes de la Fase 1 y las ideas de `IDEAS-ENTRENADOR.md`. Agentes en paralelo:
- **Agente A – Panel y niños** (`Panel`, `Ninos`, `FichaNino`, `FormNino`, `contexto.tsx`): `ErrorCarga` y esqueletos por
  colección (el panel no debe mostrar ceros si falló), buscador/filtros claros, partir `FichaNino.tsx` en componentes
  más chicos.
- **Agente B – Inscripciones y pagos** (`Inscripciones`, `Solicitudes`, `PagosEntrenador`, `MediosPago`): estados vacíos
  cálidos, 44 px, confirmaciones con `ConfirmModal`, textos ≥ 12 px.
- **Agente C – Medición y seguimiento** (`Mediciones`, `Captura`, `lib/archivos.ts` solo lado entrenador): progreso al subir
  foto/video con límite visible, partir `Captura.tsx`.

**Listo cuando**: ninguna pantalla muestra datos falsos (ceros/vacío) cuando falla la carga; ideas aprobadas de esta fase
hechas; todo botón ≥ 44 px.

## Fase 3 — Entrenador: contenido, ajustes y reportes + revisión del lado entrenador

Agentes en paralelo:
- **Agente A – Contenido** (`AnunciosEntrenador`, `EventosEntrenador`, `Notificaciones` lado entrenador): reemplazar
  `confirm()` por `ConfirmModal`, errores junto al campo con desplazamiento hasta él.
- **Agente B – Ajustes y reportes** (`Categorias`, `Catalogo`, `Reportes`, `Configuracion`, `MasEntrenador`): selector de
  color usable en celular, estado de espera en reportes PDF/Excel, menú "Más" ordenado.
- **Agente C – Revisión** (solo lectura, al final): revisa todo el lado entrenador: sin `confirm(` (con `grep`), sin textos
  < 12 px, errores manejados, accesibilidad; entrega lista que corrige la sesión principal.

**Listo cuando**: no queda `confirm(` nativo; un recorrido completo como entrenador en 375 px no tiene nada cortado ni
confuso; todas las ideas aprobadas del entrenador están hechas o movidas explícitamente a "para después".

---

# LADO PADRE

## Fase 4 — Entrevista del padre + acceso + inicio y mi hijo

**Paso 1 – Entrevista** (ver arriba). Resultado: `IDEAS-PADRE.md` aprobado. Pantallas a recorrer: Splash, Ingresar,
Registro, Recuperar, Inicio, Mi hijo, Inscribir, Asistencia, Historial, Pruebas, Informe, Pagos, Anuncios, Eventos, Más,
Cuenta, Invitar.

**Paso 2 – Programar.** Agentes en paralelo:
- **Agente A – Acceso** (`pantallas/acceso/*`): etiquetas visibles, mostrar/ocultar contraseña, `inputMode="email"`,
  `autoComplete`, `autoCapitalize="none"`, requisitos de contraseña mientras se escribe, errores amables, enlace
  "¿Olvidaste tu contraseña?" visible, Términos legible en celular.
- **Agente B – Inicio y Más** (`Inicio`, `SinHijos`, `Mas`, `Cuenta`, `Invitar`, `AppPadre`, `familia.tsx`): `ErrorCarga`,
  esqueletos, estados vacíos cálidos, 44 px, textos ≥ 12 px, y las ideas aprobadas que caigan aquí.

**Listo cuando**: `IDEAS-PADRE.md` aprobado; se puede registrar/ingresar/recuperar sin trabarse en 375 px; apagar la red
muestra "Reintentar" en Inicio.

## Fase 5 — Padre: mi hijo, asistencia, progreso, inscripción

Agentes en paralelo:
- **Agente A – Mi hijo e inscripción** (`MiHijo`, `Inscribir`, `useFoto.ts`, `lib/archivos.ts` lado padre): partir
  `MiHijo.tsx`; botones accesibles para subir archivos y avisos claros de tamaño/tipo; foto con iniciales de respaldo y sin
  tragar errores; `select` con etiqueta.
- **Agente B – Seguimiento** (`Asistencia`, `Historial`, `DetallePrueba`, `Informe`): calendario de asistencia con botones de
  44 px y estado en texto (no solo color); gráficas legibles en celular; estados vacíos cálidos.
- **Agente C – Avisos y dinero** (`Pagos`, `Anuncios`, `Eventos`, `Notificaciones` lado padre): `ErrorCarga`, esqueletos,
  44 px.

**Listo cuando**: en 375 px nada se sale de la pantalla, todo botón mide ≥ 44 px, apagar la red muestra "Reintentar" en cada
pantalla del padre.

## Fase 6 — Padre: pulido final + rendimiento, PWA, seguridad, documentación y entrega v1.1

Primero lo que quede de `IDEAS-PADRE.md`. Luego, agentes en paralelo (archivos distintos):
- **Agente A – Velocidad** (`App.tsx`, `lib/datos.ts`, `vite.config.ts`): rutas de acceso con `lazy`; por qué `Inscribir`
  pesa 173 kB; filtrar en el servidor en `listar`; quitar `chunkSizeWarningLimit: 2500` o justificarlo; meta: chunk
  principal < 300 kB.
- **Agente B – PWA** (`sw.ts`, `public/`, manifest): caché en ejecución para fuentes y datos recientes, página "Sin
  conexión", ícono maskable propio, `id` y capturas en el manifest, aviso "Hay una versión nueva".
- **Agente C – Documentación y CI**: `README.md`, `SPEC.md` v1.4 (quitar "Firebase Auth" en 2 sitios), nota de privacidad,
  `npm run verificar` (typecheck + test + build) y `.github/workflows/ci.yml`.
- **Agente D – Revisión final** (solo lectura, al final): `/code-review` nivel alto de todo el cambio, claves en el cliente,
  RLS, funciones Netlify; la sesión principal corrige.

Cierre: recorrer CA-01…CA-09 del SPEC en el sitio publicado (padre y entrenador, móvil y escritorio), probar instalar la
app en el celular de Nicolás, etiqueta `v1.1`, commit, push y mensaje final con link de Netlify y link del repo.
**Listo cuando**: abre en < 3 s en 4G simulado, abre sin internet con pantalla de "Sin conexión", se instala con ícono
correcto, CI en verde en GitHub.

---

## Textos para abrir cada ventana

> Abre una ventana nueva, elige el modelo **Sonnet 5.5** y pega:
> "Hola. Vamos a ejecutar la **Fase N del pulimiento** del proyecto Pequeños Atletas. Lee `CLAUDE.md` y `PLAN-PULIDO.md`
> en la raíz y sigue la Fase N al pie de la letra. Háblame en español sencillo y guíame paso a paso; no sé programar.
> Si la fase empieza con entrevista, hazme las preguntas antes de programar. Usa agentes en paralelo como dice el plan.
> Al terminar, corre las pruebas (`npm test`, `npm run typecheck`, `npm run build`, `npm run test:seguridad`), pruébalo en
> el navegador como padre y como entrenador, haz commit y push, actualiza la tabla de pulimiento en `CLAUDE.md` y dame el
> texto para abrir la Fase N+1 en otra ventana."
