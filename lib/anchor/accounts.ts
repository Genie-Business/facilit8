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

/** Mirrors webapp/utils.py::get_user_account_balance. Returns 0 on any failure. */
export async function getAccountBalance(depositAccountId: string): Promise<number> {
  try {
    const result = await anchorRequest<AnchorDocument<BalanceAttrs>>(`/accounts/balance/${depositAccountId}`);
    return koboToNaira(Number(result.data.attributes.availableBalance));
  } catch {
    return 0;
  }
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
