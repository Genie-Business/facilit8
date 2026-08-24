import { anchorRequest, koboToNaira } from "./client";
import type { AnchorDocument } from "./types";

interface DepositAccountAttrs {
  productName: string;
}

/**
 * Creates a DepositAccount for a customer. Mirrors Django's
 * payment/utils.py::trigger_anchor_infrastructure — 200/201/202 all mean the request was
 * accepted; the account details themselves arrive later via webhook.
 */
export async function createDepositAccount(anchorCustomerId: string): Promise<string> {
  const result = await anchorRequest<AnchorDocument<DepositAccountAttrs>>("/accounts", {
    method: "POST",
    body: {
      data: {
        type: "DepositAccount",
        attributes: { productName: "SAVINGS" },
        relationships: {
          customer: { data: { id: anchorCustomerId, type: "IndividualCustomer" } },
        },
      },
    },
  });
  return result.data.id;
}

interface BalanceAttrs {
  availableBalance: number;
  ledgerBalance?: number;
}

/** Mirrors webapp/utils.py::get_user_account_balance. Returns 0 on any failure -- but logs
 * it first, so a real balance silently showing as ₦0 in the UI is diagnosable from Vercel's
 * logs instead of needing an ad-hoc script to tell a hidden failure apart from a real zero. */
export async function getAccountBalance(depositAccountId: string): Promise<number> {
  try {
    const result = await anchorRequest<AnchorDocument<BalanceAttrs>>(`/accounts/balance/${depositAccountId}`);
    return koboToNaira(Number(result.data.attributes.availableBalance));
  } catch (err) {
    console.error(`getAccountBalance failed for deposit account ${depositAccountId}:`, err);
    return 0;
  }
}

interface AccountNumberAttrs {
  accountNumber: string;
  accountName?: string;
  isDefault?: boolean;
  bank?: { name?: string };
}

interface AccountNumberListResponse {
  data: { attributes: AccountNumberAttrs }[];
}

/**
 * Anchor never sends the unmasked account number over a webhook (account.opened etc. always
 * carry a masked "*****NNNN" value) — the real 10-digit number only comes from this direct
 * API call, confirmed against https://docs.getanchor.co/docs/account-numbers. Returns null if
 * none exist yet (e.g. called too soon after account creation).
 */
export async function fetchUnmaskedAccountNumber(
  depositAccountId: string
): Promise<{ accountNumber: string; accountName: string | null; bankName: string | null } | null> {
  const result = await anchorRequest<AccountNumberListResponse>(`/account-numbers?AccountId=${depositAccountId}`);
  const entry = result.data.find((d) => d.attributes.isDefault) ?? result.data[0];
  if (!entry) return null;
  return {
    accountNumber: entry.attributes.accountNumber,
    accountName: entry.attributes.accountName ?? null,
    bankName: entry.attributes.bank?.name ?? null,
  };
}

interface VerifyAccountResponse {
  data?: {
    accountName?: string;
    attributes?: { accountName?: string };
  };
}

/**
 * Resolves the account holder's name for a bank + account number pair, so signup can
 * confirm the name before creating the CounterParty. Mirrors
 * webapp/views.py::verify_account — same endpoint, same fallback across response shapes.
 * Returns null (never throws) when the account can't be verified, so the caller can fall
 * back to manual entry.
 */
export async function resolveAccountName(bankCode: string, accountNumber: string): Promise<string | null> {
  try {
    const result = await anchorRequest<VerifyAccountResponse>(`/payments/verify-account/${bankCode}/${accountNumber}`);
    return result.data?.accountName ?? result.data?.attributes?.accountName ?? null;
  } catch {
    return null;
  }
}
