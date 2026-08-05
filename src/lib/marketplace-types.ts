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

export type ListingKind = "stud" | "sale";
export type ListingStatus = "pending" | "approved" | "rejected" | "archived";

export interface Listing {
  id: number;
  accountId: number;
  horseId: number | null;
  kind: ListingKind;
  slug: string;
  name: string;
  sex: "stallion" | "mare" | "gelding";
  breed: string | null;
  yearOfBirth: number | null;
  color: string | null;
  country: string | null;
  location: string | null;
  disciplines: string[];
  description: string | null;
  priceCents: number | null;
  priceCurrency: string;
  priceLabel: string | null;
  photoUrl: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: ListingStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Inquiry {
  id: number;
  listingId: number;
  senderName: string;
  senderEmail: string;
  senderPhone: string | null;
  message: string;
  handled: boolean;
  createdAt: string;
}

/** Formatiert einen Centbetrag als Preis-Badge, z. B. "1.200 €". `null` = "auf Anfrage". */
export function formatPrice(cents: number | null, currency = "EUR"): string {
  if (cents === null) return "auf Anfrage";
  const symbol = currency === "EUR" ? "€" : currency;
  const amount = (cents / 100).toLocaleString("de-DE", {
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
  return `${amount} ${symbol}`;
}
