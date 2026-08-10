-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FACILITATOR', 'EVENT_MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "EventApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EVENT_UPDATE', 'BID_RECEIVED', 'BID_ACCEPTED', 'BID_REJECTED', 'PAYMENT_CONFIRMED', 'CHAT_MESSAGE', 'EVENT_REMINDER', 'KYC_STATUS', 'WEBHOOK_ALERT', 'MERGED_TRAINING_FUNDED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TrainingPaymentTargetType" AS ENUM ('TRAINING_EVENT', 'MERGED_TRAINING_EVENT');

-- CreateEnum
CREATE TYPE "TrainingPaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('FUNDING', 'PAYOUT', 'WITHDRAWAL', 'CHAT_PAYMENT', 'INTERNAL_TRANSFER', 'FEE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PlatformFeeScope" AS ENUM ('FACILITATOR_PAYOUT', 'CHAT_ACCESS', 'WITHDRAWAL', 'MERGED_TRAINING_PAYOUT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "slug" TEXT NOT NULL,
    "mobilePhone" TEXT NOT NULL,
    "organization" TEXT,
    "rcNumber" TEXT,
    "specialization" TEXT,
    "qualification" TEXT,
    "travel" BOOLEAN NOT NULL DEFAULT false,
    "experience" TEXT,
    "profileDescription" TEXT,
    "state" TEXT,
    "localGovt" TEXT,
    "address" TEXT,
    "profileImageUrl" TEXT,
    "cvUrl" TEXT,
    "certificateUrl" TEXT,
    "bvn" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "kycVerified" BOOLEAN NOT NULL DEFAULT false,
    "kycFailedReason" TEXT,
    "kycTier" INTEGER NOT NULL DEFAULT 0,
    "anchorCustomerId" TEXT,
    "anchorCounterpartyId" TEXT,
    "depositAccountId" TEXT,
    "anchorAccountId" TEXT,
    "anchorVaId" TEXT,
    "vaAccountNumber" TEXT,
    "vaAccountName" TEXT,
    "vaBankName" TEXT,
    "vaCreationFailed" BOOLEAN NOT NULL DEFAULT false,
    "vaFailureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirtualAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'anchor',
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT,
    "bankName" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VirtualAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(14,2) NOT NULL,
    "feeAmount" DECIMAL(14,2),
    "netAmount" DECIMAL(14,2),
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "reference" TEXT NOT NULL,
    "anchorTransferId" TEXT,
    "counterpartyAccountNumber" TEXT,
    "counterpartyBankCode" TEXT,
    "description" TEXT,
    "relatedTrainingEventId" TEXT,
    "relatedMergedTrainingEventId" TEXT,
    "relatedConversationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformFee" (
    "id" TEXT NOT NULL,
    "scope" "PlatformFeeScope" NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "flyerImageUrl" TEXT,
    "capacity" INTEGER NOT NULL,
    "skillType" TEXT NOT NULL,
    "expectedTrainingSkills" TEXT,
    "eventObjective" TEXT,
    "delegatesLevel" TEXT NOT NULL,
    "eventCategory" TEXT NOT NULL,
    "venueType" TEXT NOT NULL,
    "seriesLength" INTEGER,
    "durationDays" INTEGER NOT NULL,
    "eventExpiryDate" TIMESTAMP(3) NOT NULL,
    "eventDetails" TEXT,
    "trainingMaterials" BOOLEAN NOT NULL DEFAULT false,
    "trainingBudget" DECIMAL(14,2) NOT NULL,
    "approval" "EventApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "paymentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "selectedTrainerId" TEXT,
    "slug" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "trainingEventId" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "courseBreakdown" TEXT,
    "objective" TEXT,
    "classActivities" TEXT,
    "budgetPerDelegate" DECIMAL(14,2) NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "revieweeId" TEXT NOT NULL,
    "trainingEventId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPayment" (
    "id" TEXT NOT NULL,
    "targetType" "TrainingPaymentTargetType" NOT NULL,
    "trainingEventId" TEXT,
    "mergedTrainingEventId" TEXT,
    "facilitatorId" TEXT NOT NULL,
    "grossAmount" DECIMAL(14,2) NOT NULL,
    "feeAmount" DECIMAL(14,2) NOT NULL,
    "netAmount" DECIMAL(14,2) NOT NULL,
    "reference" TEXT NOT NULL,
    "rawResponse" JSONB,
    "status" "TrainingPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatPricing" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "eventManagerId" TEXT NOT NULL,
    "facilitatorId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "paymentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "accessGranted" BOOLEAN NOT NULL DEFAULT false,
    "accessExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilitatorAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "facilitatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilitatorAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatPayment" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "pricingId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnchorWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processingError" TEXT,

    CONSTRAINT "AnchorWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MergedTrainingEvent" (
    "id" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "delegatesLevel" TEXT NOT NULL,
    "eventCategory" TEXT NOT NULL,
    "venueType" TEXT NOT NULL,
    "totalSlots" INTEGER NOT NULL,
    "pricePerDelegate" DECIMAL(14,2) NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "isInviteOnly" BOOLEAN NOT NULL DEFAULT false,
    "isFullyFunded" BOOLEAN NOT NULL DEFAULT false,
    "isPostedToBoard" BOOLEAN NOT NULL DEFAULT false,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "selectedTrainerId" TEXT,
    "approval" "EventApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "paymentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "votingNotified" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MergedTrainingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MergedTrainingInvite" (
    "id" TEXT NOT NULL,
    "mergedTrainingEventId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MergedTrainingInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MergedTrainingParticipant" (
    "id" TEXT NOT NULL,
    "mergedTrainingEventId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "numDelegates" INTEGER NOT NULL,
    "amountPaid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "hasPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MergedTrainingParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MergerApplication" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "mergedTrainingEventId" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "courseBreakdown" TEXT,
    "objective" TEXT,
    "classActivities" TEXT,
    "budgetPerDelegate" DECIMAL(14,2) NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT NOT NULL,

    CONSTRAINT "MergerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BidVote" (
    "id" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "mergerApplicationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BidVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "icon" TEXT,
    "title" TEXT NOT NULL,
    "info" TEXT,
    "summary" TEXT,
    "imageUrl" TEXT,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "linkedinUrl" TEXT,
    "twitterUrl" TEXT,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "imageUrl" TEXT,
    "bio" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountUp" (
    "id" TEXT NOT NULL,
    "trait" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "summary" TEXT,
    "serviceId" TEXT,
    "teamMemberId" TEXT,

    CONSTRAINT "CountUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AboutUs" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "videoUrl" TEXT,
    "mission" TEXT,
    "vision" TEXT,
    "testimonialImageUrls" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AboutUs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Newsletter" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Newsletter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQ" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FAQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomepageContent" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "blocks" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingContent" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "tiers" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_slug_key" ON "User"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_mobilePhone_key" ON "User"("mobilePhone");

-- CreateIndex
CREATE UNIQUE INDEX "User_rcNumber_key" ON "User"("rcNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_anchorCustomerId_key" ON "User"("anchorCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_anchorCounterpartyId_key" ON "User"("anchorCounterpartyId");

-- CreateIndex
CREATE UNIQUE INDEX "User_depositAccountId_key" ON "User"("depositAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "User_anchorAccountId_key" ON "User"("anchorAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "User_anchorVaId_key" ON "User"("anchorVaId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VirtualAccount_userId_key" ON "VirtualAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reference_key" ON "Transaction"("reference");

-- CreateIndex
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_reference_idx" ON "Transaction"("reference");

-- CreateIndex
CREATE INDEX "PlatformFee_scope_isActive_idx" ON "PlatformFee"("scope", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingEvent_slug_key" ON "TrainingEvent"("slug");

-- CreateIndex
CREATE INDEX "TrainingEvent_companyId_idx" ON "TrainingEvent"("companyId");

-- CreateIndex
CREATE INDEX "TrainingEvent_approval_isAvailable_idx" ON "TrainingEvent"("approval", "isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "Application_slug_key" ON "Application"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Application_trainerId_trainingEventId_key" ON "Application"("trainerId", "trainingEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_slug_key" ON "Notification"("slug");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_reviewerId_trainingEventId_key" ON "Review"("reviewerId", "trainingEventId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingPayment_reference_key" ON "TrainingPayment"("reference");

-- CreateIndex
CREATE INDEX "TrainingPayment_targetType_trainingEventId_idx" ON "TrainingPayment"("targetType", "trainingEventId");

-- CreateIndex
CREATE INDEX "TrainingPayment_targetType_mergedTrainingEventId_idx" ON "TrainingPayment"("targetType", "mergedTrainingEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_slug_key" ON "Conversation"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_eventManagerId_facilitatorId_key" ON "Conversation"("eventManagerId", "facilitatorId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FacilitatorAccess_userId_facilitatorId_key" ON "FacilitatorAccess"("userId", "facilitatorId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatPayment_conversationId_key" ON "ChatPayment"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "AnchorWebhookEvent_eventId_key" ON "AnchorWebhookEvent"("eventId");

-- CreateIndex
CREATE INDEX "AnchorWebhookEvent_eventType_idx" ON "AnchorWebhookEvent"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "MergedTrainingEvent_slug_key" ON "MergedTrainingEvent"("slug");

-- CreateIndex
CREATE INDEX "MergedTrainingEvent_initiatorId_idx" ON "MergedTrainingEvent"("initiatorId");

-- CreateIndex
CREATE INDEX "MergedTrainingEvent_isPostedToBoard_isFullyFunded_idx" ON "MergedTrainingEvent"("isPostedToBoard", "isFullyFunded");

-- CreateIndex
CREATE UNIQUE INDEX "MergedTrainingInvite_mergedTrainingEventId_companyId_key" ON "MergedTrainingInvite"("mergedTrainingEventId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "MergedTrainingParticipant_mergedTrainingEventId_companyId_key" ON "MergedTrainingParticipant"("mergedTrainingEventId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "MergerApplication_slug_key" ON "MergerApplication"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MergerApplication_trainerId_mergedTrainingEventId_key" ON "MergerApplication"("trainerId", "mergedTrainingEventId");

-- CreateIndex
CREATE UNIQUE INDEX "BidVote_voterId_mergerApplicationId_key" ON "BidVote"("voterId", "mergerApplicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Newsletter_email_key" ON "Newsletter"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LegalPage_slug_key" ON "LegalPage"("slug");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VirtualAccount" ADD CONSTRAINT "VirtualAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEvent" ADD CONSTRAINT "TrainingEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEvent" ADD CONSTRAINT "TrainingEvent_selectedTrainerId_fkey" FOREIGN KEY ("selectedTrainerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_trainingEventId_fkey" FOREIGN KEY ("trainingEventId") REFERENCES "TrainingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_trainingEventId_fkey" FOREIGN KEY ("trainingEventId") REFERENCES "TrainingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPayment" ADD CONSTRAINT "TrainingPayment_trainingEventId_fkey" FOREIGN KEY ("trainingEventId") REFERENCES "TrainingEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPayment" ADD CONSTRAINT "TrainingPayment_mergedTrainingEventId_fkey" FOREIGN KEY ("mergedTrainingEventId") REFERENCES "MergedTrainingEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPayment" ADD CONSTRAINT "TrainingPayment_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_eventManagerId_fkey" FOREIGN KEY ("eventManagerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilitatorAccess" ADD CONSTRAINT "FacilitatorAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilitatorAccess" ADD CONSTRAINT "FacilitatorAccess_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatPayment" ADD CONSTRAINT "ChatPayment_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatPayment" ADD CONSTRAINT "ChatPayment_pricingId_fkey" FOREIGN KEY ("pricingId") REFERENCES "ChatPricing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MergedTrainingEvent" ADD CONSTRAINT "MergedTrainingEvent_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MergedTrainingEvent" ADD CONSTRAINT "MergedTrainingEvent_selectedTrainerId_fkey" FOREIGN KEY ("selectedTrainerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MergedTrainingInvite" ADD CONSTRAINT "MergedTrainingInvite_mergedTrainingEventId_fkey" FOREIGN KEY ("mergedTrainingEventId") REFERENCES "MergedTrainingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MergedTrainingInvite" ADD CONSTRAINT "MergedTrainingInvite_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MergedTrainingParticipant" ADD CONSTRAINT "MergedTrainingParticipant_mergedTrainingEventId_fkey" FOREIGN KEY ("mergedTrainingEventId") REFERENCES "MergedTrainingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MergedTrainingParticipant" ADD CONSTRAINT "MergedTrainingParticipant_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MergerApplication" ADD CONSTRAINT "MergerApplication_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MergerApplication" ADD CONSTRAINT "MergerApplication_mergedTrainingEventId_fkey" FOREIGN KEY ("mergedTrainingEventId") REFERENCES "MergedTrainingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidVote" ADD CONSTRAINT "BidVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidVote" ADD CONSTRAINT "BidVote_mergerApplicationId_fkey" FOREIGN KEY ("mergerApplicationId") REFERENCES "MergerApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountUp" ADD CONSTRAINT "CountUp_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountUp" ADD CONSTRAINT "CountUp_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
