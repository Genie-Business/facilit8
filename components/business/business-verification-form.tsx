"use client";

import { useActionState, useState } from "react";

import { submitBusinessVerificationAction } from "@/lib/actions/business-verification.actions";
import type { ActionState } from "@/lib/actions/shared";
import { REGISTRATION_TYPES, REGISTRATION_TYPE_LABELS, INDUSTRIES, formatIndustryLabel } from "@/lib/validation/business";
import { Button } from "@/components/ui/button";
import { Input, nativeSelectClassName } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NIGERIA_STATES } from "@/lib/data/nigeria-locations";

const initialState: ActionState = {};

/** What the organization submitted last time, so a rejected one corrects a detail instead of retyping everything. */
export interface BusinessVerificationDefaults {
  cacNumber?: string | null;
  businessDescription?: string | null;
  industry?: string | null;
  registrationType?: string | null;
  /** yyyy-mm-dd */
  dateOfRegistration?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
}

export function BusinessVerificationForm({
  organizationId,
  defaults = {},
}: {
  organizationId: string;
  defaults?: BusinessVerificationDefaults;
}) {
  const [state, formAction, pending] = useActionState(submitBusinessVerificationAction, initialState);
  const [selectedState, setSelectedState] = useState(defaults.state ?? "");

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <input type="hidden" name="organizationId" value={organizationId} />

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.success && (
        <Alert>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="cacNumber">CAC / RC number</Label>
        <Input id="cacNumber" name="cacNumber" defaultValue={defaults.cacNumber ?? ""} required />
        {state.fieldErrors?.cacNumber && <p className="text-sm text-destructive">{state.fieldErrors.cacNumber}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="businessDescription">What does your business do?</Label>
        <Textarea
          id="businessDescription"
          name="businessDescription"
          rows={3}
          maxLength={500}
          defaultValue={defaults.businessDescription ?? ""}
          required
        />
        {state.fieldErrors?.businessDescription && (
          <p className="text-sm text-destructive">{state.fieldErrors.businessDescription}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="industry">Industry</Label>
        <select id="industry" name="industry" defaultValue={defaults.industry ?? ""} required className={nativeSelectClassName}>
          <option value="" disabled>
            Select industry
          </option>
          {INDUSTRIES.map((value) => (
            <option key={value} value={value}>
              {formatIndustryLabel(value)}
            </option>
          ))}
        </select>
        {state.fieldErrors?.industry && <p className="text-sm text-destructive">{state.fieldErrors.industry}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="registrationType">Registration type</Label>
        <select
          id="registrationType"
          name="registrationType"
          defaultValue={defaults.registrationType ?? ""}
          required
          className={nativeSelectClassName}
        >
          <option value="" disabled>
            Select registration type
          </option>
          {REGISTRATION_TYPES.map((type) => (
            <option key={type} value={type}>
              {REGISTRATION_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        {state.fieldErrors?.registrationType && (
          <p className="text-sm text-destructive">{state.fieldErrors.registrationType}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="dateOfRegistration">Date of registration</Label>
        <Input id="dateOfRegistration" name="dateOfRegistration" type="date" defaultValue={defaults.dateOfRegistration ?? ""} required />
        {state.fieldErrors?.dateOfRegistration && (
          <p className="text-sm text-destructive">{state.fieldErrors.dateOfRegistration}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="addressLine1">Business address</Label>
        <Input id="addressLine1" name="addressLine1" defaultValue={defaults.addressLine1 ?? ""} required />
        {state.fieldErrors?.addressLine1 && (
          <p className="text-sm text-destructive">{state.fieldErrors.addressLine1}</p>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={defaults.city ?? ""} required />
          {state.fieldErrors?.city && <p className="text-sm text-destructive">{state.fieldErrors.city}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="businessState">State</Label>
          <select
            id="businessState"
            name="state"
            required
            className={nativeSelectClassName}
            onChange={(e) => setSelectedState(e.target.value)}
            value={selectedState}
          >
            <option value="" disabled>
              Select state
            </option>
            {NIGERIA_STATES.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          {state.fieldErrors?.state && <p className="text-sm text-destructive">{state.fieldErrors.state}</p>}
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Submitting..." : "Verify business"}
      </Button>
    </form>
  );
}
