export type TransferOutcome = "SUCCESS" | "FAILED" | "REVERSED" | "OTP" | "PENDING";

/**
 * Paystack's transfer statuses, folded into the few we act on. Anything unrecognised counts as
 * still in flight: guessing "failed" would release money that may in fact be on its way to a bank.
 */
export function normalizeTransferStatus(status: string | null | undefined): TransferOutcome {
  switch ((status ?? "").toLowerCase()) {
    case "success":
      return "SUCCESS";
    case "failed":
    case "rejected":
    case "blocked":
    case "abandoned":
      return "FAILED";
    case "reversed":
      return "REVERSED";
    case "otp":
      return "OTP";
    default:
      return "PENDING";
  }
}
