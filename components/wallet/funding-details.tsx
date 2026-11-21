import { CopyButton } from "@/components/ui/copy-button";

function Row({
  label,
  value,
  big = false,
  copyLabel,
  copyText,
}: {
  label: string;
  value: string;
  big?: boolean;
  /** When set, a copy button appears; its accessible name is this label. */
  copyLabel?: string;
  /** What to copy when it differs from what's shown. */
  copyText?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
        <dd className={big ? "mt-0.5 font-mono text-xl font-semibold tracking-wider tabular-nums" : "mt-0.5 truncate font-medium"}>
          {value}
        </dd>
      </div>
      {copyLabel && <CopyButton value={copyText ?? value} label={copyLabel} iconOnly={!big} />}
    </div>
  );
}

/**
 * The personal bank account that pays into a user's wallet, laid out so it is easy to read out or
 * paste into a banking app: one row per detail, each with its own copy button, plus one button that
 * copies everything.
 */
export function FundingDetails({
  bankName,
  accountNumber,
  accountName,
}: {
  bankName: string | null;
  accountNumber: string;
  accountName: string | null;
}) {
  const everything = [bankName, accountNumber, accountName].filter(Boolean).join("\n");

  return (
    <div className="space-y-3">
      <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {bankName && <Row label="Bank" value={bankName} />}
        <Row label="Account number" value={accountNumber} big copyLabel="Copy" />
        {accountName && <Row label="Account name" value={accountName} copyLabel="Copy account name" />}
      </dl>
      <CopyButton value={everything} label="Copy all details" variant="ghost" />
    </div>
  );
}
