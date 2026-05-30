"use client";

import { useState } from "react";
import { Button } from "@mantine/core";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 1 0 24 44c11 0 20-9 20-20 0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 0 0 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C40.9 36.5 44 30.8 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

interface Props {
  /** Optional forced destination. If omitted, the callback routes by role. */
  next?: string;
  label?: string;
}

export function GoogleSignInButton({
  next,
  label = "Continuă cu Google",
}: Props) {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const supabase = createClient();
    const callback = `${window.location.origin}/auth/callback${
      next ? `?next=${encodeURIComponent(next)}` : ""
    }`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      toast.error(`Autentificarea a eșuat: ${error.message}`);
      setLoading(false);
    }
    // On success the browser is redirected to Google — no further work here.
  }

  return (
    <Button
      onClick={signIn}
      loading={loading}
      fullWidth
      size="md"
      variant="default"
      leftSection={<GoogleIcon />}
    >
      {label}
    </Button>
  );
}
