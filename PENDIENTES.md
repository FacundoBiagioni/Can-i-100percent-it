# Pendientes de can i 100% it?

Lista viva de lo que falta. Se actualiza en cada sesión: lo terminado se tacha y pasa a "Hecho", y lo nuevo se suma en su sección.

Cómo se lee:
- `[ ]` pendiente, `[x]` hecho.
- **(vos)**: lo tenés que hacer vos, no se resuelve con código.
- **(Claude)**: lo hago yo cuando me digas.

Última actualización: 9 de octubre de 2026 (tarde)

---

## 1. Antes de lanzar (bloqueantes)

- [ ] **(vos)** Crear un email de contacto propio para el sitio (un Gmail nuevo o `contacto@` en un dominio propio) y pasármelo. Hoy las páginas de Privacidad y Términos muestran tu email personal como reemplazo temporal.
- [ ] **(Claude)** Cambiar el email de contacto por el nuevo: variable `CONTACT_EMAIL` en Vercel o el valor por defecto en `lib/legal/content.ts`.
- [ ] **(vos)** Escribirle a SteamHunters para pedir permiso de uso de su API. El sitio depende de ella para los veredictos y no es una API pública oficial.
- [ ] **(vos)** Revisar las condiciones del plan gratis de Gemini para un sitio público: restricciones por región y uso de datos.
- [ ] **(vos)** Comprar un dominio propio (unos USD 10 al año). `can-i-100-it.vercel.app` resta confianza.
- [ ] **(Claude)** Conectar el dominio y actualizar la dirección del sitio en `robots.ts`, `sitemap.ts` y el `metadataBase` del layout.
- [ ] **(vos)** Confirmar que Supabase hace copias de seguridad automáticas de la base de datos (según el plan, puede que no).

## 2. Diseño

- (nada pendiente por ahora)

## 3. Funcionalidades

- [ ] **(vos)** Mañana (10 de octubre) entrar al panel y fijarte que "Juegos analizados" haya subido: confirma que el pre-análisis nocturno corrió. Si no subió, avisame y miro los logs del cron en Vercel.
- [ ] **(vos)** Guardar el link del panel en un lugar seguro: `https://can-i-100-it.vercel.app/admin/` + el valor de `ADMIN_SECRET` (está en `.env.local` y en Vercel). Quien tenga el link entra; si se filtra, cambiá esa variable en Vercel y volvé a desplegar.

## 4. Infraestructura y seguridad

- [ ] **(Claude)** Monitoreo de errores (Sentry o el de Vercel), para enterarte si algo falla en producción.
- [ ] **(Claude)** Analíticas que respeten la privacidad (Vercel Analytics). Si se agregan, hay que actualizar la política de privacidad.
- [ ] **(Claude)** Content Security Policy completa (con nonces). Hoy solo está la parte que impide meter el sitio dentro de otra página.

## 5. Ideas sueltas (sin decidir)

- [ ] Ajuste "Formato de horas": mostrar "91 h" o "3,8 días".
- [ ] Botón "Borrar mis datos" en ajustes: limpia recientes y el perfil guardado de la biblioteca.
- [ ] **(vos)** Si el sitio crece o genera ingresos: que un abogado revise Privacidad y Términos.

---

## Hecho (últimos)

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
