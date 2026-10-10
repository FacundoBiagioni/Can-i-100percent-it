import Link from "next/link";

/** The panel's two sections. */
export default function AdminNav({ adminKey, active }: { adminKey: string; active: "reports" | "errors" }) {
  const tabs = [
    { id: "reports", label: "Reportes", href: `/admin/${adminKey}` },
    { id: "errors", label: "Errores", href: `/admin/${adminKey}/errores` },
  ] as const;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-nav text-graphite">Panel</p>
      <nav className="flex gap-6">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={tab.id === active ? "page" : undefined}
            className={`text-heading-lg font-semibold transition-colors ${tab.id === active ? "text-chalk" : "text-carbon hover:text-graphite"}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
