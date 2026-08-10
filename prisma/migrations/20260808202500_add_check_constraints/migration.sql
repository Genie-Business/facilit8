-- Prisma has no schema-level CHECK constraint support, so these are hand-written.
-- See plan §9/§10 (tingly-knitting-engelbart.md).

-- Review.rating must be within the 1-5 star range.
ALTER TABLE "Review"
  ADD CONSTRAINT "Review_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5);

-- TrainingPayment: exactly one of trainingEventId / mergedTrainingEventId must be set,
-- and it must match targetType. Replaces Django's generic-FK (ContentType) polymorphism.
ALTER TABLE "TrainingPayment"
  ADD CONSTRAINT "TrainingPayment_target_xor" CHECK (
    ("targetType" = 'TRAINING_EVENT' AND "trainingEventId" IS NOT NULL AND "mergedTrainingEventId" IS NULL)
    OR
    ("targetType" = 'MERGED_TRAINING_EVENT' AND "mergedTrainingEventId" IS NOT NULL AND "trainingEventId" IS NULL)
  );

-- ChatPricing: only one active pricing row at a time (fixes Django's "latest row wins" pattern).
-- Application code must deactivate the current active row before creating a new one.
CREATE UNIQUE INDEX "ChatPricing_single_active" ON "ChatPricing" ("isActive")
  WHERE "isActive" = true;
