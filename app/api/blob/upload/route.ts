import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import {
  PROFILE_DOCUMENT_CONTENT_TYPES,
  PROFILE_DOCUMENT_MAX_BYTES,
  PROFILE_IMAGE_CONTENT_TYPES,
  PROFILE_IMAGE_MAX_BYTES,
} from "@/lib/storage/blob";
import { isRateLimited } from "@/lib/rate-limit";

/**
 * Issues short-lived client-upload tokens for profile pictures/company logos and CV/certificate
 * PDFs. Reachable without a session on purpose — the signup form uploads an image before the
 * account exists — so the only guardrails are content-type/size limits and a per-IP rate limit.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (await isRateLimited("blob-upload", 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const isDocument = clientPayload === "document";
        return {
          allowedContentTypes: isDocument ? PROFILE_DOCUMENT_CONTENT_TYPES : PROFILE_IMAGE_CONTENT_TYPES,
          maximumSizeInBytes: isDocument ? PROFILE_DOCUMENT_MAX_BYTES : PROFILE_IMAGE_MAX_BYTES,
          addRandomSuffix: true,
          pathname: isDocument ? "profile-documents" : "profile-images",
        };
      },
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
