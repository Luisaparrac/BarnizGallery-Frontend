import type { Id } from "../../domain/common";
import type { Conversation, Message, StartConversationRequest } from "../../domain/messaging";

export interface MessagingService {
  listConversations(): Promise<Conversation[]>;
  getMessages(conversationId: Id): Promise<Message[]>;
  send(conversationId: Id, content: string): Promise<Message>;
  start(request: StartConversationRequest): Promise<Conversation>;
}
