"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button type="button" onClick={handleLogout} className="font-medium text-ink-700 hover:text-vinyl-600">
      Odjava
    </button>
  );
}
