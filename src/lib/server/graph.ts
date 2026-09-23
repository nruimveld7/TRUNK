export interface DirectoryUser {
  objectId: string;
  displayName: string;
  email: string | null;
}

export async function searchDirectoryUsers(token: string, query: string): Promise<DirectoryUser[]> {
  const value = query.trim().replace(/\s+/g, ' ');
  if (value.length < 2) return [];
  const escaped = value.replace(/'/g, "''");
  const url = new URL('https://graph.microsoft.com/v1.0/users');
  url.searchParams.set('$select', 'id,displayName,mail,userPrincipalName');
  url.searchParams.set('$top', '20');
  url.searchParams.set(
    '$filter',
    `startswith(displayName,'${escaped}') or startswith(mail,'${escaped}') or startswith(userPrincipalName,'${escaped}')`
  );
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Microsoft Graph user search failed (${response.status})`);
  const payload = (await response.json()) as {
    value?: Array<{ id: string; displayName?: string; mail?: string; userPrincipalName?: string }>;
  };
  return (payload.value ?? []).map((user) => ({
    objectId: user.id,
    displayName: user.displayName ?? user.userPrincipalName ?? user.id,
    email: user.mail ?? user.userPrincipalName ?? null
  }));
}
