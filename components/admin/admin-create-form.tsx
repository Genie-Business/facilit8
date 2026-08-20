"use client";

import { useActionState, useEffect, useRef } from "react";

import { createAdminAction } from "@/lib/actions/admin-management.actions";
import type { ActionState } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const nativeSelectClassName =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const initialState: ActionState = {};

export function AdminCreateForm() {
  const [state, formAction, pending] = useActionState(createAdminAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
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

      <div className="grid !gap-4 sm:!grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="admin-firstName">First name</Label>
          <Input id="admin-firstName" name="firstName" required />
          {state.fieldErrors?.firstName && <p className="text-sm text-destructive">{state.fieldErrors.firstName}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-lastName">Last name</Label>
          <Input id="admin-lastName" name="lastName" required />
          {state.fieldErrors?.lastName && <p className="text-sm text-destructive">{state.fieldErrors.lastName}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-email">Email</Label>
        <Input id="admin-email" name="email" type="email" required />
        {state.fieldErrors?.email && <p className="text-sm text-destructive">{state.fieldErrors.email}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-tier">Tier</Label>
        <select id="admin-tier" name="tier" defaultValue="SUPPORT_ADMIN" className={nativeSelectClassName}>
          <option value="SUPPORT_ADMIN">Support Admin (day-to-day tools)</option>
          <option value="SUPER_ADMIN">Super Admin (full access)</option>
        </select>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create admin"}
      </Button>
    </form>
  );
}
