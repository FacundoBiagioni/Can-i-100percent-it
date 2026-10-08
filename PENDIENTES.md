# Pendientes de can i 100% it?

Lista viva de lo que falta. Se actualiza en cada sesión: lo terminado se tacha y pasa a "Hecho", y lo nuevo se suma en su sección.

Cómo se lee:
- `[ ]` pendiente, `[x]` hecho.
- **(vos)**: lo tenés que hacer vos, no se resuelve con código.
- **(Claude)**: lo hago yo cuando me digas.

Última actualización: 8 de octubre de 2026

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

- [ ] **(Claude)** Cambiar el logo del navbar ("can i 100% it?" en texto) por uno mejor. Arrancar proponiendo opciones.
- [ ] **(Claude)** Imágenes para compartir propias para "Cómo funciona" y "Biblioteca" (hoy usan la genérica del sitio).
- [ ] **(Claude)** Opcional: que "Ocultar spoilers" también tape los nombres de logros ocultos en el texto del veredicto y en "Necesario para:" de los DLC.

## 3. Funcionalidades

- [ ] **(Claude)** Proceso diario que analice de antemano los juegos más populares con la cuota sobrante de Gemini. Es lo que más mejora la cobertura (hoy hay unos 160 juegos analizados).
- [ ] **(Claude)** Páginas de listas para atraer visitas desde Google: "Juegos que ya no se pueden completar", "100% fácil en menos de 10 horas", "Juegos con logros perdibles".
- [ ] **(Claude)** Panel para revisar los reportes de usuarios (hoy se revisan desde la base con `bun run db:studio`).
- [ ] **(Claude)** Seguir un juego y recibir un aviso si cambia su veredicto o baja de precio.

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

- [x] Emails de reportes: se borran solos al resolver el reporte, o a los 6 meses como máximo.
- [x] Términos regidos por la ley argentina; aviso de la Ley 25.326 en Privacidad.
- [x] Páginas de Privacidad y Términos (inglés y español) y footer en todas las páginas.
- [x] Arreglo del bloque oscuro sobre la animación del inicio al hacer scroll.
- [x] Auditoría: ruta `/analyze` eliminada, límites de uso, cron diario funcionando, headers de seguridad, `robots.txt`, sitemap y favicon propio.
- [x] Ajustes: idioma, región de la tienda, ocultar spoilers (activado por defecto) y reducir animaciones.
- [x] Precios según la región de cada visitante.
