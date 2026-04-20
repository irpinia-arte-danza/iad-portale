import { PrismaClient, UserRole } from "@prisma/client";

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
