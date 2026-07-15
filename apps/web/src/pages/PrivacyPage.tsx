import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth-context";

/** GDPR privacy policy page, referencing the site title and RGPD contact email from settings. */
export default function PrivacyPage() {
  const { siteTitle, rgpdEmail } = useAuth();
  const { t } = useTranslation("public");
  const org = siteTitle || t("privacy.defaultOrgName");

  return (
    <div className="min-h-screen bg-[#F9F9F8] px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <Link to="/" className="text-[13px] text-label hover:underline">
            {t("privacy.back")}
          </Link>
          <h1 className="mt-4 text-3xl font-800 tracking-tighter2 text-ink">
            {t("privacy.title")}
          </h1>
          <p className="mt-2 text-sm text-label">{t("privacy.subtitle")}</p>
        </div>

        <Section title={t("privacy.responsible.title")}>
          <p>
            {t("privacy.responsible.intro")} <strong>{org}</strong>.
            {rgpdEmail && (
              <>
                {" "}
                {t("privacy.responsible.contactPrefix")}{" "}
                <a href={`mailto:${rgpdEmail}`} className="underline text-navy">
                  {rgpdEmail}
                </a>
                .
              </>
            )}
          </p>
        </Section>

        <Section title={t("privacy.dataCollected.title")}>
          <p>{t("privacy.dataCollected.intro")}</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>{t("privacy.dataCollected.fullName")}</li>
            <li>{t("privacy.dataCollected.email")}</li>
            <li>{t("privacy.dataCollected.phone")}</li>
          </ul>
          <p className="mt-3">{t("privacy.dataCollected.basis")}</p>
        </Section>

        <Section title={t("privacy.purposes.title")}>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("privacy.purposes.slots")}</li>
            <li>{t("privacy.purposes.communication")}</li>
            <li>{t("privacy.purposes.coordination")}</li>
          </ul>
        </Section>

        <Section title={t("privacy.retention.title")}>
          <p>{t("privacy.retention.text")}</p>
        </Section>

        <Section title={t("privacy.rights.title")}>
          <p>{t("privacy.rights.intro")}</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>
              <strong>{t("privacy.rights.access.label")}</strong> —{" "}
              {t("privacy.rights.access.description")}
            </li>
            <li>
              <strong>{t("privacy.rights.rectification.label")}</strong> —{" "}
              {t("privacy.rights.rectification.description")}
            </li>
            <li>
              <strong>{t("privacy.rights.erasure.label")}</strong> —{" "}
              {t("privacy.rights.erasure.description")}
            </li>
            <li>
              <strong>{t("privacy.rights.objection.label")}</strong> —{" "}
              {t("privacy.rights.objection.description")}
            </li>
          </ul>
          {rgpdEmail && (
            <p className="mt-3">
              {t("privacy.rights.exercisePrefix")}{" "}
              <Link to="/mes-inscriptions" className="underline text-navy">
                {t("privacy.rights.exerciseLinkText")}
              </Link>{" "}
              {t("privacy.rights.exerciseOr")}{" "}
              <a href={`mailto:${rgpdEmail}`} className="underline text-navy">
                {rgpdEmail}
              </a>
              .
            </p>
          )}
          <p className="mt-3">
            {t("privacy.rights.complaintPrefix")}
            <a
              href="https://www.autoriteprotectiondonnees.be"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-navy"
            >
              {t("privacy.rights.complaintLinkText")}
            </a>{" "}
            {t("privacy.rights.complaintSuffix")}
          </p>
        </Section>

        <Section title={t("privacy.cookies.title")}>
          <p>{t("privacy.cookies.text")}</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-hair bg-white p-6">
      <h2 className="mb-3 text-[15px] font-800 text-ink">{title}</h2>
      <div className="space-y-2 text-sm text-ink2 leading-relaxed">{children}</div>
    </section>
  );
}
