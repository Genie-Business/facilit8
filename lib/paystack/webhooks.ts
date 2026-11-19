import { creditDeposit } from "@/lib/services/deposit.service";
import { activateWallet, rejectKyc } from "@/lib/services/wallet-activation.service";
import { applyTransferOutcome } from "@/lib/services/withdrawal-settlement.service";

export interface PaystackEvent {
  event: string;
  // Paystack's payloads vary by event; each handler reads only the fields it needs, defensively.
  data: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const text = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

/**
 * Handles one verified Paystack event and returns a short label for the audit log. Throwing means
 * "try again" (the route answers 500 and Paystack redelivers); returning — even for an event we
 * don't act on — means it's done.
 *
 * Event names marked "unverified" come from docs that disagree with each other; both spellings are
 * accepted, and the first live test run will show which Paystack actually sends.
 */
export async function processPaystackEvent(payload: PaystackEvent): Promise<string> {
  const { event, data } = payload;

  switch (event) {
    // A bank transfer into someone's virtual account (and, in principle, any card payment — those
    // are ignored: the wallet is funded only by bank transfer).
    case "charge.success": {
      const channel = text(data.channel) ?? text(data.authorization?.channel);
      if (channel !== "dedicated_nuban") return "ignored_not_a_virtual_account_deposit";

      const outcome = await creditDeposit({
        paystackTransactionId: data.id ?? data.reference,
        amountKobo: Number(data.amount ?? 0),
        feesKobo: Number(data.fees ?? 0),
        customerCode: text(data.customer?.customer_code),
        receiverAccountNumber: text(data.authorization?.receiver_bank_account_number) ?? text(data.metadata?.receiver_account_number),
        senderName: text(data.authorization?.sender_name),
      });
      // Money arrived that we can't attribute to anyone: fail loudly so the event stays unprocessed.
      if (outcome === "user_not_found") throw new Error("A deposit arrived for an account that matches no user.");
      return `deposit_${outcome}`;
    }

    // BVN verified and the virtual account created: the wallet goes live.
    case "dedicatedaccount.assign.success":
    case "assigndedicatedaccount.success": {
      const account = data.dedicated_account ?? {};
      const accountNumber = text(account.account_number);
      if (!accountNumber) throw new Error("dedicatedaccount.assign.success carried no account number.");
      const outcome = await activateWallet(
        { customerCode: text(data.customer?.customer_code), email: text(data.customer?.email) },
        { accountNumber, accountName: text(account.account_name), bankName: text(account.bank?.name) }
      );
      if (outcome === "user_not_found") throw new Error("A virtual account was assigned to a customer that matches no user.");
      return `wallet_${outcome}`;
    }

    case "dedicatedaccount.assign.failed":
    case "assigndedicatedaccount.failed":
    case "customeridentification.failed": {
      const reason =
        text(data.reason) ??
        text(data.identification?.reason) ??
        "Your BVN and the bank account you linked could not be matched. Check both and try again.";
      const outcome = await rejectKyc({ customerCode: text(data.customer?.customer_code) ?? text(data.customer_code), email: text(data.customer?.email) ?? text(data.email) }, reason);
      return `kyc_${outcome}`;
    }

    // Successful identification on its own changes nothing: the wallet is created by the assign event.
    case "customeridentification.success":
      return "noted";

    // A withdrawal's bank transfer reached a final state. `data.reference` is the reference WE gave
    // the transfer, so it finds the withdrawal directly. A transfer that isn't ours (sent from the
    // dashboard, say) simply isn't found, which is fine.
    case "transfer.success":
    case "transfer.failed":
    case "transfer.reversed": {
      const reference = text(data.reference);
      if (!reference) return "ignored_no_reference";
      const outcome = event === "transfer.success" ? "SUCCESS" : event === "transfer.failed" ? "FAILED" : "REVERSED";
      return `withdrawal_${await applyTransferOutcome(reference, outcome)}`;
    }

    default:
      return "ignored";
  }
}
