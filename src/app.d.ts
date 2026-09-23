import type { AccessRole, SessionUser } from '$lib/types';

declare global {
  namespace App {
    interface Locals {
      sessionId: string | null;
      user: SessionUser | null;
      accessRole: AccessRole | null;
      csrfToken: string;
    }
  }
}

export {};
