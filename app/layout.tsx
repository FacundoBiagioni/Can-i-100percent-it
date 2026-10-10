import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/layout/Header";
import PageTransition from "@/components/layout/PageTransition";
import Footer from "@/components/layout/Footer";
import ErrorReporter from "@/components/errors/ErrorReporter";
import SiteAnalytics from "@/components/analytics/SiteAnalytics";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale, getT } from "@/lib/i18n/server";
import { RegionProvider } from "@/lib/pricing/client";
import { getRegion } from "@/lib/pricing/server";
import { PreferencesProvider } from "@/lib/preferences/client";
import { getPreferences } from "@/lib/preferences/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    metadataBase: new URL("https://can-i-100-it.vercel.app"),
    title: "Can i 100% it?",
    description: t.meta.siteDescription,
    twitter: {
      card: "summary_large_image",
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, region, prefs] = await Promise.all([getLocale(), getRegion(), getPreferences()]);
  return (
    <html
      lang={locale}
      data-motion={prefs.reduceMotion ? "off" : undefined}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={locale}>
          <RegionProvider region={region}>
            <PreferencesProvider initial={prefs}>
              <Header />
              <PageTransition>{children}</PageTransition>
              <Footer />
              <ErrorReporter />
              <SiteAnalytics />
            </PreferencesProvider>
          </RegionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
