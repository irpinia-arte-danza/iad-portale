-- Sprint ricevuta lato admin: audit emissione e annullamento ricevute.
ALTER TYPE "AuditAction" ADD VALUE 'RECEIPT_ISSUE';
ALTER TYPE "AuditAction" ADD VALUE 'RECEIPT_CANCEL';
