# SPEC — App de Seguimiento Deportivo Infantil (4 a 6 años)

> **Versión:** 1.1 (borrador) · **Fecha:** 2026-10-22 · **Autor:** Nicolás Jiménez (entrenador)
> **Nombre comercial:** **Pequeños Atletas**
> **Enfoque:** formación multidisciplinar y predeportiva (sin especialización en un deporte)
> **País / moneda:** Colombia · COP

---

## 0. Resumen de decisiones tomadas

| Tema | Decisión |
|---|---|
| Plataforma | App móvil (Android + iOS) **y** web, con una sola base de código |
| Entrenadores | **Uno solo** (el entrenador es también el administrador) |
| Registro | **El padre se registra solo**; el entrenador aprueba y asigna categoría |
| Cuentas | Un padre puede tener **varios hijos**; un niño puede tener **varios acudientes** con cuenta propia |
| Categorías | **Libres / personalizadas**, creadas por el entrenador |
| Pagos | **Solo recordatorio** con los medios de pago; el entrenador marca manualmente quién pagó |
| Fecha de cobro | **Según la fecha de inscripción** de cada niño |
| Tarifa | **Por categoría**, con **descuento ajustable por niño** |
| Asistencia | Solo niños de la categoría; estados **Asistió / Faltó / Excusa / Retardo**; editable por el entrenador; cada estado con **indicador independiente**; las excusas solo las registra el entrenador |
| Casos especiales de cobro | Prorrateos, congelaciones o meses no asistidos los **maneja el entrenador manualmente** (sin reglas automáticas) |
| Publicación en tiendas | **No por ahora**; la estrategia de lanzamiento se definirá más adelante |
| Pruebas motrices | **Catálogo base + pruebas propias**; el resultado depende del tipo de prueba |
| Lo que ve el padre en pruebas | Valor + observación, gráficas de progreso, comparación con referencia, fotos/videos |
| IMC | Valor + **percentil/clasificación OMS** por edad y sexo |
| Perfil extra | Foto, datos de salud, documentos, consentimientos (Ley 1581) |
| Edición de datos | **El padre propone cambios y el entrenador aprueba** |
| Comunicación | **Botón a WhatsApp** del entrenador (sin chat interno) |
| Publicación de sesiones | **Al guardar se publica al instante** |
| Notificaciones | Pago mensual, evento próximo, inasistencia, anuncios generales |
| Eventos | Días de control, torneos/festivales, actividades especiales, **con confirmación de asistencia** |
| Retiro del niño | **Se inactiva y se conserva**; el padre mantiene acceso de solo lectura |
| Reportes | Pagos del mes, asistencia, informe PDF por niño, exportar a Excel |

---

## 1. Visión y objetivos

### 1.1 Problema
Los padres no tienen visibilidad del progreso físico y motriz de sus hijos, ni un registro claro de asistencia y pagos. El entrenador lleva la información en papel, WhatsApp o Excel, lo que dificulta el seguimiento y el cobro.

### 1.2 Objetivo
Una app donde:
- **El padre/acudiente** inicia sesión con su correo y consulta todo sobre su hijo: datos personales, perfil físico (talla, peso, IMC), pruebas motrices con su objetivo y resultado, historial con fechas, asistencia, pagos y eventos.
- **El entrenador** gestiona niños, categorías, sesiones, asistencia, pruebas, eventos, anuncios y pagos desde el celular o el computador.

### 1.3 Métricas de éxito
- 100 % de los niños activos con perfil completo en el primer mes.
- Asistencia registrada en menos de 2 minutos por sesión.
- Reducción de pagos atrasados (meta: < 15 % de pagos vencidos a 10 días).
- ≥ 80 % de los padres abren la app al menos una vez al mes.

---

## 2. Roles y permisos

| Acción | Padre / Acudiente | Entrenador (Admin) |
|---|---|---|
| Registrarse e iniciar sesión | ✅ | ✅ (cuenta creada en la configuración inicial) |
| Registrar un hijo (solicitud de inscripción) | ✅ | ✅ |
| Aprobar inscripción y asignar categoría | ❌ | ✅ |
| Ver perfil de sus hijos | ✅ (solo los suyos) | ✅ (todos) |
| Editar datos personales del niño | 🟡 Propone cambio → requiere aprobación | ✅ Directo |
| Registrar medidas físicas (talla, peso) | ❌ | ✅ |
| Crear/editar categorías y tarifas | ❌ | ✅ |
| Crear sesiones y marcar asistencia | ❌ | ✅ |
| Crear pruebas y registrar resultados | ❌ | ✅ |
| Ver resultados, gráficas, historial | ✅ | ✅ |
| Crear eventos y anuncios | ❌ | ✅ |
| Confirmar asistencia a eventos | ✅ | ✅ (puede marcar por el padre) |
| Marcar pago como recibido | ❌ | ✅ |
| Ver estado de pagos | ✅ (los suyos) | ✅ (todos) |
| Invitar a otro acudiente | ✅ (para sus hijos) | ✅ |
| Descargar informe PDF del niño | ✅ | ✅ |
| Reportes y exportar a Excel | ❌ | ✅ |
| Inactivar / reactivar niño | ❌ (puede solicitar retiro) | ✅ |

---

## 3. Arquitectura y tecnología recomendada

> Recomendación pensada para **un solo entrenador**, bajo costo y una sola base de código para móvil y web.

| Capa | Tecnología | Motivo |
|---|---|---|
| App (Android, iOS, Web) | **Flutter** | Un solo código para las 3 plataformas |
| Autenticación | **Firebase Authentication** (correo + contraseña, verificación de correo, recuperación de contraseña) | Gratis, simple |
| Base de datos | **Cloud Firestore** | Tiempo real, reglas de seguridad por rol |
| Archivos (fotos, videos, documentos) | **Firebase Storage** | Integrado con reglas de seguridad |
| Notificaciones push | **Firebase Cloud Messaging (FCM)** | Gratis, Android/iOS/Web |
| Tareas programadas (cobro mensual, recordatorios) | **Cloud Functions** + Cloud Scheduler | Requiere plan Blaze (pago por uso, con cuota gratuita generosa) |
| Generación de PDF | Cloud Function o paquete `pdf` de Flutter | Informe por niño |
| Exportación Excel | Cloud Function (librería `exceljs`) o paquete `excel` de Flutter | Reportes |
| Correo transaccional (verificación, aprobación) | Firebase Auth + extensión "Trigger Email" (SendGrid/Mailgun) | Opcional |

**Alternativa:** Supabase (PostgreSQL) + Edge Functions + FCM. Válida si prefieres SQL; Firebase es más directo para push y tiempo real.

**Costos estimados (aprox.):**
- Durante el desarrollo: **USD 0**. Se prueba en la web local, en el emulador de Android y en tu celular (instalación directa del APK), sin publicar en tiendas.
- Firebase: probablemente USD 0–5/mes para < 200 niños.
- *Solo cuando se decida publicar (ver §11, Fase 4):* Google Play USD 25 (pago único), Apple USD 99/año y dominio web ~COP 50.000/año.

### 3.1 Identidad visual — Pequeños Atletas
| Token | Color | HEX (propuesto) | Uso |
|---|---|---|---|
| `primario` | Azul rey | `#1F4FD8` | Barra superior, botones principales, encabezados |
| `primarioOscuro` | Azul rey oscuro | `#123A9E` | Texto sobre fondo claro, estados presionados |
| `secundario` | Verde | `#2BB24C` | Indicadores positivos, "Asistió", "Al día", acentos |
| `secundarioOscuro` | Verde oscuro | `#1E8A39` | Texto verde con contraste AA |
| `fondo` | Blanco / gris muy claro | `#F6F8FC` | Fondo de pantallas |
| `texto` | Gris carbón | `#1B2333` | Texto principal |

- Colores de estado (independientes de la marca): Faltó `#E5484D`, Retardo `#F5A524`, Excusa `#3E9BFF`, Cancelada `#9AA4B2`.
- **Logo:** aún no existe. Mientras tanto se usa un **logotipo de texto** "Pequeños Atletas" en azul rey con un acento verde (ej. un ícono simple de niño corriendo o una estrella). Se reemplaza cuando haya un logo definitivo.
- Tipografía sugerida: *Nunito* o *Baloo 2* (redondeadas, amigables para un público infantil y familiar).

---

## 4. Modelo de datos

> Nomenclatura en español para facilitar el mantenimiento. `id` autogenerado. Todas las entidades tienen `creadoEn`, `actualizadoEn`, `creadoPor`.

### 4.1 `usuarios`
| Campo | Tipo | Notas |
|---|---|---|
| id | string | = UID de Firebase Auth |
| rol | enum | `padre` \| `entrenador` |
| nombres, apellidos | string | |
| correo | string | único, verificado |
| telefono | string | formato +57 |
| tipoDocumento, numeroDocumento | string | del acudiente |
| parentesco | enum | Madre, Padre, Abuelo/a, Tío/a, Otro |
| fcmTokens | string[] | un token por dispositivo |
| preferenciasNotificacion | map | ver §9.3 |
| aceptoTerminos, aceptoTratamientoDatos | bool + fecha + versión | |
| estado | enum | `activo` \| `bloqueado` |

### 4.2 `ninos`
| Campo | Tipo | Notas |
|---|---|---|
| id | string | |
| nombres, apellidos | string | nombre completo |
| fechaNacimiento | date | edad calculada automáticamente (años y meses) |
| sexo | enum | `M` \| `F` (requerido para percentiles OMS) |
| tipoDocumento, numeroDocumento | string | RC / TI |
| fotoUrl | string | |
| tallaUniforme | enum | ej. 4, 6, 8, 10, XS, S… (lista configurable) |
| tallaCalzado | string | opcional |
| categoriaId | ref | asignada por el entrenador |
| acudientes | array de {usuarioId, parentesco, esPrincipal} | quién tiene acceso |
| contactos | array de {nombre, parentesco, telefono, esEmergencia, puedeRecoger} | incluye personas sin cuenta |
| seguroMedico | map | {tipo: EPS / Prepagada / Póliza estudiantil / Otro, entidad, numeroAfiliacion, telefonoEntidad, carnetUrl} |
| salud | map | {tipoSangre, alergias, condicionesMedicas, medicamentos, restriccionesActividad, observaciones} |
| documentos | array de {tipo, url, fecha, vence} | identidad, carné, certificado médico |
| consentimientos | map | {tratamientoDatos, usoImagen, autorizacionActividadFisica} con fecha, versión y firmante |
| fechaInscripcion | date | **define el día de cobro mensual** |
| tarifa | map | {descuentoTipo: `porcentaje`\|`valor`, descuento, motivo, vigenteHasta} |
| estado | enum | `pendiente_aprobacion` \| `activo` \| `inactivo` \| `rechazado` |
| motivoInactivacion, fechaInactivacion | string, date | |

### 4.3 `categorias`
| Campo | Tipo | Notas |
|---|---|---|
| id, nombre | string | ej. "Pequeños Leones" |
| descripcion | string | |
| rangoEdad | {min, max} | **solo referencial**, no restrictivo |
| horarios | array de {diaSemana, horaInicio, horaFin, lugar} | |
| valorMensual | number (COP) | |
| cupoMaximo | number | opcional |
| color | string | para identificarla en la app |
| activa | bool | |

### 4.4 `medicionesFisicas` (historial)
| Campo | Tipo | Notas |
|---|---|---|
| ninoId, sesionId (opcional) | ref | |
| fecha | date | |
| tallaCm | number | |
| pesoKg | number | |
| imc | number | calculado: peso / (talla m)² |
| edadMeses | number | edad en la fecha de medición |
| zScoreImc, percentilImc | number | calculados con tablas OMS |
| clasificacionImc | enum | ver §7.4 |
| observaciones | string | |

### 4.5 `pruebas` (catálogo)
| Campo | Tipo | Notas |
|---|---|---|
| id, nombre | string | |
| familia | enum | `locomocion` \| `equilibrio` \| `manipulacion_manos` \| `manipulacion_pies` (ver §7.3) |
| capacidad | enum | Velocidad, Agilidad, Fuerza, Coordinación, Equilibrio, Flexibilidad, Precisión |
| objetivo | string | **lo que el padre leerá**: qué mide y por qué |
| deportesRelacionados | string[] | deportes a los que acerca esta habilidad (ej. atletismo, fútbol, baloncesto, gimnasia, natación); se muestra al padre como "Esta habilidad prepara para…" |
| descripcion / protocolo | string | cómo se realiza |
| materiales | string | |
| tipoResultado | enum | `tiempo` \| `distancia` \| `repeticiones` \| `aciertos` \| `cualitativa` |
| unidad | string | s, cm, m, reps, aciertos/N |
| mejorEs | enum | `mayor` \| `menor` (ej. en tiempo, menor es mejor) |
| intentos | number | cuántos intentos se registran; se guarda el mejor o el promedio (configurable) |
| escalaCualitativa | string[] | ej. Logrado / En proceso / Por mejorar |
| referencias | array de {edadMin, edadMax, sexo, valorBajo, valorEsperado, valorAlto} | para "comparación con referencia" |
| mediaEjemploUrl | string | video/imagen de cómo se hace (opcional) |
| esDelCatalogoBase | bool | |
| activa | bool | |

### 4.6 `sesiones`
| Campo | Tipo | Notas |
|---|---|---|
| id | string | |
| tipo | enum | `entrenamiento` \| `control` |
| categoriaId | ref | |
| fecha, horaInicio, horaFin, lugar | | |
| tema / objetivoSesion | string | opcional, visible al padre |
| pruebasSeleccionadas | ref[] | solo si tipo = `control` |
| notasGenerales | string | |
| estado | enum | `programada` \| `realizada` \| `cancelada` |
| motivoCancelacion | string | |

### 4.7 `asistencias`
| Campo | Tipo | Notas |
|---|---|---|
| sesionId, ninoId | ref | clave única compuesta |
| estado | enum | `asistio` \| `falto` \| `excusa` \| `retardo` |
| minutosRetardo | number | opcional |
| observacion | string | ej. motivo de la excusa |
| historialCambios | array de {estadoAnterior, estadoNuevo, fecha, usuarioId} | auditoría de ediciones |

### 4.8 `resultadosPruebas`
| Campo | Tipo | Notas |
|---|---|---|
| sesionId, ninoId, pruebaId | ref | |
| fecha | date | |
| intentos | number[] | valores de cada intento |
| valorFinal | number \| string | mejor/promedio o valor cualitativo |
| comparacionReferencia | enum | `por_debajo` \| `esperado` \| `por_encima` (calculado) |
| observacion | string | comentario del entrenador |
| medios | array de {tipo: foto/video, url, miniaturaUrl} | |
| noRealizada | bool + motivo | ej. ausente, lesión |

### 4.9 `pagos`
| Campo | Tipo | Notas |
|---|---|---|
| ninoId | ref | |
| periodo | string | ej. "2026-11" (ciclo que inicia en el día de inscripción) |
| fechaInicioCiclo, fechaVencimiento | date | |
| valorBase, descuento, valorAPagar | number (COP) | se congela al generarse; el entrenador puede **ajustar `valorAPagar` manualmente** |
| ajusteManual | map | {valorAnterior, valorNuevo, motivo, fecha} — para prorrateos, congelaciones, etc. |
| estado | enum | `pendiente` \| `pagado` \| `vencido` \| `exonerado` \| `congelado` |
| fechaPago, medioPago, referencia | | registrados por el entrenador |
| notas | string | |
| recordatoriosEnviados | array de fechas | |

### 4.10 `mediosPago` (configuración)
`{nombre: Nequi | Daviplata | Bancolombia | Efectivo | Otro, titular, numero / llave, tipoCuenta, qrUrl, instrucciones, activo}`

### 4.11 `eventos`
| Campo | Tipo | Notas |
|---|---|---|
| tipo | enum | `control` \| `torneo` \| `actividad_especial` |
| titulo, descripcion, lugar, ubicacionMapsUrl | | |
| fechaInicio, fechaFin | datetime | |
| categoriasIds | ref[] | o "todas" |
| requiereConfirmacion | bool | |
| fechaLimiteConfirmacion | datetime | |
| costo | number | opcional |
| recordatorios | number[] | ej. [7, 1] días antes (configurable) |
| imagenUrl | string | |

### 4.12 `confirmacionesEvento`
`{eventoId, ninoId, respuesta: asistira | no_asistira | sin_respuesta, respondidoPor, fecha, comentario}`

### 4.13 `anuncios`
`{titulo, mensaje, destinatarios: todas | categoriasIds[] | ninosIds[], imagenUrl, adjuntoUrl, fijado, fechaPublicacion, fechaExpiracion, enviarPush}`

### 4.14 `solicitudesCambio`
`{ninoId, solicitadoPor, campo, valorActual, valorPropuesto, estado: pendiente | aprobado | rechazado, comentarioEntrenador, fechaResolucion}`

### 4.15 `notificaciones` (bandeja interna)
`{usuarioId, tipo, titulo, cuerpo, referencia {tipo, id}, leida, fecha}`

### 4.16 `configuracion` (documento único)
`{nombreEscuela, logoUrl, colores, telefonoWhatsApp, correoContacto, diasRecordatorioPago, horaEnvioNotificaciones, politicaDatosUrl, terminosUrl, tallasUniforme[]}`

---

## 5. Requisitos funcionales — App del Padre / Acudiente

### 5.1 Registro e inicio de sesión
- **RF-P01** Registro con nombres, apellidos, correo, teléfono, documento, parentesco y contraseña (mín. 8 caracteres).
- **RF-P02** Verificación de correo obligatoria antes de usar la app.
- **RF-P03** Aceptación de Términos y de la Política de Tratamiento de Datos (Ley 1581/2012), guardando fecha y versión.
- **RF-P04** Inicio de sesión con correo y contraseña; "Recordarme"; recuperación de contraseña por correo.
- **RF-P05** Cerrar sesión y eliminar el token de notificaciones del dispositivo.

### 5.2 Inscripción de un hijo
- **RF-P06** Asistente de inscripción en pasos:
  1. Datos del niño (nombres, apellidos, fecha de nacimiento, sexo, documento, foto).
  2. Talla de uniforme.
  3. Contactos: acudientes, teléfono, contacto de emergencia, personas autorizadas para recogerlo.
  4. Seguro médico (tipo, entidad, número, foto del carné).
  5. Salud (tipo de sangre, alergias, condiciones, medicamentos, restricciones).
  6. Documentos (identidad, certificado médico).
  7. Consentimientos: tratamiento de datos del menor, uso de imagen (sí/no, independiente), autorización para la actividad física.
- **RF-P07** Al enviar, el niño queda en estado **"Pendiente de aprobación"** y el entrenador recibe una notificación.
- **RF-P08** El padre ve el estado de la solicitud; si es rechazada, ve el motivo.
- **RF-P09** El padre puede inscribir **varios hijos** con la misma cuenta.
- **RF-P10** El padre puede **invitar a otro acudiente** por correo; al registrarse con ese correo, el invitado queda vinculado al niño.

### 5.3 Inicio (Dashboard)
- **RF-P11** Selector de hijo (si tiene más de uno), con foto y nombre.
- **RF-P12** Tarjetas de resumen:
  - Próxima sesión / evento (fecha, hora, lugar).
  - Estado del pago del mes (Al día / Pendiente / Vencido) con días restantes.
  - Asistencia del mes (Asistió / Retardo / Excusa / Faltó, por separado).
  - Últimos resultados publicados.
  - Último anuncio.
- **RF-P13** Botón flotante **"Escribir al entrenador"** que abre WhatsApp (`https://wa.me/57XXXXXXXXXX?text=...`) con el nombre del niño ya escrito.

### 5.4 Perfil del niño
- **RF-P14** Pestaña **Datos**: nombre completo, edad (años y meses), fecha de nacimiento, documento, categoría (nombre, horario, lugar), fecha de inscripción, talla de uniforme, acudientes y teléfonos, contactos de emergencia, seguro médico, salud, documentos (ver/descargar), consentimientos.
- **RF-P15** Botón **"Solicitar cambio"** en cada sección editable. Muestra el valor actual y el propuesto, y queda "Pendiente" hasta que el entrenador apruebe. Los campos bloqueados para el padre son: categoría, medidas físicas, resultados, asistencia y pagos.
- **RF-P16** Pestaña **Perfil físico**:
  - Última medición: talla (cm), peso (kg), IMC, clasificación OMS con un lenguaje amable (ver §7.4) y fecha.
  - Gráficas de evolución de talla, peso e IMC en el tiempo, con las curvas OMS de fondo (percentiles 3, 15, 50, 85, 97).
  - Tabla de historial de mediciones con fechas.
- **RF-P17** Pestaña **Pruebas motrices**:
  - Lista de pruebas realizadas, agrupadas por familia de habilidad (§7.3), y el gráfico de radar del perfil multidisciplinar.
  - Detalle de cada prueba: **nombre, objetivo (qué mide y por qué es importante), cómo se realiza**, video/imagen de ejemplo.
  - Resultado de cada fecha: valor, unidad, comparación con la referencia (Por debajo / Esperado / Por encima, mostrado como indicador visual, nunca como "malo"), observación del entrenador, fotos/videos.
  - Gráfica de progreso por prueba (valor vs. fecha) con la franja de referencia para su edad.
  - Indicador de mejora respecto a la evaluación anterior (↑ / ↓ / =, teniendo en cuenta `mejorEs`).
- **RF-P18** Pestaña **Historial**: línea de tiempo cronológica con todo lo realizado (sesiones, días de control, mediciones, pruebas, eventos), filtrable por tipo y rango de fechas.
- **RF-P19** Descargar el **informe PDF de progreso** del niño (ver §8.6).

### 5.5 Asistencia
- **RF-P20** Calendario mensual con cada sesión coloreada según el estado: Asistió (verde), Retardo (amarillo), Excusa (azul), Faltó (rojo), Cancelada (gris).
- **RF-P21** Lista de sesiones con fecha, tipo (Entrenamiento / Control), estado y observación.
- **RF-P22** Estadísticas del mes, del trimestre y total: **cuatro indicadores independientes** (Asistió, Retardo, Excusa, Faltó), cada uno con su conteo y su porcentaje (ver §7.5).
- **RF-P22b** El padre **no** puede reportar excusas desde la app; las registra únicamente el entrenador (el padre puede avisarle por WhatsApp).

### 5.6 Pagos
- **RF-P23** Estado del mes en curso: valor, descuento aplicado, total a pagar, fecha de vencimiento y estado.
- **RF-P24** **Medios de pago disponibles**: nombre, titular, número/llave, código QR, instrucciones y botón "Copiar número".
- **RF-P25** Historial de pagos por periodo con estado, fecha de pago y medio.
- **RF-P26** Botón "Ya pagué, avisar al entrenador" que abre WhatsApp con un mensaje predefinido (periodo, valor, nombre del niño). *(No sube comprobante, porque la decisión fue "solo recordatorio").*

### 5.7 Eventos
- **RF-P27** Lista de próximos eventos de la categoría del niño (o generales) con tipo, fecha, lugar, enlace a Google Maps y costo.
- **RF-P28** Confirmar asistencia por cada hijo: **Asistirá / No asistirá**, con comentario opcional, hasta la fecha límite.
- **RF-P29** Agregar el evento al calendario del teléfono (archivo .ics).

### 5.8 Anuncios y notificaciones
- **RF-P30** Bandeja de anuncios (fijados arriba).
- **RF-P31** Centro de notificaciones con marcado de leídas.
- **RF-P32** Preferencias: activar o desactivar cada tipo de notificación, excepto las de pago y anuncios críticos.

### 5.9 Cuenta
- **RF-P33** Editar sus propios datos (nombre, teléfono). El correo se cambia con verificación.
- **RF-P34** Solicitar el retiro del niño (el entrenador lo procesa).
- **RF-P35** Solicitar la eliminación de la cuenta / ejercer derechos de habeas data.

---

## 6. Requisitos funcionales — Interfaz del Entrenador

### 6.1 Panel principal
- **RF-E01** Resumen del día: sesiones de hoy, inscripciones pendientes de aprobar, solicitudes de cambio pendientes, pagos vencidos, próximos eventos con el conteo de confirmaciones.
- **RF-E02** Accesos rápidos: "Iniciar sesión de hoy", "Nueva sesión", "Nuevo anuncio", "Nuevo evento".

### 6.2 Gestión de niños
- **RF-E03** Lista de niños con búsqueda y filtros (categoría, estado, pago al día o vencido, asistencia baja).
- **RF-E04** **Aprobar inscripción**: revisar los datos enviados por el padre → **asignar una categoría existente** → (opcional) ajustar la fecha de inscripción y el descuento → Aprobar o Rechazar con motivo. Al aprobar se generan el ciclo de pago y la notificación al padre.
- **RF-E05** Crear un niño directamente (por si el padre no tiene smartphone) y vincularlo después a un acudiente por correo.
- **RF-E06** Ver la ficha completa del niño (las mismas pestañas que el padre + datos internos).
- **RF-E07** Editar cualquier dato sin aprobación.
- **RF-E08** Cambiar de categoría (queda en el historial, con fecha).
- **RF-E09** Registrar una **medición física** (talla, peso → IMC y percentil automáticos). Se permite hacerlo en lote para toda la categoría.
- **RF-E10** Configurar el **descuento** del niño (% o valor fijo, motivo, vigencia).
- **RF-E11** Inactivar (motivo: retiro voluntario, cambio de escuela, edad, otro) y reactivar. Un niño inactivo no genera cobros ni aparece en las listas de asistencia; el padre conserva acceso de **solo lectura**.
- **RF-E12** Alerta cuando un niño supera el rango de edad de su categoría (sugerencia, no automática).

### 6.3 Solicitudes de cambio
- **RF-E13** Bandeja de solicitudes: valor actual vs. propuesto → Aprobar / Rechazar con comentario. El padre recibe una notificación con el resultado.

### 6.4 Categorías y tarifas
- **RF-E14** CRUD de categorías: nombre, descripción, rango de edad referencial, horarios (día, hora, lugar), valor mensual, cupo, color.
- **RF-E15** Un cambio de tarifa aplica **a partir del siguiente ciclo**; los pagos ya generados no cambian.
- **RF-E16** No se puede eliminar una categoría con niños activos (solo inactivarla).

### 6.5 Sesiones y asistencia
- **RF-E17** Crear una sesión: **tipo (Entrenamiento o Día de control)**, categoría, fecha, hora y lugar (precargados desde el horario de la categoría), tema/objetivo.
- **RF-E18** (Opcional) Generar automáticamente las sesiones del mes a partir de los horarios de la categoría.
- **RF-E19** **Pantalla de asistencia**: lista de los niños activos de la categoría, con foto, y botones rápidos **Asistió / Faltó / Excusa / Retardo**. Botón "Marcar todos como Asistió" y luego ajustar las excepciones. Observación opcional por niño.
- **RF-E20** Al **guardar**, la asistencia se **publica al instante** a los padres y se disparan las notificaciones de inasistencia (§9).
- **RF-E21** La asistencia es **editable** después de guardada; cada cambio queda en la auditoría (`historialCambios`) y, si pasa a "Faltó", se notifica.
- **RF-E22** Cancelar una sesión con motivo → notifica a los padres de la categoría.
- **RF-E23** Durante la sesión, mostrar un aviso de alergias/condiciones de salud de los niños presentes (icono ⚠️).

### 6.6 Día de control y pruebas motrices
- **RF-E24** En una sesión de tipo **Control**, el entrenador **selecciona las pruebas** a realizar desde el catálogo (o usa una "plantilla de control" guardada).
- **RF-E25** **Captura de resultados**, en dos modos:
  - *Por prueba*: se elige una prueba y se registran todos los niños en secuencia (ideal en la cancha).
  - *Por niño*: se elige un niño y se registran todas sus pruebas.
  - Campos según el tipo: cronómetro integrado (tiempo), teclado numérico (distancia, repeticiones, aciertos), botones (cualitativa). Varios intentos por prueba.
  - Observación y fotos/videos por resultado (si el niño tiene autorizado el uso de imagen; si no, se bloquea la carga).
  - Marcar "No realizó" con motivo.
- **RF-E26** En la misma sesión se pueden registrar las **mediciones físicas** (talla y peso).
- **RF-E27** La asistencia del día de control se marca igual que en un entrenamiento (§6.5).
- **RF-E28** Al **guardar**, los resultados se **publican al instante** y aparecen en el perfil del niño; se envía la notificación "Nuevos resultados disponibles".
- **RF-E29** Los resultados se pueden editar después (con auditoría).

### 6.7 Catálogo de pruebas
- **RF-E30** Ver el catálogo base (§7.3) y crear, editar, duplicar o inactivar pruebas propias: nombre, capacidad, **objetivo**, protocolo, materiales, tipo de resultado, unidad, mejor es mayor/menor, intentos, escala cualitativa, **valores de referencia por edad y sexo**, video/imagen de ejemplo.
- **RF-E31** Plantillas de control: un grupo de pruebas que se reutiliza (ej. "Evaluación inicial", "Evaluación semestral").

### 6.8 Pagos
- **RF-E32** Vista de pagos del mes: por niño, el valor, el estado y los días de atraso. Filtros por estado y categoría.
- **RF-E33** **Marcar como pagado**: fecha, medio, referencia y nota. Se puede deshacer. Opción de **exonerar** con motivo.
- **RF-E33b** **Gestión manual de casos especiales**: el entrenador puede ajustar el valor de un ciclo (prorrateo), **congelar** un ciclo (no se cobra y no se envían recordatorios) o mover la fecha de cobro de un niño. Cada ajuste pide un motivo y queda en la auditoría. La app no aplica reglas automáticas para estos casos.
- **RF-E34** Configurar los medios de pago (§4.10) y los días de recordatorio.
- **RF-E35** Enviar manualmente un recordatorio a un padre (push + botón de WhatsApp).

### 6.9 Eventos y anuncios
- **RF-E36** CRUD de eventos (§4.11), con destinatarios por categoría, confirmación y recordatorios.
- **RF-E37** Ver las confirmaciones: asistirán / no asistirán / sin respuesta; recordar a los que no han respondido.
- **RF-E38** Un evento de tipo "Control" puede vincularse a la sesión de control correspondiente.
- **RF-E39** Crear anuncios para todos, para categorías o para niños específicos, con imagen o adjunto; opción de enviar push y de fijar.

### 6.10 Reportes
- **RF-E40** **Pagos del mes**: pagados, pendientes, vencidos, exonerados, total recaudado vs. esperado, por categoría.
- **RF-E41** **Asistencia**: los 4 indicadores (§7.5) por niño y por categoría en un rango de fechas; niños con muchas faltas (umbral configurable de `% Faltó`, ej. > 40 %).
- **RF-E42** **Informe PDF por niño** (§8.6), individual o en lote para una categoría.
- **RF-E43** **Exportar a Excel (.xlsx)**: niños, asistencia, resultados de pruebas, mediciones, pagos.

### 6.11 Configuración
- **RF-E44** Datos de la escuela: nombre, logo, colores, teléfono de WhatsApp, correo, políticas.
- **RF-E45** Lista de tallas de uniforme, horas de envío de notificaciones y días de recordatorio.

---

## 7. Reglas de negocio

### 7.1 Inscripción y estados del niño
```
[Padre envía] → pendiente_aprobacion ──(entrenador aprueba + asigna categoría)──→ activo
                         └──(rechaza con motivo)──→ rechazado
activo ──(inactivar)──→ inactivo ──(reactivar)──→ activo
```
- Solo los niños **activos** aparecen en la asistencia y generan cobros.
- La **fecha de inscripción** es la fecha de aprobación, salvo que el entrenador la ajuste.

### 7.2 Ciclo de pago (según la fecha de inscripción)
- El día de cobro = el día del mes de `fechaInscripcion`. Si ese día no existe en el mes (29, 30, 31), se usa **el último día del mes**.
- Cada ciclo se genera automáticamente (Cloud Function diaria a las 00:05 hora Colombia) **el día de cobro**, con `valorAPagar = valorMensual(categoría) − descuento vigente`.
- `fechaVencimiento` = día de cobro + **N días de gracia** (configurable, propuesto: 5).
- Estados: `pendiente` → `pagado` (lo marca el entrenador) | `vencido` (automático al pasar el vencimiento) | `exonerado` | `congelado`.
- **Inscripciones a mitad de ciclo, ausencias de un mes, vacaciones, etc.:** sin reglas automáticas; el entrenador las resuelve a mano (RF-E33b).
- **Recordatorios** (push + bandeja), configurables:
  - 3 días antes del día de cobro: "Se acerca el pago de [mes] de [niño]".
  - El día de cobro: "Hoy inicia el periodo de pago… Medios disponibles: …".
  - (Opcional) El día de vencimiento y cada N días mientras siga pendiente.
- Al marcarlo como pagado se cancelan los recordatorios pendientes de ese ciclo.
- Hermanos: cada niño tiene su propio ciclo; el padre ve todos en la pestaña de Pagos.
- Al inactivar un niño, no se generan más ciclos; los pendientes quedan visibles.

### 7.3 Catálogo base de pruebas motrices (propuesto para 4–6 años)

**Enfoque Pequeños Atletas:** formación **multidisciplinar y predeportiva**. Las pruebas evalúan **habilidades motrices básicas** (locomoción, equilibrio, manipulación de objetos y capacidades físicas básicas) que sirven de base para muchos deportes, sin especializar al niño en ninguno. Cada prueba indica a qué deportes acerca, para que el padre entienda su valor.

Las pruebas se agrupan en **4 familias de habilidades**:

**A. Locomoción (desplazarse)**
| # | Prueba | Objetivo (texto para el padre) | Tipo / unidad | Mejor es | Prepara para |
|---|---|---|---|---|---|
| 1 | Carrera de velocidad 10 m | Mide la rapidez para desplazarse en línea recta y reaccionar a una señal. | Tiempo (s) | Menor | Atletismo, fútbol, baloncesto |
| 2 | Carrera en zigzag (conos) | Mide la agilidad para cambiar de dirección rápido sin perder el control. | Tiempo (s) | Menor | Fútbol, baloncesto, tenis, rugby |
| 3 | Salto largo con pies juntos | Evalúa la potencia de las piernas y la coordinación del impulso con los brazos. | Distancia (cm) | Mayor | Atletismo, voleibol, baloncesto |
| 4 | Saltos en un pie (pata coja) | Mide la coordinación y la fuerza al saltar sobre una sola pierna. | Repeticiones seguidas | Mayor | Atletismo, danza, patinaje |
| 5 | Saltos laterales (15 s) | Evalúa la coordinación y el ritmo al saltar de lado a lado. | Repeticiones | Mayor | Tenis, baloncesto, deportes de raqueta |
| 6 | Galope / desplazamiento lateral | Evalúa el patrón de desplazamiento lateral y su coordinación. | Cualitativa | — | Baloncesto, tenis, artes marciales |

**B. Equilibrio y control corporal**
| # | Prueba | Objetivo (texto para el padre) | Tipo / unidad | Mejor es | Prepara para |
|---|---|---|---|---|---|
| 7 | Equilibrio en un pie | Mide cuánto tiempo mantiene el equilibrio sobre un pie. | Tiempo (s), máx. 30 | Mayor | Gimnasia, patinaje, artes marciales |
| 8 | Caminar sobre una línea/viga | Evalúa el control del cuerpo mientras se desplaza por una superficie estrecha. | Pasos sin salirse (máx. 10) | Mayor | Gimnasia, escalada, patinaje |
| 9 | Rollo adelante | Evalúa la conciencia corporal y la coordinación al girar. | Cualitativa | — | Gimnasia, judo, natación (volteos) |
| 10 | Flexibilidad (sentado y alcanzar) | Mide la flexibilidad de la espalda y de la parte posterior de las piernas. | Distancia (cm) | Mayor | Gimnasia, danza, natación |

**C. Manipulación de objetos (manos)**
| # | Prueba | Objetivo (texto para el padre) | Tipo / unidad | Mejor es | Prepara para |
|---|---|---|---|---|---|
| 11 | Lanzamiento de pelota por encima del hombro | Evalúa la técnica y la fuerza para lanzar un objeto. | Distancia (m) | Mayor | Béisbol, atletismo, balonmano |
| 12 | Lanzamiento a un objetivo | Mide la precisión al lanzar. | Aciertos / 5 | Mayor | Baloncesto, balonmano, béisbol |
| 13 | Recepción de pelota | Evalúa la capacidad de atrapar un balón lanzado. | Aciertos / 5 | Mayor | Baloncesto, voleibol, béisbol |
| 14 | Bote de balón con la mano | Evalúa el control del balón y la coordinación mano-vista. | Botes seguidos | Mayor | Baloncesto, balonmano |
| 15 | Golpeo con raqueta/paleta | Evalúa la coordinación para golpear un objeto con un implemento. | Golpes seguidos | Mayor | Tenis, bádminton, béisbol, hockey |

**D. Manipulación de objetos (pies)**
| # | Prueba | Objetivo (texto para el padre) | Tipo / unidad | Mejor es | Prepara para |
|---|---|---|---|---|---|
| 16 | Conducción de balón con el pie entre conos | Evalúa el control del balón en movimiento. | Tiempo (s) | Menor | Fútbol, fútbol de salón |
| 17 | Patear a un objetivo | Mide la precisión y la coordinación al patear. | Aciertos / 5 | Mayor | Fútbol, rugby |

> Las pruebas de tipo cualitativo usan la escala **Logrado / En proceso / Por mejorar**, con criterios observables descritos en el protocolo de cada prueba.
>
> ⚠️ Los **valores de referencia** por edad y sexo deben cargarlos y validarlos el entrenador (a partir de bibliografía como baterías tipo PREFIT/EUROFIT adaptadas o TGMD-3 para las cualitativas, o de los datos propios de la escuela). La app permite empezar sin referencias y agregarlas después; si una prueba no tiene referencia, no se muestra la comparación.
>
> **Perfil multidisciplinar (vista del padre):** un gráfico de radar con las 4 familias (Locomoción, Equilibrio, Manipulación con manos, Manipulación con pies) que muestra en qué habilidades se destaca el niño y cuáles conviene reforzar, sin recomendar un deporte específico.

> ⚠️ Los **valores de referencia** por edad y sexo deben cargarlos y validarlos el entrenador (a partir de bibliografía como baterías tipo PREFIT/EUROFIT adaptadas o de los datos propios de la escuela). La app permite empezar sin referencias y agregarlas después; si una prueba no tiene referencia, no se muestra la comparación.

### 7.4 IMC y clasificación OMS
- `IMC = peso (kg) / talla (m)²`, redondeado a 1 decimal.
- Se calcula el **z-score de IMC para la edad** según el sexo:
  - **< 5 años (hasta 60 meses):** Patrones de Crecimiento Infantil OMS 2006.
  - **≥ 5 años (61 meses en adelante):** Referencia de Crecimiento OMS 2007.
  - (Coincide con la Resolución 2465 de 2016 del Ministerio de Salud de Colombia.) Las tablas LMS se incluyen en la app/servidor.
- Clasificación:

| Rango z-score | < 5 años | ≥ 5 años | Texto amable para el padre |
|---|---|---|---|
| > +3 | Obesidad | Obesidad | "Por encima del rango esperado — consulta con tu pediatra" |
| > +2 a ≤ +3 | Sobrepeso | Obesidad | "Por encima del rango esperado — consulta con tu pediatra" |
| > +1 a ≤ +2 | Riesgo de sobrepeso | Sobrepeso | "Ligeramente por encima del rango esperado" |
| ≥ −1 a ≤ +1 | Adecuado | Adecuado | "Dentro del rango esperado para su edad" |
| ≥ −2 a < −1 | Riesgo de delgadez | Riesgo de delgadez | "Ligeramente por debajo del rango esperado" |
| < −2 | Delgadez | Delgadez | "Por debajo del rango esperado — consulta con tu pediatra" |

- Siempre se muestra el aviso: *"Esta información es orientativa y no reemplaza la valoración del pediatra."*
- El entrenador ve la clasificación técnica; el padre ve el texto amable más el percentil.

### 7.5 Asistencia
- Una asistencia por niño por sesión.
- Cada estado se cuenta y se muestra **de forma independiente**, sobre el total de sesiones realizadas:
  - `% Asistió = asistió / sesiones realizadas × 100`
  - `% Retardo = retardo / sesiones realizadas × 100`
  - `% Excusa = excusa / sesiones realizadas × 100`
  - `% Faltó = faltó / sesiones realizadas × 100`
  - Los cuatro suman 100 %. No se mezclan en un solo índice; el padre y el entrenador ven las cuatro cifras por separado (ej. gráfico de barras o anillo con 4 segmentos).
- Las sesiones canceladas no cuentan.
- Solo el entrenador registra excusas.
- El reporte de "asistencia baja" (RF-E41) usa `% Faltó` mayor que un umbral configurable.
- Las ediciones guardan quién, cuándo, el estado anterior y el nuevo.

### 7.6 Comparación con la referencia
- Si el valor está dentro de `[valorBajo, valorAlto]` → "Esperado"; si está fuera, "Por debajo" o "Por encima", según `mejorEs`.
- La edad usada es la del niño en la fecha de la prueba.

### 7.7 Privacidad entre familias
- Un padre **nunca** ve datos de otros niños: ni rankings, ni listas de la categoría, ni fotos grupales sin autorización.

---

## 8. Pantallas (mapa de navegación)

### 8.1 Comunes
1. Splash → 2. Bienvenida → 3. Iniciar sesión → 4. Registro → 5. Verificar correo → 6. Recuperar contraseña → 7. Términos y Política de datos.

### 8.2 Padre (barra inferior: Inicio · Mi hijo · Asistencia · Pagos · Más)
- **Inicio**: selector de hijo, tarjetas de resumen, botón de WhatsApp.
- **Mi hijo**: pestañas Datos · Físico · Pruebas · Historial.
  - Detalle de la prueba (objetivo, cómo se hace, resultados, gráfica, medios).
  - Solicitar cambio.
- **Asistencia**: calendario + lista + estadísticas.
- **Pagos**: mes actual, medios de pago, historial.
- **Más**: Eventos · Anuncios · Notificaciones · Inscribir otro hijo · Invitar acudiente · Descargar informe · Mi cuenta · Preferencias · Cerrar sesión.

### 8.3 Entrenador (móvil: barra inferior; web: menú lateral)
- **Inicio** (panel principal).
- **Niños**: lista → ficha → editar / medición / categoría / descuento / inactivar.
- **Sesiones**: calendario → nueva sesión → asistencia → (control) selección de pruebas → captura de resultados.
- **Pagos**: mes actual → marcar pagado → historial.
- **Más**: Inscripciones pendientes · Solicitudes de cambio · Categorías · Catálogo de pruebas · Plantillas · Eventos · Anuncios · Reportes · Medios de pago · Configuración.

### 8.4 Flujo clave: día de control (entrenador)
```
Sesiones → Nueva sesión → Tipo "Control" → Categoría (fecha y hora precargadas)
→ Seleccionar pruebas (o plantilla) → Guardar
→ Asistencia (marcar todos / excepciones) → Guardar  ⟶ publica + notifica inasistencias
→ Mediciones físicas (opcional, en lote)
→ Captura por prueba: [Prueba 1] niño 1… niño N → [Prueba 2] …
→ Guardar resultados  ⟶ publica + notifica "Nuevos resultados"
```

### 8.5 Flujo clave: inscripción
```
Padre: Registro → Verificar correo → Inscribir hijo (7 pasos) → Enviar
Entrenador: Notificación → Revisar → Asignar categoría + descuento → Aprobar
Sistema: niño activo → primer ciclo de pago → notificación al padre "¡Bienvenido!"
```

### 8.6 Informe PDF del niño
- Encabezado con el logo, el nombre de la escuela y la fecha.
- Datos básicos del niño, categoría, foto.
- Perfil físico: última medición y gráfica de evolución.
- Pruebas: tabla de la última evaluación vs. la anterior, comparación con la referencia y observaciones.
- Asistencia del periodo (los 4 indicadores por separado).
- Comentario general del entrenador (campo libre al generar).
- Rango de fechas seleccionable.

---

## 9. Notificaciones

### 9.1 Catálogo

| Código | Disparador | Destinatario | Canal | ¿Desactivable? |
|---|---|---|---|---|
| N01 Pago próximo | 3 días antes del día de cobro | Acudientes | Push + bandeja | No |
| N02 Pago del mes | Día de cobro (incluye los medios de pago) | Acudientes | Push + bandeja | No |
| N03 Pago vencido | Día de vencimiento (+ cada N días, opcional) | Acudientes | Push + bandeja | No |
| N04 Pago registrado | El entrenador marca pagado | Acudientes | Push + bandeja | Sí |
| N05 Inasistencia | Asistencia guardada con "Faltó" | Acudientes del niño | Push + bandeja | Sí |
| N06 Nuevos resultados | Resultados guardados | Acudientes del niño | Push + bandeja | Sí |
| N07 Evento próximo | X días antes (configurable por evento, ej. 7 y 1) | Acudientes de las categorías | Push + bandeja | Sí |
| N08 Confirma asistencia | Evento con confirmación sin respuesta, 2 días antes del límite | Acudientes sin respuesta | Push | Sí |
| N09 Anuncio general | Anuncio publicado con push | Destinatarios | Push + bandeja | No |
| N10 Sesión cancelada | Sesión cancelada | Acudientes de la categoría | Push + bandeja | No |
| N11 Inscripción aprobada/rechazada | Acción del entrenador | Padre | Push + correo | No |
| N12 Solicitud de cambio resuelta | Acción del entrenador | Padre | Push + bandeja | Sí |
| N13 Nueva inscripción | El padre envía la inscripción | Entrenador | Push | No |
| N14 Nueva solicitud de cambio | El padre envía la solicitud | Entrenador | Push | No |
| N15 Resumen de pagos vencidos | Diario a las 8:00 am | Entrenador | Push | Sí |

### 9.2 Reglas
- Hora de envío de las notificaciones programadas: **7:00 a.m.** (configurable). No se envían entre las 9:00 p.m. y las 6:00 a.m.
- Zona horaria: `America/Bogota`.
- Si el niño tiene varios acudientes, **todos** reciben la notificación.
- Al tocar una notificación se abre la pantalla correspondiente (deep link).

### 9.3 Ejemplos de texto
- N02: *"💳 Hoy inicia el periodo de pago de noviembre de Sofía. Valor: $120.000. Puedes pagar por Nequi, Daviplata o transferencia. Toca para ver los datos."*
- N05: *"Hoy Sofía no asistió al entrenamiento de las 4:00 p.m. Si fue por una razón justificada, avísale al entrenador."*
- N06: *"🏅 ¡Ya están los resultados del día de control de Sofía! Mira su progreso."*
- N07: *"📅 Recuerda: el sábado 15 es el Festival Infantil. Confirma si Sofía asistirá."*

---

## 10. Requisitos no funcionales

| ID | Requisito |
|---|---|
| RNF-01 | **Seguridad:** reglas de Firestore/Storage por rol; un padre solo lee los documentos de los niños donde figura como acudiente. |
| RNF-02 | **Privacidad (Ley 1581/2012 y Decreto 1377/2013):** datos de menores y de salud = datos sensibles; consentimiento expreso del representante legal; política de tratamiento publicada; derechos de consulta, rectificación y supresión. Registro ante el RNBD si aplica. |
| RNF-03 | Las fotos y videos solo se cargan si el niño tiene autorización de uso de imagen; se almacenan privados (URLs firmadas). |
| RNF-04 | Contraseñas gestionadas por Firebase Auth; sesión con expiración; bloqueo tras intentos fallidos. |
| RNF-05 | **Rendimiento:** pantallas principales en < 2 s con 4G; marcar la asistencia de 20 niños en < 1 min. |
| RNF-06 | **Usabilidad:** botones grandes para usar en la cancha; modo claro; textos en español de Colombia; formato de moneda `$ 120.000`; fechas `dd/mm/aaaa`. |
| RNF-07 | **Accesibilidad:** contraste AA, tamaño de fuente escalable. |
| RNF-08 | **Compatibilidad:** Android 8+, iOS 14+, navegadores Chrome/Edge/Safari actuales. |
| RNF-09 | **Respaldo:** exportación automática semanal de Firestore. |
| RNF-10 | **Auditoría:** se registran los cambios en asistencia, resultados, pagos y datos del niño (quién y cuándo). |
| RNF-11 | **Escalabilidad:** diseñado para hasta 300 niños sin cambios de arquitectura. |
| RNF-12 | Compresión de imágenes (máx. 1 MB) y videos (máx. 30 s / 20 MB). |

---

## 11. Plan de entrega (fases)

### Fase 1 — MVP (núcleo)
- Autenticación, registro del padre, inscripción del niño, aprobación + categoría.
- Perfil del niño (datos, salud, seguro, contactos, documentos, consentimientos).
- Categorías y tarifas.
- Sesiones de entrenamiento + asistencia con 4 estados + notificación de inasistencia.
- Pagos: ciclos por fecha de inscripción, recordatorios y marcado manual, medios de pago.
- Botón de WhatsApp.

### Fase 2 — Evaluación
- Mediciones físicas + IMC con percentiles OMS + gráficas.
- Catálogo de pruebas, días de control, captura de resultados, fotos/videos, comparación con la referencia.
- Historial / línea de tiempo.
- Solicitudes de cambio con aprobación.

### Fase 3 — Comunidad y reportes
- Eventos con confirmación y recordatorios.
- Anuncios.
- Reportes, informe PDF y exportación a Excel.
- Varios acudientes por invitación.

### Fase 4 — Piloto (sin publicar en tiendas)
- Pruebas con 3–5 familias piloto mediante la versión web y la instalación directa en Android, y ajustes.

### Fase 5 — Publicación ⏸️ *En pausa*
- **No se publica por ahora.** La estrategia de lanzamiento (tiendas, web pública, dominio, costos) se definirá más adelante.

---

## 12. Criterios de aceptación (ejemplos)

- **CA-01** Dado un padre con 2 hijos activos, cuando inicia sesión, ve un selector con ambos y solo los datos de esos 2 niños.
- **CA-02** Dado un niño inscrito el 31 de enero, su ciclo de febrero se genera el 28 (o 29) de febrero.
- **CA-03** Dado que el entrenador guarda la asistencia con un niño en "Faltó", sus acudientes reciben la notificación N05 en menos de 1 minuto.
- **CA-04** Dado un cambio de "Faltó" a "Excusa", queda registrado en el historial de cambios y se refleja en el calendario del padre.
- **CA-05** Dado un día de control guardado, los resultados aparecen en la pestaña Pruebas del padre con el objetivo de cada prueba, el valor, la observación y la fecha.
- **CA-06** Dada una medición (niña de 5 años 2 meses, 110 cm, 19 kg), la app calcula IMC 15,7 y la clasificación según OMS 2007.
- **CA-07** Dado un padre que solicita cambiar el teléfono, el dato no cambia hasta que el entrenador aprueba.
- **CA-08** Dado un niño sin autorización de uso de imagen, el entrenador no puede adjuntarle fotos ni videos.
- **CA-09** Dado un niño inactivo, no se generan nuevos cobros y el padre ve su historial en modo de solo lectura.

---

## 13. Preguntas abiertas (por responder)

### ✅ Resueltas (v1.1)
| # | Respuesta | Dónde se aplicó |
|---|---|---|
| Q1 | **Pequeños Atletas**, sin logo, colores azul rey y verde | Encabezado, §3.1 |
| Q2 | Formación multidisciplinar y predeportiva, sin especialización | §7.3 (catálogo reorganizado en 4 familias + "Prepara para") |
| Q6 | Los casos especiales de cobro los maneja el entrenador manualmente | §4.9, RF-E33b, §7.2 |
| Q7 | Excusa y retardo cuentan, pero cada estado se muestra de forma independiente | §7.5, RF-P22 |
| Q8 | El padre **no** reporta excusas desde la app | RF-P22b |
| Q20 | No se publica en tiendas por ahora; la estrategia se define después | §3, §11 (Fase 5 en pausa) |

### ⏳ Pendientes

**Marca y contenido**
- **Q1b.** ¿Confirmas los tonos propuestos (`#1F4FD8` azul rey, `#2BB24C` verde) o tienes unos específicos?
- **Q3.** ¿Tienes textos propios de Términos y Política de Datos, o se redacta una plantilla para que la revise un abogado?

**Pagos**
- **Q4.** ¿Cuántos días de gracia antes de marcar "vencido"? (propuesta: 5)
- **Q5.** ¿Hay matrícula/inscripción inicial o pago de uniforme además de la mensualidad?

**Asistencia**
- **Q9.** ¿La notificación de inasistencia también se envía para "Retardo" o "Excusa"? (propuesta: solo "Faltó")

**Pruebas y evaluación**
- **Q10.** ¿Cada cuánto se harán los días de control (mensual, trimestral, semestral)?
- **Q11.** ¿Tienes valores de referencia propios o quieres que se investiguen y propongan por edad y sexo?
- **Q12.** Si hay varios intentos, ¿se guarda el **mejor** o el **promedio**?
- **Q13.** ¿Quieres una "nota general" o un comentario cualitativo del entrenador por niño en cada control (ej. actitud, trabajo en equipo)?
- **Q14.** ¿Las mediciones de talla y peso se hacen solo en los días de control o en cualquier momento?

**Datos del niño**
- **Q15.** ¿Qué tallas de uniforme manejas exactamente? ¿Hay varias prendas (camiseta, pantaloneta, medias, chaqueta) con tallas distintas?
- **Q16.** ¿Datos adicionales: colegio, EPS vs. póliza estudiantil, dirección, cómo nos conoció?

**Operación**
- **Q17.** ¿Cuántos niños tienes hoy y cuántos esperas en un año?
- **Q18.** ¿Entrenas en un solo lugar o en varios?
- **Q19.** ¿En el futuro podría sumarse otro entrenador o asistente? (afecta el diseño de roles desde ya)
- **Q21.** ¿Quién desarrollará la app (tú con ayuda de Claude, un desarrollador, una agencia)? ¿Tienes una fecha objetivo de lanzamiento?
- **Q22.** ¿Necesitas importar datos que ya tienes en Excel?

**Eventos**
- **Q23.** ¿Los eventos con costo deben generar un cobro dentro de la sección de Pagos?
- **Q24.** ¿Se confirma la asistencia por niño o por familia?

---

## 14. Glosario
- **Acudiente:** adulto responsable del niño con acceso a la app.
- **Categoría:** grupo de entrenamiento con horario y tarifa propios.
- **Sesión:** encuentro programado de una categoría; puede ser de *Entrenamiento* o de *Control*.
- **Día de control:** sesión en la que se aplican pruebas motrices y/o mediciones físicas.
- **Ciclo de pago:** periodo mensual que inicia en el día del mes de la inscripción.
- **z-score / percentil:** posición del niño respecto a la población de referencia OMS de su edad y sexo.
