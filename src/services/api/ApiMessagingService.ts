import type { Id } from "../../domain/common";
import type { Conversation, Message, StartConversationRequest } from "../../domain/messaging";
import type { MessagingService } from "../contracts/MessagingService";
import { HttpClient } from "./HttpClient";

export class ApiMessagingService implements MessagingService {
  private readonly http = HttpClient.shared;

  listConversations(): Promise<Conversation[]> {
    return this.http.get<Conversation[]>("/api/conversations");
  }

  getMessages(conversationId: Id): Promise<Message[]> {
    return this.http.get<Message[]>(`/api/conversations/${conversationId}/messages`);
  }

  send(conversationId: Id, content: string): Promise<Message> {
    return this.http.post<Message>(`/api/conversations/${conversationId}/messages`, { content });
  }

  start(request: StartConversationRequest): Promise<Conversation> {
    return this.http.post<Conversation>("/api/conversations", request);
  }
}
