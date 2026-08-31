import type { Category, CategoryNode } from "@jobflow/types";
import type { Db } from "../../db/pool.js";

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  parent_id: string | null;
  position: number;
  active: boolean;
  created_at: Date;
}

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    icon: row.icon,
    parentId: row.parent_id,
    position: row.position,
    active: row.active,
    createdAt: row.created_at.toISOString(),
  };
}

export class CategoryService {
  constructor(private readonly db: Db) {}

  async list(): Promise<Category[]> {
    const result = await this.db.query<CategoryRow>(
      "SELECT * FROM categories WHERE active ORDER BY position, name",
    );
    return result.rows.map(mapCategory);
  }

  /**
   * Kategorien als Baum - das ist die Form, die die Startseite braucht.
   *
   * Der Baum wird im Speicher gebaut statt mit einer rekursiven Abfrage: es
   * sind wenige Dutzend Zeilen, und die Kategorienliste eignet sich später
   * gut zum Zwischenspeichern.
   */
  async tree(): Promise<CategoryNode[]> {
    const categories = await this.list();
    const nodes = new Map<string, CategoryNode>();
    for (const category of categories) {
      nodes.set(category.id, { ...category, children: [] });
    }

    const roots: CategoryNode[] = [];
    for (const node of nodes.values()) {
      if (node.parentId === null) {
        roots.push(node);
        continue;
      }
      const parent = nodes.get(node.parentId);
      // Ist die Oberkategorie inaktiv, wäre die Unterkategorie nicht
      // erreichbar. Sie wird dann wie eine eigene Wurzel behandelt, statt
      // stillschweigend zu verschwinden.
      if (parent === undefined) roots.push(node);
      else parent.children.push(node);
    }
    return roots;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const result = await this.db.query<CategoryRow>(
      "SELECT * FROM categories WHERE slug = $1 AND active",
      [slug],
    );
    const row = result.rows[0];
    return row === undefined ? null : mapCategory(row);
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db.query("SELECT 1 FROM categories WHERE id = $1 AND active", [id]);
    return result.rowCount === 1;
  }
}
