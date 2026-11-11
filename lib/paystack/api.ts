import { normalizeNigerianPhone } from "../utils/phone";
import { isPaystackTestMode, paystackRequest, paystackRequestWithMeta, PaystackApiError } from "./client";
import { normalizeTransferStatus, type TransferOutcome } from "./status";

// Every Paystack endpoint Facilit8 uses, typed and converted to naira/camelCase. Amounts cross the
// wire in kobo; nothing outside this file ever sees a kobo figure from Paystack.
//
// Written from Paystack's published docs. Fields marked "unverified" are the ones to check first
// against a live TEST key — they're the likeliest places for a surprise.

const NAIRA = (kobo: number | null | undefined) => (typeof kobo === "number" ? kobo / 100 : 0);
const KOBO = (naira: number) => Math.round(naira * 100);

/** Paystack wants E.164 (+2348012345678); we store 08012345678. Returns undefined if it can't be made valid. */
export function toE164(phone: string): string | undefined {
  const local = normalizeNigerianPhone(phone);
  return local ? `+234${local.slice(1)}` : undefined;
}

// ---------- banks ----------

export interface PaystackBank {
  code: string;
  name: string;
}

interface BankRow {
  name: string;
  code: string;
  active?: boolean;
  is_deleted?: boolean | null;
  currency?: string;
  type?: string;
}

/** Paystack's own bank codes (3-digit, e.g. Access Bank "044") — the ones transfer recipients take. */
export async function listBanks(): Promise<PaystackBank[]> {
  const perPage = 100;
  const banks: PaystackBank[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data } = await paystackRequestWithMeta<BankRow[]>("/bank", { country: "nigeria", currency: "NGN", perPage, page });
    for (const bank of data ?? []) {
      if (bank.active === false || bank.is_deleted) continue;
      banks.push({ code: bank.code, name: bank.name });
    }
    if (!data || data.length < perPage) break;
  }
  // The same bank can appear under more than one type (e.g. NUBAN and a wallet product).
  const seen = new Set<string>();
  return banks.filter((bank) => !seen.has(bank.code) && !!seen.add(bank.code)).sort((a, b) => a.name.localeCompare(b.name));
}

/** The account holder's name, or null if it can't be resolved (the caller falls back to manual entry). */
export async function resolveAccountName(accountNumber: string, bankCode: string): Promise<string | null> {
  try {
    const data = await paystackRequest<{ account_name?: string }>("/bank/resolve", {
      query: { account_number: accountNumber, bank_code: bankCode },
    });
    return data?.account_name ?? null;
  } catch {
    return null;
  }
}

// ---------- customers ----------

interface CustomerRow {
  customer_code: string;
  id?: number;
}

export interface CustomerInput {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export async function createCustomer(input: CustomerInput & { metadata?: Record<string, unknown> }): Promise<{ customerCode: string }> {
  try {
    const data = await paystackRequest<CustomerRow>("/customer", {
      method: "POST",
      body: { email: input.email, first_name: input.firstName, last_name: input.lastName, phone: toE164(input.phone), metadata: input.metadata },
    });
    return { customerCode: data.customer_code };
  } catch (err) {
    // Unverified: a customer with this email may already exist (an earlier attempt that failed
    // after Paystack created it). Fetching it by email is the same outcome as creating it.
    if (err instanceof PaystackApiError && err.kind === "api" && /already|exist|duplicate/i.test(err.message)) {
      const existing = await paystackRequest<CustomerRow>(`/customer/${encodeURIComponent(input.email)}`);
      return { customerCode: existing.customer_code };
    }
    throw err;
  }
}

export async function updateCustomer(customerCode: string, input: Omit<CustomerInput, "email">): Promise<void> {
  await paystackRequest(`/customer/${encodeURIComponent(customerCode)}`, {
    method: "PUT",
    body: { first_name: input.firstName, last_name: input.lastName, phone: toE164(input.phone) },
  });
}

// ---------- dedicated virtual accounts (a user's personal account number to pay into) ----------

/** The bank slug to ask for. In test mode Paystack only offers "test-bank"; live accounts differ, so it's overridable. */
export function preferredDvaBank(): string {
  return process.env.PAYSTACK_DVA_BANK || (isPaystackTestMode() ? "test-bank" : "wema-bank");
}

export interface DedicatedAccountRequest extends CustomerInput {
  bvn: string;
  /** The user's own bank account: Paystack checks the BVN belongs to the holder of this account. */
  accountNumber: string;
  bankCode: string;
}

/**
 * One-step "assign": validates the customer's BVN against their bank account and, if it matches,
 * creates the virtual account. It answers immediately with "in progress"; the outcome arrives as a
 * `dedicatedaccount.assign.success` / `.failed` webhook (unverified: older docs name these
 * `assigndedicatedaccount.*` and `customeridentification.*`, so the webhook handler accepts both).
 */
export async function assignDedicatedAccount(input: DedicatedAccountRequest): Promise<void> {
  await paystackRequest("/dedicated_account/assign", {
    method: "POST",
    body: {
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      phone: toE164(input.phone),
      preferred_bank: preferredDvaBank(),
      country: "NG",
      account_number: input.accountNumber,
      bank_code: input.bankCode,
      bvn: input.bvn,
    },
  });
}

export async function listDedicatedAccountProviders(): Promise<string[]> {
  const data = await paystackRequest<{ provider_slug?: string; bank_id?: number; bank_name?: string }[]>("/dedicated_account/available_providers");
  return (data ?? []).map((provider) => provider.provider_slug ?? "").filter(Boolean);
}

// ---------- transfers (withdrawals) ----------

export async function createTransferRecipient(input: {
  name: string;
  accountNumber: string;
  bankCode: string;
}): Promise<{ recipientCode: string; accountName: string | null }> {
  const data = await paystackRequest<{ recipient_code: string; details?: { account_name?: string | null } }>("/transferrecipient", {
    method: "POST",
    body: { type: "nuban", name: input.name, account_number: input.accountNumber, bank_code: input.bankCode, currency: "NGN" },
  });
  return { recipientCode: data.recipient_code, accountName: data.details?.account_name ?? null };
}

export interface TransferResult {
  transferCode: string;
  status: TransferOutcome;
  reference: string;
}

/**
 * Starts a transfer from Paystack's balance. `reference` is OUR idempotency key (Paystack
 * requires 16-50 lowercase letters, digits, dashes or underscores): initiating the same
 * reference twice cannot send money twice. `status` "OTP" means "Confirm transfers before
 * sending" is switched on in the dashboard, which makes API transfers impossible — it must be off.
 */
export async function initiateTransfer(input: {
  amountNaira: number;
  recipientCode: string;
  reason: string;
  reference: string;
}): Promise<TransferResult> {
  const data = await paystackRequest<{ transfer_code: string; status: string; reference: string }>("/transfer", {
    method: "POST",
    body: { source: "balance", amount: KOBO(input.amountNaira), recipient: input.recipientCode, reason: input.reason, reference: input.reference },
  });
  return { transferCode: data.transfer_code, status: normalizeTransferStatus(data.status), reference: data.reference ?? input.reference };
}

/** Asks Paystack what became of a transfer, by our reference. A 404 means it was never created. */
export async function verifyTransfer(reference: string): Promise<{ status: TransferOutcome; transferCode: string | null }> {
  const data = await paystackRequest<{ status: string; transfer_code?: string }>(`/transfer/verify/${encodeURIComponent(reference)}`);
  return { status: normalizeTransferStatus(data.status), transferCode: data.transfer_code ?? null };
}

// ---------- balance ----------

/** Paystack's NGN balance in naira, or null if it couldn't be read. */
export async function getPaystackBalance(): Promise<number | null> {
  try {
    const data = await paystackRequest<{ currency: string; balance: number }[]>("/balance");
    const ngn = (data ?? []).find((row) => row.currency === "NGN");
    return ngn ? NAIRA(ngn.balance) : null;
  } catch {
    return null;
  }
}
