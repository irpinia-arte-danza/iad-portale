import { CourseType, PrismaClient, UserRole } from "@prisma/client";

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
      asdEmail: "info@irpiniaartedanza.it",
      asdPhone: null,
      asdWebsite: "https://irpiniaartedanza.it",
      asdIban: null,
      logoUrl: null,
      logoDarkUrl: null,
      faviconUrl: null,
    },
  });
  console.log(`✓ BrandSettings: ${brandSettings.asdName}`);

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
