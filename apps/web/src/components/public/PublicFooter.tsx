import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface Props {
  rgpdEmail: string;
}

/** Public footer: tagline, optional RGPD contact email, and a link to the privacy policy. */
export function PublicFooter({ rgpdEmail }: Props) {
  const { t } = useTranslation("public");

  return (
    <footer className="flex items-center justify-between border-t border-hair py-8 text-[13px] text-label">
      <span>{t("eventParent.footerTagline")}</span>
      <span className="flex items-center gap-3">
        {rgpdEmail && (
          <a href={`mailto:${rgpdEmail}`} className="hover:underline">
            {t("eventParent.contact")}
          </a>
        )}
        <Link to="/confidentialite" className="hover:underline">
          {t("eventParent.confidentiality")}
        </Link>
      </span>
    </footer>
  );
}
