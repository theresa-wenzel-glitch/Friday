/** Typen für den Marktplatz-Bereich - getrennt vom reinen Info-Verzeichnis (types.ts). */

export type AccountRole = "provider" | "trainer";
export type AccountStatus = "active" | "suspended";

export interface Account {
  id: number;
  email: string;
  displayName: string;
  phone: string | null;
  role: AccountRole;
  isVerified: boolean;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

/** Öffentliche Sicht auf ein Konto - niemals Passwort-Hash oder rohe E-Mail nach aussen. */
export interface PublicAccount {
  id: number;
  displayName: string;
  role: AccountRole;
  isVerified: boolean;
}

export function toPublicAccount(account: Account): PublicAccount {
  return {
    id: account.id,
    displayName: account.displayName,
    role: account.role,
    isVerified: account.isVerified,
  };
}
