# Ideas del lado ENTRENADOR (entrevista del 2026-10-27)

**Lo que contó Nicolás:** usa sobre todo **tomar asistencia** y **medir/registrar pruebas**, casi siempre **en la cancha, con prisa**.
Le molestan los **botones pequeños** y que **cuesta encontrar cosas**. Quiere poder elegir **tema claro u oscuro**.

Estado: ⏳ pendiente · 🔨 en curso · ✅ hecha · 🕒 para después

| # | Idea | Qué es | Por qué | Fase | Dificultad | Estado |
|---|---|---|---|---|---|---|
| 1 | Botones grandes en la cancha | Asistencia y pruebas con botones de 44 px o más, fáciles con una mano; confirmación si se cambia algo importante | Se usa con prisa y los botones actuales son chicos | 1 (asistencia) y 2 (pruebas) | Fácil | ⏳ |
| 2 | Deshacer al marcar mal | Aviso "Marcado: Faltó · Deshacer" unos segundos | Evita errores con prisa (propuesta de Claude) | 1 | Fácil | ⏳ |
| 3 | Asistencia directa desde el inicio | Botón "Tomar asistencia" del Panel que entra de una vez (ya existe; se hace más grande y claro) | Menos toques en la cancha | 1 | Fácil | ⏳ |
| 4 | Avisos claros si falla internet | Mensaje con botón "Reintentar" en vez de pantalla vacía o ceros falsos | Hoy el Panel muestra ceros mientras carga | 1 (componente) → 2 y 3 (en cada pantalla) | Fácil | ⏳ |
| 5 | Buscador de niños a mano | Barra de búsqueda arriba en Niños | Encontrar rápido a un niño | 2 | Fácil | ⏳ |
| 6 | Tema claro / oscuro | Interruptor en "Más" que recuerda la elección. Primero se preparan los colores como variables (Fase 1) | Comodidad a pleno sol y de noche | 3 (entrenador); 6 (padre) | Media | ⏳ |
| 7 | Programas de entrenamiento | El entrenador sube Excel, PDF o Word, lo asigna a una **categoría**, y puede verlo, descargarlo y borrarlo. Los **papás de esa categoría** lo ven y descargan | Compartir el plan sin WhatsApp | 2 (entrenador: tabla, archivos y pantalla); 5 (padre ve y descarga) | Media | ⏳ |
| 8 | Aviso de orientación médica | El papá toca un botón de orientación médica; al entrenador le **llega un aviso** (campanita) y queda registro de **quién, de qué niño y cuándo**. El entrenador ve la lista | Saber qué familias necesitan apoyo médico | 3 (lista y aviso del entrenador); 4 (botón del padre) | Media | ⏳ |
| 9 | Repositorio de ejercicios | Biblioteca de ejercicios clasificada por tipo/rama. Al tocar uno: cómo hacerlo (paso a paso), video o imagen de ejemplo, **objetivo** y **adaptaciones**. Lo ven el entrenador y los papás | Tener un banco de ejercicios y compartirlo | 3 (entrenador: crear/editar); 5 (padre solo lectura) | Media-alta | ⏳ |

## Notas para el diseño
- Idea 7 y 9 usan **Supabase Storage** (archivos) y tablas nuevas → cada una lleva su migración (0006 en adelante) y
  pruebas de seguridad: el padre solo ve lo de la categoría de su hijo.
- Idea 8: el botón del padre se programa en la Fase 4 (Inicio y Más); la lista del entrenador en la Fase 3. En la Fase 3 se
  prueba con datos de ejemplo; se une todo en la Fase 4.
- Ideas 7 y 9 deben pasar a `IDEAS-PADRE.md` (lo que ve el padre) al empezar la Fase 4.

## Ideas para después
(vacío por ahora)
