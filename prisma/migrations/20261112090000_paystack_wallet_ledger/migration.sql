-- CreateEnum
CREATE TYPE "WalletAccountKind" AS ENUM ('USER', 'ESCROW', 'REVENUE', 'TRANSFERS_PENDING', 'PAYSTACK_FEES', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "LedgerJournalType" AS ENUM ('DEPOSIT', 'EVENT_FUNDING', 'MERGED_FUNDING', 'PAYOUT', 'REFUND', 'CHAT_PAYMENT', 'AWE_SUBSCRIPTION', 'WITHDRAWAL_HOLD', 'WITHDRAWAL_SETTLE', 'WITHDRAWAL_RELEASE', 'WITHDRAWAL_REVERSAL', 'ADJUSTMENT');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'DEPOSIT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "paystackCustomerCode" TEXT,
ADD COLUMN     "paystackRecipientCode" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "paystackTransferCode" TEXT;

-- CreateTable
CREATE TABLE "WalletAccount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "WalletAccountKind" NOT NULL,
    "userId" TEXT,
    "balance" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerJournal" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "LedgerJournalType" NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DECIMAL(16,2) NOT NULL,
    "balanceAfter" DECIMAL(16,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaystackWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processingError" TEXT,

    CONSTRAINT "PaystackWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletAccount_code_key" ON "WalletAccount"("code");

-- CreateIndex
CREATE UNIQUE INDEX "WalletAccount_userId_key" ON "WalletAccount"("userId");

-- CreateIndex
CREATE INDEX "WalletAccount_kind_idx" ON "WalletAccount"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerJournal_reference_key" ON "LedgerJournal"("reference");

-- CreateIndex
CREATE INDEX "LedgerEntry_accountId_createdAt_idx" ON "LedgerEntry"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_journalId_idx" ON "LedgerEntry"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "PaystackWebhookEvent_eventKey_key" ON "PaystackWebhookEvent"("eventKey");

-- CreateIndex
CREATE INDEX "PaystackWebhookEvent_eventType_idx" ON "PaystackWebhookEvent"("eventType");

-- CreateIndex
CREATE INDEX "PaystackWebhookEvent_processed_receivedAt_idx" ON "PaystackWebhookEvent"("processed", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_paystackCustomerCode_key" ON "User"("paystackCustomerCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_paystackRecipientCode_key" ON "User"("paystackRecipientCode");

-- AddForeignKey
ALTER TABLE "WalletAccount" ADD CONSTRAINT "WalletAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "LedgerJournal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "WalletAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Safety net that Prisma can't express: a wallet can never be overdrawn. Only the PAYSTACK_FEES
-- (an expense) and EXTERNAL (the outside world) accounts are meant to run negative.
ALTER TABLE "WalletAccount" ADD CONSTRAINT "WalletAccount_balance_non_negative"
  CHECK ("balance" >= 0 OR "kind" IN ('PAYSTACK_FEES', 'EXTERNAL'));
