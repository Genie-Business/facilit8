import { randomUUID } from "node:crypto";

import { anchorRequest, nairaToKobo } from "./client";
import type { AnchorDocument } from "./types";

interface TransferAttrs {
  status?: string;
  amount?: number;
  reference?: string;
}

export interface TransferResult {
  transferId: string;
  raw: AnchorDocument<TransferAttrs>;
}

/**
 * Internal transfer between two Anchor deposit accounts. Mirrors
 * webapp/utils.py::make_book_transfer — used for event funding (Event Manager wallet →
 * platform settlement account) and facilitator payouts (settlement → facilitator wallet).
 */
export async function bookTransfer(params: {
  sourceAccountId: string;
  destinationAccountId: string;
  amountNaira: number;
  reason: string;
  reference?: string;
}): Promise<TransferResult> {
  const reference = params.reference ?? `ref_${randomUUID().replace(/-/g, "").slice(0, 20)}`;

  const raw = await anchorRequest<AnchorDocument<TransferAttrs>>("/transfers", {
    method: "POST",
    body: {
      data: {
        type: "BookTransfer",
        attributes: {
          currency: "NGN",
          amount: nairaToKobo(params.amountNaira),
          reason: params.reason,
          reference,
        },
        relationships: {
          account: { data: { type: "DepositAccount", id: params.sourceAccountId } },
          destinationAccount: { data: { type: "DepositAccount", id: params.destinationAccountId } },
        },
      },
    },
  });

  return { transferId: raw.data.id, raw };
}

/**
 * External NIP transfer to a linked bank account (withdrawal). Mirrors
 * webapp/utils.py::initiate_transfer.
 */
export async function nipTransfer(params: {
  sourceAccountId: string;
  counterpartyId: string;
  amountNaira: number;
  reason: string;
  reference?: string;
}): Promise<TransferResult> {
  const reference = params.reference ?? randomUUID();

  const raw = await anchorRequest<AnchorDocument<TransferAttrs>>("/transfers", {
    method: "POST",
    body: {
      data: {
        type: "NIPTransfer",
        attributes: {
          currency: "NGN",
          amount: nairaToKobo(params.amountNaira),
          reason: params.reason,
          reference,
        },
        relationships: {
          account: { data: { id: params.sourceAccountId, type: "DepositAccount" } },
          counterParty: { data: { id: params.counterpartyId, type: "CounterParty" } },
        },
      },
    },
  });

  return { transferId: raw.data.id, raw };
}

/** Mirrors webapp/utils.py::verify_anchor_transfer. */
export async function verifyTransfer(transferId: string): Promise<string> {
  const result = await anchorRequest<AnchorDocument<TransferAttrs>>(`/transfers/verify/${transferId}`);
  return String(result.data.attributes.status ?? "unknown").toLowerCase();
}
