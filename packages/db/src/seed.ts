// Seed = contenu exact du prototype (Vinalmont Got's Talent).
// Idempotent : supprime l'événement (cascade sur pôles/tâches/créneaux/bénévoles/
// inscriptions) puis recrée tout. NE TOUCHE PAS aux users/sessions (l'admin créé
// via l'installeur survit au reseed).
import { createNodeDb } from "./client.node.js";
import * as s from "./schema.js";

type Statut = "confirme" | "attente";

// Registre des bénévoles : nom → coordonnées. Emails du prototype respectés.
const VOL: Record<string, { email: string; tel: string | null; statut: Statut }> = {
  // — Bar & Buvette (noms/emails exacts du prototype) —
  "Julie Marchal": { email: "julie.marchal@email.be", tel: "0478 12 34 56", statut: "confirme" },
  "Sophie Kümpel": { email: "sophie.k@email.be", tel: "0471 98 76 54", statut: "confirme" },
  "Thomas Lemaire": { email: "thomas.lemaire@email.be", tel: "0495 11 22 33", statut: "confirme" },
  "Aïcha Demir": { email: "aicha.demir@email.be", tel: "0488 44 55 66", statut: "confirme" },
  "Rachel Fontaine": { email: "r.fontaine@email.be", tel: "0476 77 88 99", statut: "confirme" },
  "Mehdi Nasri": { email: "mehdi.nasri@email.be", tel: "0497 33 44 55", statut: "confirme" },
  "Camille Bertrand": { email: "c.bertrand@email.be", tel: "0470 22 33 44", statut: "confirme" },
  "Valérie Dubois": { email: "valerie.dubois@email.be", tel: null, statut: "confirme" },
  // — Pêche aux canards —
  "Nicolas Henry": { email: "nicolas.henry@email.be", tel: "0478 55 66 77", statut: "confirme" },
  "Sarah Lambert": { email: "sarah.lambert@email.be", tel: "0479 66 77 88", statut: "confirme" },
  "Olivier Maréchal": { email: "olivier.marechal@email.be", tel: null, statut: "confirme" },
  "Émilie Dupont": { email: "emilie.dupont@email.be", tel: "0491 12 13 14", statut: "confirme" },
  "Karim Benali": { email: "karim.benali@email.be", tel: "0494 15 16 17", statut: "attente" },
  // — Grimage & maquillage —
  "Nathalie Wauters": { email: "nathalie.wauters@email.be", tel: "0472 18 19 20", statut: "confirme" },
  "David Collard": { email: "david.collard@email.be", tel: null, statut: "confirme" },
  "Manon Gillet": { email: "manon.gillet@email.be", tel: "0473 21 22 23", statut: "confirme" },
  "Pierre Lejeune": { email: "pierre.lejeune@email.be", tel: "0496 24 25 26", statut: "attente" },
  "Céline Dewulf": { email: "celine.dewulf@email.be", tel: "0475 27 28 29", statut: "confirme" },
  "Antoine Renard": { email: "antoine.renard@email.be", tel: null, statut: "confirme" },
  // — Pâtisseries —
  "Sofie Janssens": { email: "sofie.janssens@email.be", tel: "0477 30 31 32", statut: "confirme" },
  "Hugo Moreau": { email: "hugo.moreau@email.be", tel: "0498 33 34 35", statut: "attente" },
  "Léa Vandenberghe": { email: "lea.vandenberghe@email.be", tel: "0479 36 37 38", statut: "confirme" },
  // — Accueil & billetterie —
  "Laurent Piron": { email: "l.piron@email.be", tel: "0478 39 40 41", statut: "confirme" },
  "Marc Stevens": { email: "marc.stevens@email.be", tel: "0471 42 43 44", statut: "confirme" },
  "Isabelle Close": { email: "isabelle.close@email.be", tel: null, statut: "confirme" },
  "Géraldine Body": { email: "geraldine.body@email.be", tel: "0492 45 46 47", statut: "attente" },
  "Fatima Zahra": { email: "fatima.zahra@email.be", tel: "0493 48 49 50", statut: "confirme" },
  "Quentin Servais": { email: "quentin.servais@email.be", tel: "0496 51 52 53", statut: "attente" },
  // — Barbecue —
  "Damien Lecomte": { email: "damien.lecomte@email.be", tel: "0497 54 55 56", statut: "attente" },
};

interface CreneauSeed {
  debut: string;
  fin: string;
  necessaires: number;
  benevoles: string[]; // noms (clés de VOL)
}
interface TacheSeed {
  nom: string;
  description: string;
  creneaux: CreneauSeed[];
}
interface PoleSeed {
  nom: string;
  description: string;
  taches: TacheSeed[];
}

// 6 pôles · 18 créneaux · 54 places · 32 inscriptions (cohérent avec le proto).
const POLES: PoleSeed[] = [
  {
    nom: "Bar & Buvette",
    description: "Tenir le bar : montage, service des boissons et rangement.",
    taches: [
      {
        nom: "Montage du bar",
        description: "Installation & mise en place",
        creneaux: [
          { debut: "13:00", fin: "14:00", necessaires: 3, benevoles: ["Julie Marchal", "Sophie Kümpel", "Thomas Lemaire"] },
        ],
      },
      {
        nom: "Service boissons",
        description: "Service au comptoir",
        creneaux: [
          { debut: "14:00", fin: "16:00", necessaires: 4, benevoles: ["Aïcha Demir", "Rachel Fontaine"] },
          { debut: "16:00", fin: "18:00", necessaires: 4, benevoles: ["Mehdi Nasri", "Camille Bertrand", "Valérie Dubois"] },
        ],
      },
      {
        nom: "Rangement & nettoyage",
        description: "Démontage & nettoyage",
        creneaux: [{ debut: "19:00", fin: "20:00", necessaires: 3, benevoles: [] }],
      },
    ],
  },
  {
    nom: "Pêche aux canards",
    description: "Animer le stand de pêche aux canards pour les enfants.",
    taches: [
      {
        nom: "Préparation du stand",
        description: "Installer le bassin et les lots",
        creneaux: [{ debut: "13:30", fin: "14:30", necessaires: 3, benevoles: ["Nicolas Henry", "Sarah Lambert"] }],
      },
      {
        nom: "Animation",
        description: "Accueillir les enfants au stand",
        creneaux: [
          { debut: "14:30", fin: "17:00", necessaires: 3, benevoles: ["Olivier Maréchal", "Émilie Dupont"] },
          { debut: "17:00", fin: "19:30", necessaires: 3, benevoles: ["Karim Benali"] },
        ],
      },
    ],
  },
  {
    nom: "Grimage & maquillage",
    description: "Maquiller les enfants : papillons, super-héros, animaux.",
    taches: [
      {
        nom: "Installation",
        description: "Préparer le matériel de maquillage",
        creneaux: [{ debut: "13:30", fin: "14:30", necessaires: 2, benevoles: ["Nathalie Wauters", "David Collard"] }],
      },
      {
        nom: "Maquillage",
        description: "Maquiller les enfants",
        creneaux: [
          { debut: "14:30", fin: "17:00", necessaires: 3, benevoles: ["Manon Gillet", "Pierre Lejeune"] },
          { debut: "17:00", fin: "19:30", necessaires: 3, benevoles: ["Céline Dewulf", "Antoine Renard"] },
        ],
      },
    ],
  },
  {
    nom: "Pâtisseries",
    description: "Vendre les pâtisseries préparées par les familles.",
    taches: [
      {
        nom: "Vente pâtisseries",
        description: "Tenir le stand de pâtisseries",
        creneaux: [
          { debut: "14:00", fin: "17:00", necessaires: 3, benevoles: ["Sofie Janssens", "Hugo Moreau"] },
          { debut: "17:00", fin: "20:00", necessaires: 3, benevoles: ["Léa Vandenberghe"] },
        ],
      },
    ],
  },
  {
    nom: "Accueil & billetterie",
    description: "Accueillir les familles et vendre les tickets.",
    taches: [
      {
        nom: "Accueil",
        description: "Accueillir et orienter les familles",
        creneaux: [
          { debut: "13:30", fin: "15:00", necessaires: 3, benevoles: ["Laurent Piron", "Marc Stevens", "Isabelle Close"] },
          { debut: "18:00", fin: "20:00", necessaires: 3, benevoles: ["Julie Marchal", "Fatima Zahra"] },
        ],
      },
      {
        nom: "Billetterie",
        description: "Vendre les tickets à l'entrée",
        creneaux: [
          { debut: "15:00", fin: "16:30", necessaires: 2, benevoles: ["Nicolas Henry", "Géraldine Body"] },
          { debut: "16:30", fin: "18:00", necessaires: 2, benevoles: ["Sarah Lambert", "Quentin Servais"] },
        ],
      },
    ],
  },
  {
    nom: "Barbecue",
    description: "Assurer la cuisson et le service du barbecue.",
    taches: [
      {
        nom: "Cuisson",
        description: "Cuisson des grillades",
        creneaux: [
          { debut: "17:00", fin: "18:30", necessaires: 4, benevoles: ["Damien Lecomte"] },
          { debut: "18:30", fin: "20:00", necessaires: 3, benevoles: [] },
        ],
      },
    ],
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL manquant");
  const db = createNodeDb(databaseUrl);

  console.log("→ Nettoyage de l'événement de démo (cascade)…");
  await db.delete(s.events);

  console.log("→ Insertion de l'événement…");
  const [event] = await db
    .insert(s.events)
    .values({
      slug: "vinalmont-gots-talent",
      nom: "Vinalmont Got's Talent",
      date: "Samedi 14 juin 2026",
      horaires: "14h00 – 20h00",
      lieu: "Nouvelle école — 9 rue Charles Frère, Vinalmont",
      histoire:
        "Les enfants répètent depuis des semaines pour vous offrir un spectacle inoubliable. Le comité et les bénévoles préparent cette fête avec le cœur — il ne manque plus que vous. Quelques heures suffisent à faire toute la différence.",
      banniere: null,
      couleurTheme: "#DA4A40",
      orgNom: "Comité Vinalmont",
      statut: "publie",
      dateIso: "2026-06-14",
      pourquoiTitre: "Une fête portée par les parents",
      pourquoiTexte:
        "Le comité et les bénévoles préparent cette journée avec le cœur. Chaque pôle a besoin de quelques mains pour tourner — tenir le bar une heure, accueillir les familles, ranger en fin de journée. Inscris-toi sur les créneaux qui t'arrangent : même une heure compte.",
    })
    .returning();
  const eventId = event!.id;

  // Bénévoles : insère uniquement ceux référencés dans les créneaux.
  const usedNames = new Set<string>();
  for (const p of POLES)
    for (const t of p.taches) for (const c of t.creneaux) c.benevoles.forEach((n) => usedNames.add(n));

  console.log(`→ Insertion de ${usedNames.size} bénévoles…`);
  const volRows = [...usedNames].map((nom) => {
    const v = VOL[nom];
    if (!v) throw new Error(`Bénévole inconnu dans VOL: ${nom}`);
    return { eventId, nom, email: v.email, tel: v.tel, statut: v.statut };
  });
  const insertedVols = await db.insert(s.volunteers).values(volRows).returning();
  const volIdByName = new Map(insertedVols.map((v) => [v.nom, v.id]));

  console.log("→ Insertion pôles / tâches / créneaux / inscriptions…");
  const inscriptionRows: { creneauId: string; volunteerId: string }[] = [];
  let nbCreneaux = 0;

  for (let pi = 0; pi < POLES.length; pi++) {
    const p = POLES[pi]!;
    const [pole] = await db
      .insert(s.poles)
      .values({ eventId, nom: p.nom, description: p.description, position: pi })
      .returning();
    for (let ti = 0; ti < p.taches.length; ti++) {
      const t = p.taches[ti]!;
      const [tache] = await db
        .insert(s.taches)
        .values({ poleId: pole!.id, nom: t.nom, description: t.description, position: ti })
        .returning();
      for (let ci = 0; ci < t.creneaux.length; ci++) {
        const c = t.creneaux[ci]!;
        const [creneau] = await db
          .insert(s.creneaux)
          .values({
            tacheId: tache!.id,
            debut: c.debut,
            fin: c.fin,
            necessaires: c.necessaires,
            position: ci,
          })
          .returning();
        nbCreneaux++;
        for (const nom of c.benevoles) {
          const volunteerId = volIdByName.get(nom)!;
          inscriptionRows.push({ creneauId: creneau!.id, volunteerId });
        }
      }
    }
  }

  if (inscriptionRows.length) await db.insert(s.inscriptions).values(inscriptionRows);

  console.log(
    `✓ Seed terminé : ${POLES.length} pôles, ${nbCreneaux} créneaux, ` +
      `${insertedVols.length} bénévoles, ${inscriptionRows.length} inscriptions.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Échec du seed:", err);
  process.exit(1);
});
