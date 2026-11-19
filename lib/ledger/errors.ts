import { InsufficientFundsError, LedgerError } from "./ledger.service";

/**
 * Thrown from inside a money transaction when the thing being done has already been done: a second
 * click on "fund this event", a retried request. It rolls the transaction back, which is exactly what
 * we want — the first attempt stands, and the second changes nothing.
 */
export class AlreadyDoneError extends Error {}

/** What to tell a person about a failed money movement. Unexpected errors are logged, never shown raw. */
export function describeLedgerError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof AlreadyDoneError) return err.message;
  if (err instanceof InsufficientFundsError) return `Insufficient balance (₦${err.available.toLocaleString("en-NG")}).`;
  if (err instanceof LedgerError) {
    console.error("Ledger rejected an operation:", err);
    return fallback;
  }
  console.error("Unexpected error during a money operation:", err);
  return fallback;
}
