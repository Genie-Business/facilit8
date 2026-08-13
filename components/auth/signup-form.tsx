"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";

import { signupAction, type ActionState } from "@/lib/actions/auth.actions";
import { resolveAccountNameAction } from "@/lib/actions/bank.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NIGERIA_STATES } from "@/lib/data/nigeria-locations";

const nativeSelectClassName =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const initialState: ActionState = {};

type Role = "EVENT_MANAGER" | "FACILITATOR" | "PROFESSIONAL";

export function SignupForm({
  banks,
  organizations,
}: {
  banks: { code: string; name: string }[];
  organizations: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(signupAction, initialState);
  const [role, setRole] = useState<Role>("EVENT_MANAGER");
  const [selectedState, setSelectedState] = useState("");
  const [affiliationType, setAffiliationType] = useState<"independent" | "organization">("independent");
  const [accountName, setAccountName] = useState("");
  const [resolveMessage, setResolveMessage] = useState<string | null>(null);
  const [resolving, startResolve] = useTransition();

  function handleAccountNumberBlur(bankCode: string, accountNumber: string) {
    setResolveMessage(null);
    if (!bankCode || !/^\d{10}$/.test(accountNumber)) return;

    startResolve(async () => {
      const result = await resolveAccountNameAction(bankCode, accountNumber);
      if (result.accountName) {
        setAccountName(result.accountName);
        setResolveMessage(null);
      } else {
        setResolveMessage(result.error ?? "Enter the account name manually.");
      }
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="role">I am a...</Label>
        <select
          id="role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className={nativeSelectClassName}
        >
          <option value="EVENT_MANAGER">Event Manager</option>
          <option value="FACILITATOR">Facilitator</option>
          <option value="PROFESSIONAL">Professional (individual / org member)</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required />
          {state.fieldErrors?.firstName && (
            <p className="text-sm text-destructive">{state.fieldErrors.firstName}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required />
          {state.fieldErrors?.lastName && (
            <p className="text-sm text-destructive">{state.fieldErrors.lastName}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {state.fieldErrors?.email && (
          <p className="text-sm text-destructive">{state.fieldErrors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="mobilePhone">Phone number</Label>
        <Input id="mobilePhone" name="mobilePhone" type="tel" required />
        {state.fieldErrors?.mobilePhone && (
          <p className="text-sm text-destructive">{state.fieldErrors.mobilePhone}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <select
            id="state"
            name="state"
            defaultValue=""
            className={nativeSelectClassName}
            onChange={(e) => setSelectedState(e.target.value)}
          >
            <option value="">Select your state</option>
            {NIGERIA_STATES.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="localGovt">Local Government</Label>
          <select
            key={selectedState}
            id="localGovt"
            name="localGovt"
            defaultValue=""
            disabled={!selectedState}
            className={nativeSelectClassName}
          >
            <option value="">{selectedState ? "Select your LGA" : "Select a state first"}</option>
            {NIGERIA_STATES.find((s) => s.name === selectedState)?.lgas.map((lga) => (
              <option key={lga} value={lga}>
                {lga}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address (optional)</Label>
        <Input id="address" name="address" placeholder="Street address" />
      </div>

      {role === "EVENT_MANAGER" && (
        <div className="space-y-2">
          <Label htmlFor="organization">Organization</Label>
          <Input id="organization" name="organization" placeholder="Your company or organization's name" />
          <p className="text-xs text-muted-foreground">
            If this organization is already on Facilit8, your account will be linked to it pending approval.
          </p>
        </div>
      )}

      {role === "PROFESSIONAL" && (
        <div className="space-y-3">
          <Label>Are you affiliated with an organization?</Label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="affiliationType"
                value="independent"
                checked={affiliationType === "independent"}
                onChange={() => setAffiliationType("independent")}
              />
              I&apos;m an independent professional
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="affiliationType"
                value="organization"
                checked={affiliationType === "organization"}
                onChange={() => setAffiliationType("organization")}
              />
              I&apos;m affiliated with an organization
            </label>
          </div>

          {affiliationType === "organization" && (
            <div className="space-y-2">
              <Label htmlFor="organizationId">Organization</Label>
              <select id="organizationId" name="organizationId" defaultValue="" className={nativeSelectClassName}>
                <option value="" disabled>
                  Select an organization
                </option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              {organizations.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No CAC-verified organizations are on Facilit8 yet — only verified businesses can be joined.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                The organization&apos;s owner will need to approve your request.
              </p>
              {state.fieldErrors?.organizationId && (
                <p className="text-sm text-destructive">{state.fieldErrors.organizationId}</p>
              )}
            </div>
          )}
        </div>
      )}

      {role !== "PROFESSIONAL" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="bankCode">Bank</Label>
            <select id="bankCode" name="bankCode" defaultValue="" required className={nativeSelectClassName}>
              <option value="" disabled>
                Select your bank
              </option>
              {banks.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
            {state.fieldErrors?.bankCode && (
              <p className="text-sm text-destructive">{state.fieldErrors.bankCode}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account number</Label>
              <Input
                id="accountNumber"
                name="accountNumber"
                inputMode="numeric"
                maxLength={10}
                required
                onBlur={(e) => {
                  const bankCode = (document.getElementById("bankCode") as HTMLSelectElement | null)?.value ?? "";
                  handleAccountNumberBlur(bankCode, e.target.value);
                }}
              />
              {state.fieldErrors?.accountNumber && (
                <p className="text-sm text-destructive">{state.fieldErrors.accountNumber}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountName">Account name</Label>
              <Input
                id="accountName"
                name="accountName"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder={resolving ? "Resolving..." : undefined}
              />
              {resolveMessage && <p className="text-xs text-muted-foreground">{resolveMessage}</p>}
              {state.fieldErrors?.accountName && (
                <p className="text-sm text-destructive">{state.fieldErrors.accountName}</p>
              )}
            </div>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
        {state.fieldErrors?.password && (
          <p className="text-sm text-destructive">{state.fieldErrors.password}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
        {state.fieldErrors?.confirmPassword && (
          <p className="text-sm text-destructive">{state.fieldErrors.confirmPassword}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account..." : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
