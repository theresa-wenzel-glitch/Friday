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
   * Die Oberfläche muss das kennzeichnen - KI-Inhalte dürfen nicht so
   * aussehen, als kämen sie garantiert von einem Menschen.
   */
  isAiGenerated: boolean;
  createdAt: IsoDateTime;
}
