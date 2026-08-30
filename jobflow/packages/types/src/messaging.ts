import type { IsoDateTime, Uuid } from "./common.js";

/** Jede Anfrage-Unternehmen-Beziehung bekommt genau eine Konversation. */
export interface Conversation {
  id: Uuid;
  requestId: Uuid;
  businessId: Uuid;
  customerId: Uuid;
  lastMessageAt: IsoDateTime | null;
  createdAt: IsoDateTime;
}

export interface Message {
  id: Uuid;
  conversationId: Uuid;
  senderId: Uuid;
  body: string;
  /**
   * true, wenn der Text aus einem KI-Vorschlag stammt.
   * Die Oberflaeche muss das kennzeichnen - KI-Inhalte duerfen nicht so
   * aussehen, als kaemen sie garantiert von einem Menschen.
   */
  isAiGenerated: boolean;
  createdAt: IsoDateTime;
}
