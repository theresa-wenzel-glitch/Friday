import type { IsoDateTime, Uuid } from "./common.js";

/**
 * Kategorien sind Daten, kein fest einprogrammierter Baum.
 *
 * Das ist eine der wichtigsten Architekturentscheidungen: neue Branchen
 * (Auto, Haushalt, Garten, Freelancer ...) kommen über die Datenbank dazu,
 * nicht über ein Deployment.
 */
export interface Category {
  id: Uuid;
  /** Stabiler, sprachunabhängiger Schluessel, z. B. "heizung". */
  slug: string;
  name: string;
  /** Emoji oder Icon-Schluessel für die Oberfläche. */
  icon: string | null;
  parentId: Uuid | null;
  /** Sortierung innerhalb der Ebene, kleinere Werte zuerst. */
  position: number;
  active: boolean;
  createdAt: IsoDateTime;
}

/** Kategorie mit ihren Unterkategorien - für die Startseite der App. */
export interface CategoryNode extends Category {
  children: CategoryNode[];
}
