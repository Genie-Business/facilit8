import { describe, expect, it } from "vitest";

import { isAllowedDocumentUrl } from "./blob";

describe("isAllowedDocumentUrl", () => {
  it("accepts a file in our Vercel Blob storage", () => {
    expect(isAllowedDocumentUrl("https://abc123.public.blob.vercel-storage.com/organization-documents/cac-x1Y2.pdf")).toBe(true);
  });

  it("refuses other hosts, including look-alikes", () => {
    expect(isAllowedDocumentUrl("https://evil.example.com/cac.pdf")).toBe(false);
    expect(isAllowedDocumentUrl("https://public.blob.vercel-storage.com.evil.example.com/cac.pdf")).toBe(false);
    expect(isAllowedDocumentUrl("https://evilpublic.blob.vercel-storage.com.attacker.io/x")).toBe(false);
    expect(isAllowedDocumentUrl("https://abc123.public.blob.vercel-storage.com@evil.example.com/cac.pdf")).toBe(false);
  });

  it("refuses insecure, non-web and malformed values", () => {
    expect(isAllowedDocumentUrl("http://abc123.public.blob.vercel-storage.com/cac.pdf")).toBe(false);
    expect(isAllowedDocumentUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedDocumentUrl("data:application/pdf;base64,AAAA")).toBe(false);
    expect(isAllowedDocumentUrl("")).toBe(false);
    expect(isAllowedDocumentUrl("not a url")).toBe(false);
  });

  it("refuses credentials embedded in the address", () => {
    expect(isAllowedDocumentUrl("https://user:pw@abc123.public.blob.vercel-storage.com/cac.pdf")).toBe(false);
  });
});
