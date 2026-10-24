# Pequeños Atletas

App web instalable (PWA) de seguimiento deportivo infantil (niños de 4 a 6 años) para padres de familia y entrenador: perfil del niño, perfil físico con IMC según la OMS, pruebas motrices, asistencia, pagos, eventos y anuncios. Funciona en el navegador y se puede "instalar" en el celular.

- **App publicada:** https://pequenos-atletas2.netlify.app
- **Código:** https://github.com/nicolas25jimenez-coder/pequenos-atletas
- **Especificación (v1.3):** [SPEC.md](SPEC.md) · **Plan de trabajo:** [PLAN.md](PLAN.md)
- **Diseño original:** [design/Pequenos Atletas App.dc.html](design/Pequenos%20Atletas%20App.dc.html)

## Arquitectura

| Pieza | Para qué sirve |
|---|---|
| **React + Vite + Tailwind** (`app/`) | La app que ve el usuario (PWA) |
| **Supabase** (`supabase/migrations/`) | Base de datos PostgreSQL, login (correo + contraseña) y archivos (fotos y documentos), con reglas de seguridad por rol |
| **Netlify** | Publica la app y corre las tareas programadas (`netlify/functions/`) |
| **GitHub** | Guarda el código; cada `push` a `main` publica solo en Netlify |
| `shared/src/` | Lógica de negocio sin base de datos (OMS, pagos, asistencia, pruebas), con pruebas |

Avisos: solo la **campanita** dentro de la app (no hay notificaciones push al celular).

Tareas programadas (Netlify Functions): `ciclo-nocturno` (genera cobros y estados), `recordatorios` y `ejecutar-tareas` (botón "Ejecutar tareas de hoy" del entrenador).

## Cómo correrla en tu computador

Requisito: Node.js 22 o superior.

```bash
npm install          # instala dependencias (solo la primera vez)
npm run dev          # abre la app en http://localhost:5173
npm test             # pruebas de la lógica de negocio
npm run typecheck    # revisa errores de tipos
npm run build        # arma la versión para publicar
npm run test:seguridad   # pruebas de permisos contra Supabase
npm run seed         # recrea datos y cuentas de demo
```

## Variables de entorno

Se guardan en `app/.env.local` (local) y en las variables de Netlify (publicado). Nunca van en el código ni en git. Hay un ejemplo en `app/.env.example`.

| Variable | Dónde se usa |
|---|---|
| `VITE_SUPABASE_URL` | App (navegador): dirección del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | App (navegador): clave pública (publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secreta.** Solo en tareas de Netlify, el seed y las pruebas de seguridad. Jamás en el navegador |

## Cuentas de demo

Todas usan la contraseña `Atletas2026`.

| Rol | Correo |
|---|---|
| Entrenador | entrenador@pequenosatletas.co |
| Padre de familia | carolina.rojas@ejemplo.co |

`npm run seed` crea más cuentas y datos de ejemplo.

## Estructura

- `app/src/pantallas/` — pantallas (acceso, padre, entrenador, común)
- `app/src/lib/` — conexión con Supabase, sesión, archivos (`datos.ts` es el adaptador)
- `shared/src/` — lógica de negocio probada
- `supabase/migrations/` — tablas, seguridad, campanita, invitaciones
- `netlify/functions/` — tareas programadas
- `scripts/seed.ts` — datos de ejemplo
