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

export type AuctionModerationStatus = "pending" | "approved" | "rejected";
export type FeeType = "flat" | "percent";
export type FeeStatus = "unpaid" | "invoiced" | "paid" | "waived";

export interface Auction {
  id: number;
  accountId: number;
  listingId: number | null;
  slug: string;
  title: string;
  description: string | null;
  seasonNote: string | null;
  startAt: string;
  endAt: string;
  startingPriceCents: number;
  minIncrementCents: number;
  currency: string;
  moderationStatus: AuctionModerationStatus;
  cancelledAt: string | null;
  feeType: FeeType;
  feeAmountCents: number | null;
  feePercent: number | null;
  feeStatus: FeeStatus;
  feePaidAt: string | null;
  feeNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Bid {
  id: number;
  auctionId: number;
  accountId: number;
  amountCents: number;
  createdAt: string;
}

/** Zeitliche Phase - rein aus start_at/end_at abgeleitet, kein Cron nötig. */
export type AuctionPhase = "upcoming" | "live" | "ended";

export function auctionPhase(auction: Auction, now = new Date()): AuctionPhase {
  const start = new Date(auction.startAt);
  const end = new Date(auction.endAt);
  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "live";
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
