export interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
}

export function firstFieldErrors(flat: Record<string, string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, messages] of Object.entries(flat)) {
    if (messages && messages.length > 0) out[key] = messages[0];
  }
  return out;
}
