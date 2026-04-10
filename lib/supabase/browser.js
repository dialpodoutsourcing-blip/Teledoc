'use client';

import { createBrowserClient } from '@supabase/ssr';
import { HAS_SUPABASE_CONFIG } from '@/lib/runtime';

let browserClient;

export function getSupabaseBrowserClient() {
  if (!HAS_SUPABASE_CONFIG) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }

  return browserClient;
}
