"use client";

import { useActionState } from "react";

import { updateSiteSettingsAction } from "@/lib/actions/admin-content.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionState = {};

export function SiteSettingsForm({
  email,
  phone,
  address,
}: {
  email: string;
  phone: string | null;
  address: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateSiteSettingsAction, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4">
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
        <Label htmlFor="site-email">Email</Label>
        <Input id="site-email" name="email" type="email" defaultValue={email} required />
        {state.fieldErrors?.email && <p className="text-sm text-destructive">{state.fieldErrors.email}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="site-phone">Phone</Label>
        <Input id="site-phone" name="phone" defaultValue={phone ?? ""} placeholder="Available on request" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="site-address">Address</Label>
        <Input id="site-address" name="address" defaultValue={address ?? ""} />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
