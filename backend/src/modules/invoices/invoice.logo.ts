import { moduleLogger } from "../../utils/logger";
import { isAllowedLogoUrl } from "../business/business.schema";

const log = moduleLogger("invoices");

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 5000;

/**
 * Downloads a business logo for embedding in a PDF. Asks Cloudinary for a
 * small PNG (pdfkit only understands PNG/JPEG, and uploads may be WebP/HEIC).
 * Returns null on any failure — a missing logo must never block an invoice.
 */
export async function fetchLogoForPdf(logoUrl: string | null | undefined): Promise<Buffer | null> {
  if (!logoUrl) return null;
  if (!isAllowedLogoUrl(logoUrl)) {
    log.warn({ event: "invoice.logo_skipped", reason: "disallowed_url" }, "logo URL is not an allowed Cloudinary URL");
    return null;
  }

  const pngUrl = logoUrl.replace("/image/upload/", "/image/upload/c_limit,w_300,h_300,f_png/");

  try {
    const res = await fetch(pngUrl, { redirect: "error", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const type = res.headers.get("content-type") ?? "";
    if (!/^image\/(png|jpe?g)\b/.test(type)) throw new Error(`unsupported content-type ${type}`);

    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_LOGO_BYTES) throw new Error(`too large (${declared} bytes)`);

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_LOGO_BYTES) throw new Error(`too large (${buffer.length} bytes)`);
    return buffer;
  } catch (err) {
    log.warn(
      { event: "invoice.logo_fetch_failed", reason: err instanceof Error ? err.message : String(err) },
      "could not fetch business logo; rendering invoice without it"
    );
    return null;
  }
}
