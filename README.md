# Pequeños Atletas

App de seguimiento deportivo infantil (4 a 6 años) para padres y entrenador: perfil del niño, perfil físico con IMC según la OMS, pruebas motrices, asistencia, pagos, eventos y anuncios. Es una app web instalable (PWA): funciona en el navegador y se puede "instalar" en el celular.

- **Especificación:** [SPEC.md](SPEC.md)
- **Diseño original:** [design/Pequenos Atletas App.dc.html](design/Pequenos%20Atletas%20App.dc.html)

## Cómo ejecutarla en tu computador (modo de prueba)

No necesitas cuenta de Google ni de Firebase. Todo corre en tu PC con datos de ejemplo.

Requisitos: Node.js 22 o superior y Java 21 (ya instalados en este equipo).

1. Instalar dependencias (solo la primera vez):
   ```bash
   npm install
   ```
2. En una terminal, arrancar los emuladores de Firebase (se dejan abiertos):
   ```bash
   npm run emulators
   ```
3. En otra terminal, cargar los datos de ejemplo (borra lo que haya y vuelve a crear todo):
   ```bash
   npm run seed
   ```
4. En otra terminal, arrancar la app:
   ```bash
   npm run dev
   ```
5. Abrir http://localhost:5173

Para probarla en tu celular, conéctalo a la misma red Wi‑Fi y abre `http://<IP-de-tu-PC>:5173` (Vite muestra la dirección al arrancar).

### Cuentas de prueba

Todas usan la contraseña `Atletas2026`.

| Rol | Correo | Qué tiene |
|---|---|---|
| Entrenador | entrenador@pequenosatletas.co | Todo |
| Acudiente | carolina.rojas@ejemplo.co | Sofía (Cachorro) y Andrés (Fiera) |
| Acudiente | jorge.rojas@ejemplo.co | Segundo acudiente de Sofía y Andrés |
| Acudiente | maria.forero@ejemplo.co | Inscripción de Lucía pendiente de aprobar |

En modo de prueba:
- **Correos (verificación y recuperación de contraseña):** no se envían. Los enlaces aparecen en la terminal de los emuladores y en http://127.0.0.1:4000/auth.
- **Notificaciones:** llegan a la campana de la app, no como push del teléfono.
- **Tareas automáticas** (cobros a medianoche, recordatorios a las 7:00 a.m.): no corren solas. El entrenador las ejecuta desde *Más → Configuración → Ejecutar tareas de hoy*.
- **Datos:** los emuladores los guardan en `.emulator-data/` al cerrarse con Ctrl+C y los recuperan al volver a abrirse.
- **Panel de los emuladores:** http://127.0.0.1:4000, para ver la base de datos, los usuarios y los archivos.

## Pruebas automáticas

```bash
npm test
```
Lógica de negocio: IMC y percentiles OMS, ciclos de pago, asistencia y pruebas.

```bash
npm run test:rules
```
Reglas de seguridad (requiere los emuladores encendidos): cada familia ve solo a sus hijos, los cambios requieren aprobación y no se suben fotos sin autorización.

## Estructura

```
app/        App web (React + TypeScript + Vite + Tailwind), PWA
  src/pantallas/acceso/      Ingreso, registro, verificación
  src/pantallas/padre/       App del acudiente
  src/pantallas/entrenador/  App del entrenador
  src/pdf/                   Informe PDF de progreso
functions/  Cloud Functions: notificaciones y tareas diarias
shared/     Lógica de negocio compartida + tablas OMS (con tests)
scripts/    Datos de ejemplo y lanzador de emuladores
tests/      Pruebas de las reglas de seguridad
firestore.rules, storage.rules   Seguridad de datos y archivos
```

## Pasar a producción (cuando decidas publicar)

1. Crea un proyecto en https://console.firebase.google.com con tu cuenta de Google.
2. Activa **Authentication** (correo/contraseña), **Firestore**, **Storage** y **Cloud Messaging**.
3. Cambia al plan **Blaze** (pago por uso; pide tarjeta, pero con menos de 200 niños el costo esperado es de USD 0–5 al mes). Es necesario para las Cloud Functions y las tareas programadas.
4. Registra una app web en el proyecto, copia la configuración en `app/.env.local` (usa `app/.env.example` como guía) y genera la clave **VAPID** para notificaciones push.
5. Cambia `demo-pequenos-atletas` por el ID de tu proyecto en `.firebaserc`.
6. Ejecuta:
   ```bash
   npx firebase login
   ```
   ```bash
   npm run build
   ```
   ```bash
   npx firebase deploy
   ```
7. Crea tu usuario de entrenador: regístrate en la app y luego, en la consola de Firestore, cambia el campo `rol` de tu documento en `usuarios` a `entrenador`.
8. Carga las categorías, los medios de pago y revisa las referencias de las pruebas desde la app.

## Pendientes antes de publicar

- **Textos legales:** los Términos y la Política de datos (`app/src/pantallas/acceso/Terminos.tsx`) son una plantilla. Debe revisarlos un abogado (Ley 1581 de 2012).
- **Referencias de las pruebas:** las del catálogo base son provisionales. Ajústalas en *Más → Catálogo de pruebas*.
- **Logo:** se usa el logotipo de texto. Reemplaza `app/public/icono*.png` y `icono.svg` cuando tengas el logo definitivo.
- **WhatsApp del entrenador:** configúralo en *Más → Configuración*.
