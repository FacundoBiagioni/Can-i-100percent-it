"use client";

import { useRef, useState } from "react";
import { Flag, Share2, Check, X } from "lucide-react";
import type { AnalysisStatus } from "@/lib/pipeline/types";
import { VERDICT } from "@/lib/ui/verdict";
import { useT } from "@/lib/i18n/client";

const REPORT_TYPES = ["dispute", "bug_report", "server_status", "confirmation"] as const;

type ReportType = (typeof REPORT_TYPES)[number];
type SubmitState = "idle" | "sending" | "sent" | "error" | "rate_limited";

const BUTTON =
  "inline-flex cursor-pointer items-center gap-1.5 border border-carbon px-2 py-1 text-nav font-medium text-ash transition-colors hover:border-fog hover:text-chalk";

/** Share + "Is this verdict wrong?" under a game's verdict. */
export default function VerdictActions({ appId, gameName, status }: { appId: number; gameName: string; status: AnalysisStatus }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reportType, setReportType] = useState<ReportType>("dispute");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot: humans never see it
  const [state, setState] = useState<SubmitState>("idle");

  async function share() {
    const url = `${window.location.origin}/games/${appId}`;
    const text = `${gameName}: ${t.verdict[status].label}`;
    // Native share sheet where it exists (phones); otherwise copy the link.
    if (navigator.share) {
      try {
        await navigator.share({ title: `${gameName} | can i 100% it?`, text, url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return; // user closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t.report.copyPrompt, url);
    }
  }

  function openReport() {
    setState("idle");
    dialogRef.current?.showModal();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await fetch("/api/community-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: appId, reportType, body: body.trim(), email: email.trim() || undefined, website }),
      });
      if (res.status === 429) return setState("rate_limited");
      if (!res.ok) return setState("error");
      setState("sent");
      setBody("");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={share} className={BUTTON}>
        {copied ? <Check aria-hidden className="h-3.5 w-3.5" /> : <Share2 aria-hidden className="h-3.5 w-3.5" />}
        {copied ? t.report.linkCopied : t.report.share}
      </button>
      <button type="button" onClick={openReport} className={BUTTON}>
        <Flag aria-hidden className="h-3.5 w-3.5" />
        {t.report.open}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="report-title"
        className="m-auto w-[min(32rem,calc(100vw-2rem))] border border-carbon bg-void p-0 text-chalk backdrop:bg-void/75"
      >
        <div className="flex items-center justify-between border-b border-carbon px-4 py-3">
          <h2 id="report-title" className="text-heading-sm font-semibold">
            {t.report.title}
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label={t.report.close}
            className="cursor-pointer p-1 text-graphite transition-colors hover:text-chalk"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>

        {state === "sent" ? (
          <div className="flex flex-col gap-4 p-4">
            <p className="text-body text-ash">
              {t.report.thanksBefore}
              <span className="text-chalk">{gameName}</span>
              {t.report.thanksAfter}
            </p>
            <button type="button" onClick={() => dialogRef.current?.close()} className={`${BUTTON} w-fit`}>
              {t.report.close}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-5 p-4">
            <p className="text-body text-ash">
              {t.report.about} <span className="text-chalk">{gameName}</span>
              {t.report.currentlyMarked}{" "}
              <span className={VERDICT[status].text}>{t.verdict[status].label}</span>.
            </p>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-nav text-graphite">{t.report.question}</legend>
              {REPORT_TYPES.map((type) => (
                <label key={type} className="flex cursor-pointer items-start gap-2 text-body text-ash">
                  <input
                    type="radio"
                    name="reportType"
                    value={type}
                    checked={reportType === type}
                    onChange={() => setReportType(type)}
                    className="mt-1 accent-chalk"
                  />
                  {t.report.types[type]}
                </label>
              ))}
            </fieldset>

            <label className="flex flex-col gap-2">
              <span className="text-nav text-graphite">{t.report.details}</span>
              <textarea
                required
                minLength={10}
                maxLength={2000}
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="resize-y border border-cinder bg-cinder px-3 py-2 text-body text-chalk outline-none placeholder:text-graphite focus:border-fog"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-nav text-graphite">{t.report.email}</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 border border-cinder bg-cinder px-3 text-body text-chalk outline-none focus:border-fog"
              />
            </label>

            {/* Honeypot: hidden from people and screen readers; bots fill it. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="absolute -left-[9999px] h-px w-px opacity-0"
            />

            {state === "error" && (
              <p role="alert" className="text-body text-fail">
                {t.report.error}
              </p>
            )}
            {state === "rate_limited" && (
              <p role="alert" className="text-body text-unsure">
                {t.report.rateLimited}
              </p>
            )}

            <button
              type="submit"
              disabled={state === "sending"}
              className="w-fit cursor-pointer bg-chalk px-3 py-1.5 text-nav font-semibold text-void transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-50"
            >
              {state === "sending" ? t.report.sending : t.report.send}
            </button>
          </form>
        )}
      </dialog>
    </div>
  );
}
