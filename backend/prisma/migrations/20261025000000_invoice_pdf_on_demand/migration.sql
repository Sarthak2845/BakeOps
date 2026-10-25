-- Invoice PDFs are now rendered on demand at /r/<slug>/<invoiceNumber>/pdf
-- instead of being saved under /files/invoices/. Point existing invoices at
-- the new link. Slugs and invoice numbers only contain URL-safe characters.
UPDATE "Invoice" AS i
SET "pdfUrl" = '/r/' || b."slug" || '/' || i."invoiceNumber" || '/pdf'
FROM "Business" AS b
WHERE b."id" = i."businessId";
