import type { Conversation, Message } from "@jobflow/types";
import type { Db } from "../../db/pool.js";
import { withTransaction } from "../../db/pool.js";
import { ApiError } from "../../http/errors.js";

interface ConversationRow {
  id: string;
  request_id: string;
  business_id: string;
  customer_id: string;
  last_message_at: Date | null;
  created_at: Date;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  is_ai_generated: boolean;
  created_at: Date;
}

function mapConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    requestId: row.request_id,
    businessId: row.business_id,
    customerId: row.customer_id,
    lastMessageAt: row.last_message_at === null ? null : row.last_message_at.toISOString(),
    createdAt: row.created_at.toISOString(),
  };
}

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    isAiGenerated: row.is_ai_generated,
    createdAt: row.created_at.toISOString(),
  };
}

export class ConversationService {
  constructor(private readonly db: Db) {}

  async listForUser(userId: string): Promise<Conversation[]> {
    const result = await this.db.query<ConversationRow>(
      `SELECT c.*
       FROM conversations c
       WHERE c.customer_id = $1
          OR EXISTS (SELECT 1 FROM business_members bm WHERE bm.business_id = c.business_id AND bm.user_id = $1)
       ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC`,
      [userId],
    );
    return result.rows.map(mapConversation);
  }

  /**
   * Prüft, ob der Nutzer an dieser Konversation beteiligt ist.
   *
   * Jede Nachrichtenoperation geht durch diese Prüfung. Ein Chat ist der Ort,
   * an dem Kunden Adressen und Telefonnummern austauschen - hier wäre ein
   * Fehler in der Berechtigung besonders unangenehm.
   */
  private async requireParticipant(conversationId: string, userId: string): Promise<ConversationRow> {
    const result = await this.db.query<ConversationRow>(
      `SELECT c.*
       FROM conversations c
       WHERE c.id = $1
         AND (
           c.customer_id = $2
           OR EXISTS (SELECT 1 FROM business_members bm WHERE bm.business_id = c.business_id AND bm.user_id = $2)
         )`,
      [conversationId, userId],
    );
    const row = result.rows[0];
    if (row === undefined) throw ApiError.notFound("Dieses Gespräch gibt es nicht.");
    return row;
  }

  async get(conversationId: string, userId: string): Promise<Conversation> {
    return mapConversation(await this.requireParticipant(conversationId, userId));
  }

  async listMessages(conversationId: string, userId: string, limit: number, offset: number): Promise<Message[]> {
    await this.requireParticipant(conversationId, userId);
    const result = await this.db.query<MessageRow>(
      "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [conversationId, limit, offset],
    );
    // Älteste zuerst - so erwartet es die Anzeige.
    return result.rows.reverse().map(mapMessage);
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    body: string,
    isAiGenerated: boolean,
  ): Promise<Message> {
    await this.requireParticipant(conversationId, senderId);
    return withTransaction(this.db, async (client) => {
      const inserted = await client.query<MessageRow>(
        `INSERT INTO messages (conversation_id, sender_id, body, is_ai_generated)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [conversationId, senderId, body, isAiGenerated],
      );
      await client.query("UPDATE conversations SET last_message_at = now() WHERE id = $1", [conversationId]);
      return mapMessage(inserted.rows[0] as MessageRow);
    });
  }
}
