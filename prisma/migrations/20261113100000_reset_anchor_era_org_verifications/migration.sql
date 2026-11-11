-- Organizations that were part-way through verification at Anchor can't finish: the Anchor webhooks that
-- moved them along are gone, and they have no documents in our own storage for an admin to review.
-- Send them back to the start with an explanation, so the owner submits again under the manual review.
--
-- The new flow always records verificationSubmittedAt when it accepts a submission, so an organization that
-- is in flight WITHOUT one was started under Anchor. Verified and rejected organizations are left alone.
UPDATE "Organization"
SET "verificationStatus" = 'UNVERIFIED',
    "verificationFailedReason" = 'We have changed how organizations are verified. Please submit your business details again and upload your documents.'
WHERE "verificationStatus" IN ('PENDING', 'AWAITING_DOCUMENTS')
  AND "verificationSubmittedAt" IS NULL;
