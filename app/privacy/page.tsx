import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { CONTACT_EMAIL, privacyPolicy } from "@/lib/legal/content";
import { getLocale } from "@/lib/i18n/server";
import { DICTIONARIES } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const doc = privacyPolicy(locale, CONTACT_EMAIL);
  return { title: `${doc.title} | can i 100% it?`, description: doc.intro };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  return <LegalPage doc={privacyPolicy(locale, CONTACT_EMAIL)} label={DICTIONARIES[locale].footer.legal} />;
}
