import type { SessionUser } from '$lib/types';

declare global {
  namespace App {
    interface Locals {
      sessionId: string | null;
      user: SessionUser | null;
      csrfToken: string;
    }
  }
}

export {};
