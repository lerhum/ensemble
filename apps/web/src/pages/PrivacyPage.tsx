import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

/** GDPR privacy policy page, referencing the site title and RGPD contact email from settings. */
export default function PrivacyPage() {
  const { siteTitle, rgpdEmail } = useAuth();
  const org = siteTitle || "le comité organisateur";

  return (
    <div className="min-h-screen bg-[#F9F9F8] px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <Link to="/" className="text-[13px] text-label hover:underline">
            ← Retour
          </Link>
          <h1 className="mt-4 text-3xl font-800 tracking-tighter2 text-ink">
            Politique de confidentialité
          </h1>
          <p className="mt-2 text-sm text-label">Conformément au Règlement (UE) 2016/679 (RGPD)</p>
        </div>

        <Section title="Responsable du traitement">
          <p>
            Le responsable du traitement des données collectées via cette plateforme est{" "}
            <strong>{org}</strong>.
            {rgpdEmail && (
              <>
                {" "}
                Pour toute question relative à vos données, contactez :{" "}
                <a href={`mailto:${rgpdEmail}`} className="underline text-navy">
                  {rgpdEmail}
                </a>
                .
              </>
            )}
          </p>
        </Section>

        <Section title="Données collectées">
          <p>Lors de votre inscription comme bénévole, nous collectons :</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Nom complet</li>
            <li>Adresse email</li>
            <li>Numéro de téléphone (optionnel)</li>
          </ul>
          <p className="mt-3">
            Ces données sont collectées sur la base de votre consentement (Art. 6.1.a RGPD) et dans
            le cadre de l'exécution d'une mission d'intérêt général (organisation d'un événement
            scolaire).
          </p>
        </Section>

        <Section title="Finalités du traitement">
          <ul className="list-disc pl-5 space-y-1">
            <li>Gestion des inscriptions aux créneaux de bénévolat</li>
            <li>Communication relative à l'événement (confirmation, rappels)</li>
            <li>Coordination des bénévoles par les organisateurs</li>
          </ul>
        </Section>

        <Section title="Durée de conservation">
          <p>
            Vos données sont conservées jusqu'à la fin de l'événement auquel vous êtes inscrit·e,
            puis supprimées ou anonymisées dans un délai raisonnable.
          </p>
        </Section>

        <Section title="Vos droits">
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>
              <strong>Droit d'accès</strong> — consulter vos données via la page « Mes inscriptions
              »
            </li>
            <li>
              <strong>Droit de rectification</strong> — corriger vos informations
            </li>
            <li>
              <strong>Droit à l'effacement</strong> — supprimer votre compte depuis « Mes
              inscriptions »
            </li>
            <li>
              <strong>Droit d'opposition</strong> — vous opposer au traitement de vos données
            </li>
          </ul>
          {rgpdEmail && (
            <p className="mt-3">
              Pour exercer ces droits, rendez-vous sur la page{" "}
              <Link to="/mes-inscriptions" className="underline text-navy">
                Mes inscriptions
              </Link>{" "}
              ou contactez{" "}
              <a href={`mailto:${rgpdEmail}`} className="underline text-navy">
                {rgpdEmail}
              </a>
              .
            </p>
          )}
          <p className="mt-3">
            Vous avez également le droit d'introduire une réclamation auprès de l'
            <a
              href="https://www.autoriteprotectiondonnees.be"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-navy"
            >
              Autorité de protection des données (APD)
            </a>{" "}
            belge.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            Ce site utilise uniquement un cookie de session technique, nécessaire au bon
            fonctionnement du service (maintien de votre connexion). Ce cookie ne nécessite pas de
            consentement selon les lignes directrices de l'APD.
          </p>
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
