import type { Locale } from "@/lib/i18n/config";

/**
 * Privacy policy and terms, in both languages. Written from what the code
 * actually does (see the references in each section); if a data flow
 * changes, this text has to change with it.
 */

export type LegalSection = { heading: string; paragraphs: string[] };
export type LegalDoc = { title: string; updated: string; intro: string; sections: LegalSection[] };

/** Contact for privacy requests and anything legal. CONTACT_EMAIL overrides
 * it (the creator's personal address is a stand-in until the site has its
 * own); with none, the text falls back to the report form. */
export const CONTACT_EMAIL: string | null = process.env.CONTACT_EMAIL ?? "facundobiagioni@gmail.com";

const contactEn = (email: string | null) =>
  email
    ? `Write to ${email}. We answer privacy requests within 30 days.`
    : 'Use "Is this verdict wrong?" on any game page and choose "The verdict is wrong", mentioning that it\'s a privacy request, with an email to answer you. We answer privacy requests within 30 days.';
const contactEs = (email: string | null) =>
  email
    ? `Escribí a ${email}. Respondemos los pedidos de privacidad dentro de los 30 días.`
    : 'Usá "¿Este veredicto está mal?" en la página de cualquier juego, elegí "El veredicto está mal" y aclará que es un pedido de privacidad, con un email para responderte. Respondemos los pedidos de privacidad dentro de los 30 días.';

export function privacyPolicy(locale: Locale, email: string | null): LegalDoc {
  if (locale === "es") {
    return {
      title: "Política de privacidad",
      updated: "Última actualización: 8 de octubre de 2026",
      intro:
        "can i 100% it? no tiene cuentas, ni publicidad, ni rastreo. Guarda lo mínimo para funcionar, y casi todo por minutos u horas. Esta página explica qué datos se usan, para qué y por cuánto tiempo.",
      sections: [
        {
          heading: "Tu dirección IP",
          paragraphs: [
            "Cada visita llega a nuestro proveedor de hosting, Vercel, que deduce tu país a partir de tu IP para mostrarte los precios de tu tienda de Steam. No guardamos ni el país ni la dirección.",
            "Para evitar abusos, algunas acciones (buscar, revisar una biblioteca, analizar un juego nuevo, enviar un reporte) se cuentan por dirección IP. Ese contador queda en nuestra caché como máximo una hora y después se borra solo.",
          ],
        },
        {
          heading: "Tus preferencias (cookies)",
          paragraphs: [
            "El idioma, la región de la tienda y los ajustes de spoilers y animaciones se guardan en cookies en tu dispositivo durante un año. Solo este sitio las lee, para mostrarte las páginas como elegiste.",
            "No usamos cookies de publicidad ni de analíticas, por eso no hay aviso de cookies: las que hay son necesarias para recordar lo que vos configuraste.",
          ],
        },
        {
          heading: "Lo que queda solo en tu dispositivo",
          paragraphs: [
            "Los juegos que revisaste hace poco y el último link de perfil de Steam que usaste en Biblioteca se guardan en el almacenamiento local de tu navegador. Nunca salen de tu dispositivo. Podés borrar los recientes desde el inicio, o todo borrando los datos de este sitio en tu navegador.",
          ],
        },
        {
          heading: "Revisión de bibliotecas",
          paragraphs: [
            "Cuando pegás un link de perfil de Steam, le pedimos a la API pública de Steam los datos públicos de ese perfil: nombre, avatar, fondo de perfil, juegos, horas jugadas y progreso de logros.",
            "Para no consultar a Steam dos veces seguidas, el perfil y la lista de juegos quedan en nuestra caché como máximo 30 minutos. El progreso de logros no se guarda. Solo se pueden revisar perfiles públicos: nunca pedimos tu contraseña ni que inicies sesión.",
          ],
        },
        {
          heading: "Reportes",
          paragraphs: [
            'Si usás "¿Este veredicto está mal?", guardamos tu mensaje, el juego y, solo si lo dejás, tu email, para revisar el reporte y responderte si hace falta. El email se borra solo, automáticamente, cuando el reporte se resuelve, y como máximo a los 6 meses aunque siga pendiente; el reporte queda sin ningún dato tuyo. No incluyas datos personales de otras personas.',
          ],
        },
        {
          heading: "Lo que no hacemos",
          paragraphs: [
            "No vendemos ni compartimos datos con fines comerciales, no mostramos publicidad, no usamos herramientas de analíticas ni de rastreo y no armamos perfiles de quienes visitan el sitio.",
          ],
        },
        {
          heading: "Proveedores",
          paragraphs: [
            "Vercel (hosting), Supabase (base de datos, alojada en Amazon Web Services en Estados Unidos) y Upstash (caché) procesan datos en nuestro nombre. Los datos pueden procesarse en Estados Unidos.",
            "Para armar los veredictos consultamos a Steam (Valve), SteamHunters, Achievement Scouts e IsThereAnyDeal; a ellos solo se les envían identificadores de juegos, o el perfil de Steam que vos pegaste en Biblioteca. Google Gemini lee textos públicos sobre juegos (foros y guías): nunca recibe datos tuyos.",
          ],
        },
        {
          heading: "Tus derechos",
          paragraphs: [
            "Podés pedir ver, corregir o borrar los datos que tengamos sobre vos (en la práctica, un reporte y su email). También podés poner tu perfil de Steam en privado cuando quieras; desde ese momento no se puede revisar.",
            "Este sitio se opera desde Argentina y se rige por la Ley 25.326 de Protección de Datos Personales. La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre protección de datos personales.",
          ],
        },
        {
          heading: "Menores",
          paragraphs: ["El sitio no está dirigido a menores de 13 años y no les pedimos datos."],
        },
        {
          heading: "Cambios y contacto",
          paragraphs: ["Si esta política cambia, actualizamos la fecha de arriba.", contactEs(email)],
        },
      ],
    };
  }
  return {
    title: "Privacy policy",
    updated: "Last updated: October 8, 2026",
    intro:
      "can i 100% it? has no accounts, ads or tracking. It keeps as little as it needs to work, and almost all of it for minutes or hours. This page explains what data is used, what for, and for how long.",
    sections: [
      {
        heading: "Your IP address",
        paragraphs: [
          "Every visit reaches our hosting provider, Vercel, which works out your country from your IP address so prices come from your Steam store. We store neither the country nor the address.",
          "To prevent abuse, some actions (searching, checking a library, analyzing a new game, sending a report) are counted per IP address. That count stays in our cache for one hour at most and is then deleted automatically.",
        ],
      },
      {
        heading: "Your preferences (cookies)",
        paragraphs: [
          "Language, store region, and the spoiler and animation settings are saved in cookies on your device for one year. Only this site reads them, to show pages the way you chose.",
          "There are no advertising or analytics cookies, which is why there's no cookie banner: the ones used are needed to remember what you set.",
        ],
      },
      {
        heading: "What stays on your device",
        paragraphs: [
          "The games you checked recently and the last Steam profile link you used in Library are saved in your browser's local storage. They never leave your device. You can clear recent games from the home page, or everything by clearing this site's data in your browser.",
        ],
      },
      {
        heading: "Library checks",
        paragraphs: [
          "When you paste a Steam profile link, we ask Steam's public API for that profile's public data: name, avatar, profile background, games, playtime and achievement progress.",
          "So Steam isn't asked twice in a row, the profile and its game list stay in our cache for 30 minutes at most. Achievement progress isn't stored. Only public profiles can be checked: we never ask for your password or for you to sign in.",
        ],
      },
      {
        heading: "Reports",
        paragraphs: [
          'If you use "Is this verdict wrong?", we store your message, the game and, only if you leave it, your email, to review the report and answer you if needed. The email is deleted automatically once the report is handled, and after 6 months at most even if it\'s still pending; the report then keeps no data about you. Please don\'t include other people\'s personal data.',
        ],
      },
      {
        heading: "What we don't do",
        paragraphs: [
          "We don't sell or share data for commercial purposes, show ads, use analytics or tracking tools, or build profiles of visitors.",
        ],
      },
      {
        heading: "Service providers",
        paragraphs: [
          "Vercel (hosting), Supabase (database, hosted on Amazon Web Services in the United States) and Upstash (cache) process data on our behalf. Data may be processed in the United States.",
          "To build verdicts we query Steam (Valve), SteamHunters, Achievement Scouts and IsThereAnyDeal; they only receive game IDs, or the Steam profile you pasted in Library. Google Gemini reads public text about games (forums and guides): it never receives any data about you.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "You can ask to see, correct or delete any data we hold about you (in practice, a report and its email). You can also set your Steam profile to private at any time; from then on it can't be checked.",
          "This site is run from Argentina and follows its Personal Data Protection Law (Ley 25.326). Argentina's Agency for Access to Public Information (Agencia de Acceso a la Información Pública), as the authority in charge of that law, handles complaints about breaches of personal data rules.",
        ],
      },
      {
        heading: "Children",
        paragraphs: ["The site isn't directed at children under 13, and we don't ask them for data."],
      },
      {
        heading: "Changes and contact",
        paragraphs: ["If this policy changes, the date above is updated.", contactEn(email)],
      },
    ],
  };
}

export function termsOfUse(locale: Locale, email: string | null): LegalDoc {
  if (locale === "es") {
    return {
      title: "Términos de uso",
      updated: "Última actualización: 8 de octubre de 2026",
      intro: "Al usar can i 100% it? aceptás estos términos. Son cortos a propósito: leelos.",
      sections: [
        {
          heading: "Qué es",
          paragraphs: [
            "Una herramienta gratuita e informativa que estima si todavía es posible conseguir el 100% de los logros de un juego de Steam, y qué hace falta para lograrlo.",
          ],
        },
        {
          heading: "Los veredictos no son una garantía",
          paragraphs: [
            "Cada veredicto se calcula con datos de terceros y con lecturas automáticas de foros y guías, algunas hechas por inteligencia artificial. Pueden estar equivocados o desactualizados.",
            "Usalos como orientación y verificá antes de comprar un juego o invertirle tiempo. No nos hacemos responsables por compras ni decisiones tomadas en base a ellos.",
          ],
        },
        {
          heading: "Precios",
          paragraphs: [
            "Los precios salen de la tienda de Steam de la región elegida, en el momento de la consulta, y pueden diferir de lo que se cobra al pagar (impuestos, moneda, ofertas que terminan). Manda siempre la tienda de Steam. Nada de lo que se muestra acá es una oferta de venta.",
          ],
        },
        {
          heading: "Sin relación con Valve",
          paragraphs: [
            "Este sitio no está afiliado, respaldado ni patrocinado por Valve Corporation, Steam ni ningún desarrollador o distribuidor de juegos. Steam y el logo de Steam son marcas de Valve Corporation. Los nombres, imágenes y logros de los juegos pertenecen a sus dueños y se muestran solo para identificar cada juego.",
          ],
        },
        {
          heading: "Fuentes de datos",
          paragraphs: [
            "Los datos vienen de Steam, SteamHunters, Achievement Scouts e IsThereAnyDeal, entre otros (ver Cómo funciona). Cada uno conserva los derechos sobre sus datos.",
          ],
        },
        {
          heading: "Uso aceptable",
          paragraphs: [
            "El sitio es para uso personal y no comercial. No está permitido extraer datos de forma automatizada, sobrecargarlo, saltear sus límites de uso ni usar su API desde otros programas. Podemos bloquear el tráfico abusivo.",
          ],
        },
        {
          heading: "Reportes",
          paragraphs: [
            "Al enviar un reporte nos autorizás a usar su contenido para revisar y mejorar los veredictos. No envíes datos personales de otras personas ni contenido ilegal u ofensivo.",
          ],
        },
        {
          heading: "Disponibilidad y responsabilidad",
          paragraphs: [
            'El sitio se ofrece "tal cual" y puede cambiar, interrumpirse o dejar de funcionar en cualquier momento. En la medida que lo permita la ley, no somos responsables por daños indirectos ni por pérdidas derivadas de su uso.',
          ],
        },
        {
          heading: "Ley aplicable",
          paragraphs: [
            "Estos términos se rigen por las leyes de la República Argentina, desde donde se opera el sitio. Si vivís en otro país, eso no te quita los derechos que te den las leyes de protección al consumidor de tu país.",
          ],
        },
        {
          heading: "Cambios y contacto",
          paragraphs: [
            "Si estos términos cambian, actualizamos la fecha de arriba; seguir usando el sitio implica aceptar la nueva versión.",
            contactEs(email),
          ],
        },
      ],
    };
  }
  return {
    title: "Terms of use",
    updated: "Last updated: October 8, 2026",
    intro: "By using can i 100% it? you agree to these terms. They're short on purpose: please read them.",
    sections: [
      {
        heading: "What this is",
        paragraphs: [
          "A free, informational tool that estimates whether every Steam achievement of a game can still be unlocked, and what it takes.",
        ],
      },
      {
        heading: "Verdicts are not a guarantee",
        paragraphs: [
          "Each verdict is built from third-party data and from automated readings of forums and guides, some made by artificial intelligence. They can be wrong or out of date.",
          "Use them as guidance and check before you buy a game or put time into it. We're not responsible for purchases or decisions made based on them.",
        ],
      },
      {
        heading: "Prices",
        paragraphs: [
          "Prices come from the Steam store of the selected region at the time of the check, and can differ from what you're charged at checkout (taxes, currency, sales ending). Steam's store always prevails. Nothing shown here is an offer to sell.",
        ],
      },
      {
        heading: "Not affiliated with Valve",
        paragraphs: [
          "This site is not affiliated with, endorsed or sponsored by Valve Corporation, Steam or any game developer or publisher. Steam and the Steam logo are trademarks of Valve Corporation. Game names, images and achievements belong to their owners and are shown only to identify each game.",
        ],
      },
      {
        heading: "Data sources",
        paragraphs: [
          "Data comes from Steam, SteamHunters, Achievement Scouts and IsThereAnyDeal, among others (see How it works). Each keeps the rights to its data.",
        ],
      },
      {
        heading: "Acceptable use",
        paragraphs: [
          "The site is for personal, non-commercial use. Don't scrape it, overload it, get around its usage limits or call its API from other software. We may block abusive traffic.",
        ],
      },
      {
        heading: "Reports",
        paragraphs: [
          "By sending a report you let us use its content to review and improve verdicts. Don't send other people's personal data or unlawful or offensive content.",
        ],
      },
      {
        heading: "Availability and liability",
        paragraphs: [
          'The site is provided "as is" and may change, be interrupted or stop working at any time. To the extent allowed by law, we\'re not liable for indirect damages or losses arising from its use.',
        ],
      },
      {
        heading: "Governing law",
        paragraphs: [
          "These terms are governed by the laws of the Argentine Republic, where the site is run from. If you live elsewhere, this doesn't take away any rights your country's consumer protection laws give you.",
        ],
      },
      {
        heading: "Changes and contact",
        paragraphs: [
          "If these terms change, the date above is updated; continuing to use the site means accepting the new version.",
          contactEn(email),
        ],
      },
    ],
  };
}
