-- Wallets move from Anchor to Paystack with a fresh start (no balances are carried over). Users who verified
-- or began verifying under Anchor still hold Anchor's deposit-account id and virtual account number, which
-- the new code would show them as "Fund via ..." even though money sent there no longer reaches us. Their
-- saved bank may also carry an Anchor bank code that Paystack doesn't recognise.
--
-- Send them back to the start: no wallet, not verified, no saved bank. They verify their identity again on
-- Paystack, which links their bank (from Paystack's own list) and creates their new virtual account.
--
-- Only users with wallet-style data and NO Paystack footprint and NO ledger wallet are touched, so anyone who
-- has already gone through the new flow is left alone. Anchor's own id columns are not modified.
UPDATE "User" AS u
SET "depositAccountId" = NULL,
    "vaAccountNumber" = NULL,
    "vaAccountName" = NULL,
    "vaBankName" = NULL,
    "vaCreationFailed" = false,
    "vaFailureReason" = NULL,
    "kycVerified" = false,
    "kycTier" = 0,
    "kycFailedReason" = NULL,
    "linkedBankCode" = NULL,
    "linkedBankName" = NULL,
    "linkedAccountNumber" = NULL,
    "linkedAccountName" = NULL
WHERE u."paystackCustomerCode" IS NULL
  AND u."paystackRecipientCode" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "WalletAccount" AS w WHERE w."userId" = u."id")
  AND (
        u."depositAccountId" IS NOT NULL
     OR u."vaAccountNumber" IS NOT NULL
     OR u."kycVerified" = true
     OR u."vaCreationFailed" = true
     OR u."anchorCustomerId" IS NOT NULL
     OR u."anchorAccountId" IS NOT NULL
     OR u."linkedBankCode" IS NOT NULL
  );
