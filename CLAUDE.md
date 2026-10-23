# Pequeños Atletas — instrucciones para Claude

## Con quién trabajas

- **Nicolás** es estudiante y este es su **primer proyecto**. **No sabe nada de programación.**
- Habla **siempre en español**, con palabras sencillas. Si usas un término técnico, explícalo en una línea.
- Cuando Nicolás tenga que hacer algo (crear una cuenta, copiar una clave, hacer clic), dale **pasos numerados y
  exactos**: qué página abrir, qué botón tocar, qué copiar y dónde pegarlo. Un paso a la vez si es delicado.
- Nunca le pidas que escriba código. Los comandos los corres tú; si él debe correr uno, dáselo en un bloque `bash`.
- Si algo falla, dilo con honestidad y explica qué vas a hacer para arreglarlo.

## El proyecto

App web instalable (PWA) para un entrenador de niños de 4 a 6 años y los padres de familia. Detalle completo en
`SPEC.md`. Plan de trabajo en **`PLAN.md`** (léelo siempre al empezar una ventana).

- **Plazo:** 4 días, una fase por día, empezando el 2026-10-22. Si no se termina, Nicolás pierde la materia.
- **Entrega:** link de la app en **Netlify** + repositorio público en **GitHub**.
- **Stack destino:** React + Vite + Tailwind (ya existe) · **Supabase** (base de datos, login, archivos) ·
  **Netlify** (publicación y tareas programadas) · **GitHub** (código).
- La app hoy usa Firebase; las fases 1–3 lo reemplazan por Supabase. Fase 4 publica y entrega.
- Avisos: **solo la campanita dentro de la app**. Push al celular solo si sobra tiempo el día 4.

## Cómo se trabaja

- Se planifica con **Opus 5.5** y se ejecuta con **Sonnet 5.5**. Cada fase va en **una ventana nueva**.
- Usa **agentes en paralelo** cuando el plan lo indique; cada agente con archivos distintos (nunca dos tocando el mismo).
- No cambies `shared/src/` salvo que sea indispensable: es la lógica de negocio probada (OMS, pagos, asistencia, pruebas).
- Claves secretas solo en `app/.env.local` y en las variables de Netlify. **Nunca** en el código ni en git.
  La clave secreta de Supabase (service role) jamás va en la app del navegador.

## Al terminar CADA fase (obligatorio)

1. Correr pruebas: `npm test`, `npm run typecheck`, `npm run build` y (desde la Fase 1) `npm run test:seguridad`.
   Además probar en el navegador integrado como padre y como entrenador.
2. Si algo falla, arreglarlo antes de cerrar la fase.
3. Actualizar la tabla de abajo.
4. `git add` + `git commit` + `git push` (Netlify publica solo al recibir el push).
5. Explicarle a Nicolás en 3–5 líneas qué quedó listo y darle el **texto para abrir la siguiente fase**:

   > Abre una ventana nueva, elige el modelo **Sonnet 5.5** y pega:
   > "Hola. Vamos a ejecutar la **Fase N** del proyecto Pequeños Atletas. Lee `CLAUDE.md` y `PLAN.md` en la raíz del
   > proyecto y sigue la Fase N al pie de la letra. Háblame en español sencillo y guíame paso a paso; no sé programar.
   > Usa agentes en paralelo como dice el plan. Al terminar, corre las pruebas, haz commit y push, actualiza el estado
   > en `CLAUDE.md` y dame el texto para abrir la Fase N+1 en otra ventana."

## Estado de las fases

| Fase | Qué es | Estado |
|---|---|---|
| 0 | Plan, CLAUDE.md, memoria | ✅ Hecha (2026-10-22) |
| 1 | Cuentas, base de datos Supabase, login | ✅ Hecha (2026-10-22); Netlify verificado (2026-10-23) |
| 2 | Pantallas padre y entrenador sobre Supabase | ⏳ Pendiente |
| 3 | Campanita, tareas diarias, quitar Firebase | ⏳ Pendiente |
| 4 | Publicación final en Netlify y entrega | ⏳ Pendiente |

Links: GitHub: https://github.com/nicolas25jimenez-coder/pequenos-atletas · Netlify: https://pequenos-atletas2.netlify.app · Supabase (proyecto): https://ebzbbwxgnfrawkhebwvw.supabase.co

Notas de la Fase 1 (para las siguientes ventanas):
- Migraciones `supabase/migrations/0001` y `0002` ya aplicadas (pegadas en el SQL Editor). Cada tabla: `id`, `datos jsonb` (objeto completo) y columnas reales que el servidor deriva de `datos` con triggers.
- `app/src/lib/datos.ts` ya expone `obtener, listar, guardar, guardarVarios, actualizar, agregarA, quitarDe, borrar, lote()`; `sesion.tsx` expone `usuario.uid`. Las pantallas aún importan `firebase/*` (Fase 2) y `firebase.ts`/`push.ts` se borran en la Fase 3.
- `npm run seed` recrea datos y cuentas de demo (contraseña `Atletas2026`; ej. `entrenador@pequenosatletas.co`, `carolina.rojas@ejemplo.co`). `npm run test:seguridad` (22 pruebas) pasa.
- Claves en `app/.env.local` (URL, publishable y `SUPABASE_SERVICE_ROLE_KEY`). Dev server de Fase 1 en puerto 5174 (`app-fase1` en `.claude/launch.json`); el puerto 5173 lo ocupa otra ventana.
- Netlify: las 3 variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY) ya están y el ingreso como padre y entrenador funciona en el sitio publicado. Al agregar variables hay que hacer "Clear cache and deploy site".
- Falta probar en el navegador el registro de cuenta nueva (depende de "Confirm email" en Supabase).

## Comandos útiles

- `npm install` — instala dependencias.
- `npm run dev` — abre la app en http://localhost:5173 (en Claude: `preview_start` con el nombre `app`).
- `npm test` — pruebas de la lógica (`shared/src/dominio.test.ts`).
- `npm run typecheck` — revisa errores de tipos.
- `npm run build` — arma la versión para publicar.
- `npm run test:seguridad` — pruebas de permisos contra Supabase (se crea en la Fase 1).

## Mapa del código

- `shared/src/` — lógica de negocio sin base de datos (reutilizar tal cual).
- `app/src/lib/` — conexión con la base de datos, sesión, archivos. `datos.ts` es el adaptador que usan las pantallas.
- `app/src/pantallas/acceso|padre|entrenador|comun/` — pantallas.
- `supabase/migrations/` — tablas y reglas de seguridad (se crea en la Fase 1).
- `netlify/functions/` — tareas diarias y botón "Ejecutar tareas de hoy" (Fase 3).
- `scripts/seed.ts` — datos de ejemplo y cuentas de demo.
