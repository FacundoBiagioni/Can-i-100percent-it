# Pendientes de can i 100% it?

Lista viva de lo que falta. Se actualiza en cada sesión: lo terminado se tacha y pasa a "Hecho", y lo nuevo se suma en su sección.

Cómo se lee:
- `[ ]` pendiente, `[x]` hecho.
- **(vos)**: lo tenés que hacer vos, no se resuelve con código.
- **(Claude)**: lo hago yo cuando me digas.

Última actualización: 10 de octubre de 2026

---

## 1. Antes de lanzar (bloqueantes)

- [ ] **(vos)** Escribirle a SteamHunters para pedir permiso de uso de su API. El sitio depende de ella para los veredictos y no es una API pública oficial.
- [ ] **(vos)** Revisar las condiciones del plan gratis de Gemini para un sitio público: restricciones por región y uso de datos.
- [ ] **(vos)** Comprar un dominio propio (unos USD 10 al año). `can-i-100-it.vercel.app` resta confianza.
- [ ] **(Claude)** Conectar el dominio y actualizar la dirección del sitio en `robots.ts`, `sitemap.ts` y el `metadataBase` del layout.
- [ ] **(vos)** Confirmar que Supabase hace copias de seguridad automáticas de la base de datos (según el plan, puede que no).

## 2. Diseño

- (nada pendiente por ahora)

## 3. Funcionalidades

- [ ] **(vos)** Guardar el link del panel en un lugar seguro: `https://can-i-100-it.vercel.app/admin/` + el valor de `ADMIN_SECRET` (está en `.env.local` y en Vercel). Quien tenga el link entra; si se filtra, cambiá esa variable en Vercel y volvé a desplegar.

## 4. Infraestructura y seguridad

- (nada pendiente por ahora)

## 5. Ideas sueltas (sin decidir)

- [ ] **(vos)** Si el sitio crece o genera ingresos: que un abogado revise Privacidad y Términos.

---

## Hecho (últimos)

- [x] Email de contacto propio del sitio: biagiotrysixty@gmail.com, en Privacidad y Términos (reemplaza tu email personal).
- [x] Arreglo de "requiere multijugador": antes salía de las categorías de la tienda (dice si el juego *tiene* multijugador, no si un logro lo pide, y Steam las borra cuando cierra el multijugador). Ahora sale del texto de cada logro, más los MMO que solo se juegan online. Servidores "caídos" cuando SteamHunters marca como imposibles la mayoría de los logros multijugador. Corregidos los 1.121 juegos: "requiere multijugador" pasó de 621 a 302, y Arkham Origins y CoD: Infinite Warfare quedaron con servidores caídos.
- [x] Pre-análisis nocturno confirmado: corrió solo las noches del 10 y del 11 de octubre (de 485 a 765 juegos), sin errores. El 12 de octubre, a mano, 369 juegos más con la cuota del día (quedaron 60 llamadas de reserva). Los candidatos ahora salen de los 3.000 más vendidos de Steam.
- [x] "Borrar mis datos" en Ajustes (el engranaje): con confirmación, borra de ese navegador los recientes, los seguidos, el perfil de Biblioteca y los ajustes. Privacidad actualizada. El formato de horas queda como está (decisión tuya).
- [x] Monitoreo de errores propio: los errores del servidor, del navegador y de las tareas diarias quedan en el panel, pestaña **Errores** (`/admin/<secreto>/errores`), agrupados, con cuántas veces pasó y el detalle técnico. Se borran solos a los 30 días.
- [x] Web Analytics de Vercel activo (sin cookies; nunca envía el panel). Las visitas se ven en Vercel, pestaña Analytics del proyecto. Privacidad actualizada.
- [x] Content Security Policy completa con nonces: solo corren los scripts del propio sitio; imágenes solo de Steam.
- [x] Listas más robustas: "Los más difíciles" queda guardada una hora y las consultas a SteamHunters tienen tiempo límite. Conexión a la base ajustada a lo que pide Supabase para su pooler (sin consultas preparadas).
- [x] Páginas de error propias (en inglés y español), en lugar de la pantalla genérica.
- [x] Pre-análisis a mano el 9 de octubre con el 90% de la cuota del día: 305 juegos nuevos, sin errores (de 180 a 485 analizados). La lista de candidatos ahora sale de los 1.000 más vendidos de Steam (antes 300), para que al cron nocturno no le falten juegos.
- [x] Navbar: Inicio, Listas, Biblioteca, Siguiendo, Cómo funciona, Acerca de (sin Recientes ni Veredictos). La página Siguiendo explica cómo funciona, y al tocar "Seguir" aparece un cartel que lo explica.
- [x] Pre-análisis nocturno: 4 tandas entre las 23 y las 2 (hora argentina) analizan juegos populares sin veredicto (los más jugados y más vendidos de Steam, priorizando los que más cazadores de SteamHunters empezaron), con la cuota de Gemini que sobró del día. Deja 60 llamadas de reserva. Unos 100 juegos por noche si hubo pocas visitas.
- [x] Listas en `/lists`: ya no se pueden completar, 100% fácil (< 10 h), los 100% más difíciles, necesitan DLC pago y necesitan multijugador. Link en el menú y el footer. Las listas con menos de 5 juegos no aparecen en Google hasta que se llenen (hoy "100% fácil" tiene 1).
- [x] Panel de reportes en `/admin/<secreto>`: pendientes, aceptados y rechazados; aceptar re-analiza el juego en el momento; re-análisis manual por AppID; llamadas de Gemini que quedan hoy.
- [x] Seguir un juego: botón "Seguir" bajo el veredicto. Página `/following` y fila en el inicio, con marca cuando cambia el veredicto o el juego está en su mínimo histórico en tu tienda. Sin cuenta ni email, se guarda en el navegador. Privacidad actualizada.
- [x] Logo: tu "%" pixel-art (versión sin marco) va dentro del nombre, "can i 100[%] it?", en lugar del signo de porcentaje; gira al pasar el mouse. También en el favicon, el ícono del celular y las imágenes para compartir. Original en `assets/brand/logo-original.jpg`, la versión con marco en `assets/brand/logo-v1-framed.jpg`, pública en `/logo.svg`.
- [x] Logo nuevo: marca geométrica (un "%" naranja en un cuadro) en el navbar, el footer, el favicon y el ícono del celular. Gira un cuarto al pasar el mouse.
- [x] Imágenes para compartir propias para "Cómo funciona" (con el diagrama) y "Biblioteca" (con tarjetas de ejemplo).
- [x] "Ocultar spoilers" también tapa los logros ocultos en el texto del veredicto, en "Necesario para:" de los DLC (con "Mostrar") y en la vista previa al compartir.
- [x] Emails de reportes: se borran solos al resolver el reporte, o a los 6 meses como máximo.
- [x] Términos regidos por la ley argentina; aviso de la Ley 25.326 en Privacidad.
- [x] Páginas de Privacidad y Términos (inglés y español) y footer en todas las páginas.
- [x] Arreglo del bloque oscuro sobre la animación del inicio al hacer scroll.
- [x] Auditoría: ruta `/analyze` eliminada, límites de uso, cron diario funcionando, headers de seguridad, `robots.txt`, sitemap y favicon propio.
- [x] Ajustes: idioma, región de la tienda, ocultar spoilers (activado por defecto) y reducir animaciones.
- [x] Precios según la región de cada visitante.
