# Sistema de Voto Electrónico — Municipio Escolar

Versión preparada para pruebas reales sobre InfinityFree + Supabase.

## Estructura

- `index.html` — acceso para administrador y directivos.
- `dashboard.html` — panel general del administrador.
- `padron.html` — padrón electoral.
- `mesas.html` — mesas y escrutinio por mesa.
- `listas.html` — listas y candidatos.
- `jornada.html` — configuración, apertura y cierre manual.
- `resultados.html` — resultados y actualización en tiempo real para admin/directivo.
- `usuarios.html` — administración de usuarios directivos (solo admin).
- `invitacion.html` — activación de una invitación de Director/Subdirector.
- `configuracion.html` — datos e insignia del colegio.
- `votar.html` — votación pública de estudiantes.
- `supabaseClient.js` — conexión a Supabase y control de roles.
- `schema.sql` — instalación nueva desde cero.
- `migracion_multi_anio.sql` — actualización de una instalación existente sin borrar datos.
- `mejoras_seguridad.sql` — protección anti fuerza-bruta para las RPC públicas de votación. Ejecutar una vez, después de `schema.sql` o `migracion_multi_anio.sql`.
- `parche_voto_secreto_y_limite.sql` — refuerza el secreto del voto (quita `fecha_hora` de `votos` y usa ids aleatorios) y hace que el límite de intentos fallidos realmente funcione. Ejecutar una vez, después de `mejoras_seguridad.sql` y ANTES de la jornada. Tras cerrar la votación, ejecutar `cluster votos using votos_pkey;`.

## Roles

### Administrador

El administrador se crea en **Supabase Authentication -> Users** por la persona que administra técnicamente la base de datos.

Después de ejecutar la migración, enlaza ese usuario con el rol del sistema ejecutando UNA vez en SQL Editor:

```sql
select fn_configurar_admin_por_email('CORREO_DEL_ADMIN');
```

Esto **no crea otro usuario Auth**. Solo asigna `rol = admin` al usuario que ya existe.

El administrador puede:

- configurar elecciones;
- abrir/cerrar votaciones;
- administrar padrón, mesas, listas y candidatos;
- consultar resultados;
- crear y revocar invitaciones de Director/Subdirector;
- activar/desactivar directivos.

### Directivo

El rol de sistema es `directivo` y tiene dos subroles:

- `director`
- `subdirector`

Los directivos **no administran la elección** y no pueden modificar padrón, mesas, listas, candidatos ni abrir/cerrar la votación.

Solo pueden entrar a `resultados.html` para consultar resultados en tiempo real e historial.

El directivo no crea otros usuarios.

## Cómo invitar un Director/Subdirector

1. El administrador entra a `usuarios.html`.
2. Escribe el correo del directivo.
3. Selecciona Director o Subdirector.
4. Define la vigencia de la invitación.
5. Pulsa **Generar invitación**.
6. El sistema crea un enlace con un token seguro. El token real no se guarda en la base; se guarda su SHA-256.
7. El administrador copia el enlace y se lo entrega al directivo.
8. El directivo abre el enlace, crea su cuenta Auth y activa la invitación.
9. Al activarse, queda registrado como `directivo` con su subrol.
10. Al iniciar sesión, el sistema lo envía directamente a resultados.

Si Supabase tiene habilitada la confirmación obligatoria por correo, el directivo debe confirmar el correo y volver a abrir el mismo enlace de invitación para completar la activación.

## Cierre automático de la votación

La votación tiene ahora tres barreras:

1. El contador del navegador muestra el tiempo restante.
2. `fn_consultar_estudiante()` y `fn_emitir_voto()` validan la hora real del servidor usando `America/Lima`.
3. Supabase Cron ejecuta `fn_cerrar_elecciones_vencidas()` cada minuto.

Por tanto, aunque el administrador se olvide de cerrar la votación, la base de datos la cerrará automáticamente al llegar `hora_fin`.

Además, cuando un estudiante intenta votar después de la hora final, la RPC vuelve a comprobar la hora y rechaza el voto aunque el Cron todavía no haya ejecutado ese minuto.

El cierre manual continúa disponible en `jornada.html`.

## Protección del historial

- Los votos ya registrados no pueden provocar que se borren sus listas o mesas mediante `ON DELETE CASCADE`.
- `listas.numero` es único por `eleccion_id`, por lo que puede existir Lista 1 en 2026 y Lista 1 en 2027.
- El doble voto se controla con `unique (eleccion_id, estudiante_id)` en `votantes`.
- Los votos no contienen `estudiante_id`, manteniendo separada la identidad del elector de su elección.
- Las listas no pueden modificarse mientras una elección está abierta o ya tiene votos.

## Resultados en tiempo real

Los votos insertados generan un evento mínimo en `eventos_resultado`.

La pantalla `resultados.html` escucha esos eventos mediante Supabase Realtime y vuelve a consultar los resultados agregados. No expone el voto individual al directivo.

Existe además un refresco de respaldo cada 15 segundos por si el canal Realtime pierde conexión.

## Instalación nueva

Si el proyecto de Supabase está vacío:

1. Ejecuta `schema.sql` completo.
2. Ejecuta `mejoras_seguridad.sql` (protección anti fuerza-bruta de DNI).
3. Crea el usuario administrador en **Authentication -> Users**.
4. Ejecuta `select fn_configurar_admin_por_email('CORREO_DEL_ADMIN');`.
5. Comprueba que el administrador pueda iniciar sesión.
6. Desde `usuarios.html`, crea una invitación de prueba para Director y otra para Subdirector.
7. Prueba primero la invitación y después la votación.

## Instalación existente

Si ya tienes estudiantes, mesas, listas, candidatos, elecciones o votos:

**NO ejecutes `schema.sql`.**

Ejecuta únicamente `migracion_multi_anio.sql` y después `mejoras_seguridad.sql`.

Después ejecuta:

```sql
select fn_configurar_admin_por_email('CORREO_DEL_ADMIN');
```

La migración está diseñada para conservar los datos existentes y sumar las nuevas reglas.

## Protección anti fuerza-bruta (mejoras_seguridad.sql)

`votar.html` es pública por diseño: cualquiera con el enlace puede intentar
consultar un DNI. Sin protección, alguien podría probar DNIs al azar y
terminar reconstruyendo el padrón, o buscando un DNI válido para votar en
nombre de otro estudiante.

`mejoras_seguridad.sql` agrega un límite de intentos fallidos por origen
(IP) directamente en `fn_consultar_estudiante` y `fn_emitir_voto`. Solo se
cuentan los DNIs con formato inválido o que no existen en el padrón — una
consulta o un voto exitoso nunca se cuenta contra el límite, así que
muchos estudiantes votando desde el mismo WiFi del colegio no se bloquean
entre sí. Los umbrales (`v_max`, `v_ventana`) están declarados al inicio
de `fn_verificar_limite_intentos` en ese archivo, por si necesitas
ajustarlos según cómo se comporte en las pruebas reales.

## Supabase Realtime

La migración intenta añadir `eventos_resultado` a la publicación `supabase_realtime`.

Si tu proyecto no permite añadirlo automáticamente, entra en Supabase:

**Database -> Replication -> supabase_realtime**

y habilita la tabla:

`public.eventos_resultado`

## InfinityFree

InfinityFree aloja solamente los archivos HTML/CSS/JS.

Supabase continúa gestionando:

- Auth;
- PostgreSQL;
- RLS;
- RPC;
- Storage;
- Cron;
- Realtime.

Sube todos los archivos de esta carpeta manteniendo la estructura actual.

Usa HTTPS en el dominio publicado.

No coloques nunca una `service_role` key en `supabaseClient.js`.

## Pruebas obligatorias antes de una jornada real

- [ ] Login del administrador.
- [ ] Login/activación de Director.
- [ ] Login/activación de Subdirector.
- [ ] Director no puede abrir `jornada.html`.
- [ ] Director no puede entrar al padrón, mesas, listas ni configuración.
- [ ] Director puede ver resultados.
- [ ] Resultados se actualizan al registrar un voto.
- [ ] El administrador puede revocar un directivo.
- [ ] El directivo revocado ya no puede consultar resultados.
- [ ] Voto antes de hora_inicio es rechazado.
- [ ] Voto durante la jornada es aceptado.
- [ ] Voto después de hora_fin es rechazado.
- [ ] La elección se cierra sola aunque ningún navegador esté abierto.
- [ ] Cierre manual funciona.
- [ ] Dos navegadores intentando votar con el mismo DNI no generan dos votos.
- [ ] Lista 1 puede existir en dos elecciones distintas.
- [ ] Una lista con votos no puede eliminarse.
- [ ] Una mesa con votos no puede eliminarse.
- [ ] Notificaciones/triggers de Supabase están activos y probados.
- [ ] El sistema funciona desde el dominio HTTPS de InfinityFree.
- [ ] `mejoras_seguridad.sql` fue ejecutado y el límite de intentos bloquea tras varios DNIs inválidos seguidos.
- [ ] El límite de intentos NO bloquea a varios estudiantes votando normalmente desde el mismo WiFi.

## Nota

Es un sistema educativo interno del colegio y no un sistema oficial de ONPE.
