"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Settings, ShieldCheck, LogOut, UserCircle } from "lucide-react";

import { logoutAction } from "@/lib/actions/auth.actions";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function ProfileDropdown({
  name,
  email,
  profileImageUrl,
}: {
  name: string;
  email: string;
  profileImageUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open]);

  return (
    <div className={`dd-wrap${open ? " is-open" : ""}`} ref={wrapRef}>
      {profileImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profileImageUrl}
          alt=""
          className="avatar"
          style={{ objectFit: "cover", cursor: "pointer" }}
          tabIndex={0}
          role="button"
          aria-label="Account menu"
          onClick={() => setOpen((v) => !v)}
        />
      ) : (
        <div className="avatar" tabIndex={0} role="button" aria-label="Account menu" onClick={() => setOpen((v) => !v)}>
          {initials(name)}
        </div>
      )}
      <div className="dd-menu dd-profile" role="menu">
        <div className="dd-profile-head">
          <div className="dd-profile-name">{name}</div>
          <div className="dd-profile-email">{email}</div>
        </div>
        <Link className="dd-menu-item" href="/profile" onClick={() => setOpen(false)}>
          <UserCircle />
          My Profile
        </Link>
        <Link className="dd-menu-item" href="/settings/kyc" onClick={() => setOpen(false)}>
          <ShieldCheck />
          Verify Identity
        </Link>
        <Link className="dd-menu-item" href="/wallet" onClick={() => setOpen(false)}>
          <Settings />
          Wallet Settings
        </Link>
        <div className="dd-divider" />
        <form action={logoutAction}>
          <button type="submit" className="dd-menu-item danger" style={{ width: "100%" }}>
            <LogOut />
            Logout
          </button>
        </form>
      </div>
    </div>
  );
}
