import { CourseType, EmailCategory, PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  const academicYear = await prisma.academicYear.upsert({
    where: { label: "2025-2026" },
    update: {},
    create: {
      label: "2025-2026",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-08-31"),
      isCurrent: true,
      associationFeeCents: 5000,
      monthlyRenewalDay: 10,
    },
  });
  console.log(`✓ AcademicYear: ${academicYear.label}`);

  const fiscalYear = await prisma.fiscalYear.upsert({
    where: { year: 2026 },
    update: {},
    create: {
      year: 2026,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      isCurrent: true,
    },
  });
  console.log(`✓ FiscalYear: ${fiscalYear.year}`);

  const brandSettings = await prisma.brandSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      asdName: "A.S.D. IAD Irpinia Arte Danza",
      asdFiscalCode: "90029290641",
      asdAddress: "Via Cervinaro, 14 - 83048 Montella (AV)",
      addressStreet: "Via Cervinaro, 14",
      addressZip: "83048",
      addressCity: "Montella",
      addressProvince: "AV",
      gymSameAsLegal: true,
      asdEmail: "info@irpiniaartedanza.it",
      asdPhone: null,
      asdWebsite: "https://irpiniaartedanza.it",
      asdIban: null,
      logoUrl: null,
      logoDarkUrl: null,
      logoSvgUrl: null,
      faviconUrl: null,
    },
  });
  console.log(`✓ BrandSettings: ${brandSettings.asdName}`);

  const receiptSettings = await prisma.receiptSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      receiptPrefix: "IAD/",
      receiptNumber: 0,
      receiptFooter: null,
    },
  });
  console.log(
    `✓ ReceiptSettings: prefix=${receiptSettings.receiptPrefix} counter=${receiptSettings.receiptNumber}`,
  );

  const reminderConfig = await prisma.reminderConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      enabled: false,
    },
  });
  console.log(`✓ ReminderConfig: enabled=${reminderConfig.enabled}`);

  const adminUuid = process.env.ADMIN_SUPABASE_UUID;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminFirstName = process.env.ADMIN_FIRST_NAME;
  const adminLastName = process.env.ADMIN_LAST_NAME;

  if (adminUuid && adminEmail && adminFirstName && adminLastName) {
    const admin = await prisma.user.upsert({
      where: { id: adminUuid },
      update: {},
      create: {
        id: adminUuid,
        email: adminEmail,
        role: UserRole.ADMIN,
        firstName: adminFirstName,
        lastName: adminLastName,
        phone: null,
        isActive: true,
        themePreference: null,
        deletedAt: null,
      },
    });
    console.log(`✓ Admin User: ${admin.email}`);
  } else {
    console.warn(
      "⚠️  Admin seed skipped: set ADMIN_SUPABASE_UUID, ADMIN_EMAIL, ADMIN_FIRST_NAME, ADMIN_LAST_NAME in .env.local to bootstrap admin user"
    );
  }

  const iadCourses: Array<{
    name: string
    type: CourseType
    minAge: number | null
    maxAge: number | null
    monthlyFeeCents: number
    level: string
    description: string
  }> = [
    {
      name: "Gioco Danza",
      type: CourseType.GIOCO_DANZA,
      minAge: 3,
      maxAge: 5,
      monthlyFeeCents: 3500,
      level: "Base",
      description: "Avvicinamento al movimento per i più piccoli",
    },
    {
      name: "Propedeutica",
      type: CourseType.PROPEDEUTICA,
      minAge: 6,
      maxAge: 8,
      monthlyFeeCents: 4000,
      level: "Base",
      description: "Fondamenti della danza per bambine",
    },
    {
      name: "Danza Classica",
      type: CourseType.DANZA_CLASSICA,
      minAge: 8,
      maxAge: null,
      monthlyFeeCents: 4500,
      level: "Intermedio",
      description: "Tecnica accademica classica",
    },
    {
      name: "Danza Moderna",
      type: CourseType.DANZA_MODERNA,
      minAge: 8,
      maxAge: null,
      monthlyFeeCents: 4500,
      level: "Intermedio",
      description: "Tecniche moderne e contemporanee",
    },
    {
      name: "Danza Contemporanea",
      type: CourseType.DANZA_CONTEMPORANEA,
      minAge: 12,
      maxAge: null,
      monthlyFeeCents: 5000,
      level: "Avanzato",
      description: "Espressione corporea contemporanea",
    },
  ];

  const emailTemplates: Array<{
    slug: string
    name: string
    description: string
    category: EmailCategory
    subject: string
    bodyHtml: string
    bodyText?: string
  }> = [
    {
      slug: "sollecito-scadenza",
      name: "Sollecito scadenza pagamento",
      description: "Email per quote scadute non pagate",
      category: EmailCategory.SOLLECITO,
      subject: "Promemoria: quota {mese} - {allieva_nome}",
      bodyHtml: `<p>Gentile {genitore_nome},</p>
<p>le ricordiamo che la quota di <strong>{mese}</strong> per {allieva_nome} risulta ancora da saldare.</p>
<ul>
  <li><strong>Importo</strong>: {importo}</li>
  <li><strong>Scadenza</strong>: {data_scadenza}</li>
</ul>
<p>La preghiamo di regolarizzare quanto prima.</p>
<p>Per informazioni: <a href="mailto:info@irpiniaartedanza.it">info@irpiniaartedanza.it</a></p>
<hr>
<p><small>Email automatica, non rispondere.<br>
A.S.D. IAD Irpinia Arte Danza</small></p>`,
      bodyText: `Gentile {genitore_nome},
la quota di {mese} per {allieva_nome} è da saldare.
Importo: {importo}
Scadenza: {data_scadenza}
Info: info@irpiniaartedanza.it
A.S.D. IAD Irpinia Arte Danza`,
    },
    {
      slug: "promemoria-scadenza",
      name: "Promemoria scadenza in arrivo",
      description: "Avviso anticipato 7gg prima scadenza",
      category: EmailCategory.PROMEMORIA,
      subject: "Scadenza in arrivo - quota {mese}",
      bodyHtml: `<p>Gentile {genitore_nome},</p>
<p>la quota di {mese} per {allieva_nome} scade il <strong>{data_scadenza}</strong>.</p>
<p>Importo: <strong>{importo}</strong></p>
<p>Grazie per il pagamento puntuale.</p>
<hr>
<p><small>A.S.D. IAD Irpinia Arte Danza</small></p>`,
    },
    {
      slug: "benvenuto-iscrizione",
      name: "Benvenuto nuova allieva",
      description: "Email dopo nuova iscrizione",
      category: EmailCategory.BENVENUTO,
      subject: "Benvenuta in A.S.D. IAD - {allieva_nome}",
      bodyHtml: `<p>Gentile {genitore_nome},</p>
<p>siamo felici di accogliere <strong>{allieva_nome}</strong> nel corso di {corso_nome}.</p>
<p>Per informazioni: info@irpiniaartedanza.it</p>
<hr>
<p><small>A.S.D. IAD Irpinia Arte Danza</small></p>`,
    },
    {
      slug: "cert-reminder",
      name: "Promemoria certificato medico",
      description:
        "Avviso al genitore quando il certificato medico è in scadenza o scaduto",
      category: EmailCategory.PROMEMORIA,
      subject:
        "Certificato medico {tipo_certificato} di {allieva_nome} — scadenza {data_scadenza}",
      bodyHtml: `<p>Gentile {genitore_nome},</p>
<p>le ricordiamo che il certificato medico <strong>{tipo_certificato}</strong> di <strong>{allieva_nome}</strong> scade il <strong>{data_scadenza}</strong> ({giorni_scadenza} giorni).</p>
<p>Per consentire la prosecuzione delle attività in palestra, le chiediamo di provvedere al rinnovo prima della scadenza.</p>
<p>Una volta effettuata la visita medica, può consegnare il nuovo certificato in segreteria oppure inviarlo via email a <a href="mailto:info@irpiniaartedanza.it">info@irpiniaartedanza.it</a>.</p>
<p>Grazie per la collaborazione.</p>
<hr>
<p><small>A.S.D. IAD Irpinia Arte Danza</small></p>`,
      bodyText: `Gentile {genitore_nome},
il certificato medico {tipo_certificato} di {allieva_nome} scade il {data_scadenza} ({giorni_scadenza} giorni).
Per la prosecuzione delle attività, è necessario il rinnovo prima della scadenza.
Consegna in segreteria o via email a info@irpiniaartedanza.it.
A.S.D. IAD Irpinia Arte Danza`,
    },
    {
      slug: "conferma-pagamento",
      name: "Conferma pagamento ricevuto",
      description: "Email dopo registrazione pagamento",
      category: EmailCategory.CONFERMA,
      subject: "Pagamento ricevuto - {allieva_nome}",
      bodyHtml: `<p>Gentile {genitore_nome},</p>
<p>confermiamo il ricevimento del pagamento per {allieva_nome}:</p>
<ul>
  <li>Importo: <strong>{importo}</strong></li>
  <li>Tipo: {tipo_quota}</li>
  <li>Data: {data_pagamento}</li>
  <li>Metodo: {metodo}</li>
</ul>
<p>La ricevuta PDF può essere richiesta a info@irpiniaartedanza.it</p>
<hr>
<p><small>A.S.D. IAD Irpinia Arte Danza</small></p>`,
    },
  ]

  for (const tpl of emailTemplates) {
    await prisma.emailTemplate.upsert({
      where: { slug: tpl.slug },
      update: {},
      create: tpl,
    })
  }
  console.log(`✓ EmailTemplate: ${emailTemplates.length} seeded`)

  for (const course of iadCourses) {
    const existing = await prisma.course.findFirst({
      where: { name: course.name, type: course.type },
    });
    if (!existing) {
      await prisma.course.create({ data: course });
      console.log(`✓ Course ${course.name} created`);
    } else {
      console.log(`- Course ${course.name} already exists (skip)`);
    }
  }

  console.log("🎉 Seed completed.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
