export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const PROFILE_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const PROFILE_DOCUMENT_CONTENT_TYPES = ["application/pdf"];

// Organization verification documents (CAC certificate, proof of address): scans and photos as well as PDFs.
export const ORGANIZATION_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ORGANIZATION_DOCUMENT_CONTENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

/**
 * True only for an address our own Vercel Blob storage could have issued. A file's URL travels through
 * the browser on its way to the database, so without this a user could attach any link at all (and an
 * admin reviewing the organization would be one click from it).
 */
export function isAllowedDocumentUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com") && url.username === "" && url.password === "";
  } catch {
    return false;
  }
}
