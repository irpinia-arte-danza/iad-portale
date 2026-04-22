import { sendEmail } from "@/lib/resend/send-email";

async function main() {
  const to = process.argv[2];

  if (!to) {
    console.error("Usage: tsx scripts/test-email.ts <recipient-email>");
    process.exit(1);
  }

  console.log(`📧 Sending test email to: ${to}`);

  const result = await sendEmail({
    to,
    subject: "Test Resend - IAD Portale",
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: auto;">
        <h2>Test email IAD Portale</h2>
        <p>Se stai leggendo questa email, la configurazione Resend è funzionante.</p>
        <hr>
        <p><small>A.S.D. IAD Irpinia Arte Danza</small></p>
      </div>
    `,
    text: "Test email IAD Portale — configurazione Resend funzionante.\nA.S.D. IAD Irpinia Arte Danza",
  });

  if (result.success) {
    console.log(`✓ Sent. Provider id: ${result.providerId}`);
    process.exit(0);
  } else {
    console.error(`❌ Failed: ${result.error}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
