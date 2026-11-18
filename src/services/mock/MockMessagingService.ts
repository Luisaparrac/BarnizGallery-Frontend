import type { Id } from "../../domain/common";
import { AppError } from "../../domain/errors";
import type { Conversation, Message, StartConversationRequest } from "../../domain/messaging";
import type { MessagingService } from "../contracts/MessagingService";
import { MockDatabase } from "./MockDatabase";
import { copy, latency, MockSession } from "./MockSession";
import type { ConversationRow } from "./MockTables";
import type { UserRow } from "./MockTables";
import { views } from "./MockViews";

export class MockMessagingService implements MessagingService {
  private get db() {
    return MockDatabase.instance;
  }

  private get t() {
    return this.db.tables;
  }

  /** Conversations where the user is the customer or the master. */
  private involves(row: ConversationRow, user: UserRow): boolean {
    if (row.customerId === user.id) return true;
    return this.t.masters.some((master) => master.id === row.masterId && master.userId === user.id);
  }

  private conversation(id: Id, user: UserRow): ConversationRow {
    const row = this.db.require(this.t.conversations.find((entry) => entry.id === id), "Conversation");
    if (!this.involves(row, user) && user.role !== "ADMIN") throw new AppError("forbidden", "Not your conversation", 403);
    return row;
  }

  async listConversations(): Promise<Conversation[]> {
    await latency();
    const user = MockSession.requireUser();
    return copy(
      this.t.conversations
        .filter((row) => this.involves(row, user))
        .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
        .map((row) => views.conversation(row, user.id)),
    );
  }

  async getMessages(conversationId: Id): Promise<Message[]> {
    await latency();
    const user = MockSession.requireUser();
    this.conversation(conversationId, user);
    const messages = this.t.messages.filter((message) => message.conversationId === conversationId);
    messages.filter((message) => message.senderId !== user.id && !message.readAt).forEach((message) => (message.readAt = this.db.now()));
    this.db.save();
    return copy(messages.map((message) => views.message(message)));
  }

  async send(conversationId: Id, content: string): Promise<Message> {
    await latency();
    const user = MockSession.requireUser();
    const row = this.conversation(conversationId, user);
    if (!content.trim()) throw new AppError("emptyMessage", "Write a message", 422);
    const message = { id: this.db.nextId("messages"), conversationId, senderId: user.id, content: content.trim(), readAt: null, createdAt: this.db.now() };
    this.t.messages.push(message);
    row.lastMessageAt = message.createdAt;
    const master = this.t.masters.find((entry) => entry.id === row.masterId);
    const recipient = user.id === row.customerId ? master?.userId : row.customerId;
    this.db.notify(recipient, "NEW_MESSAGE", `${user.fullName} te escribió`, content.slice(0, 80), `/messages/${row.id}`);
    this.db.save();
    return copy(views.message(message));
  }

  async start(request: StartConversationRequest): Promise<Conversation> {
    await latency();
    const user = MockSession.requireUser();
    const master = this.db.require(this.t.masters.find((entry) => entry.id === request.masterId), "Master");
    if (master.userId === user.id) throw new AppError("selfMessage", "You cannot write to yourself", 422);
    const existing = this.t.conversations.find(
      (row) => row.customerId === user.id && row.masterId === master.id && row.artworkId === (request.artworkId ?? null) && row.customRequestId === (request.customRequestId ?? null) && row.orderId === (request.orderId ?? null),
    );
    const row: ConversationRow = existing ?? {
      id: this.db.nextId("conversations"), customerId: user.id, masterId: master.id, artworkId: request.artworkId ?? null,
      customRequestId: request.customRequestId ?? null, orderId: request.orderId ?? null, subject: request.subject.trim() || master.name,
      status: "OPEN", createdAt: this.db.now(), lastMessageAt: this.db.now(),
    };
    if (!existing) this.t.conversations.push(row);
    this.db.save();
    await this.send(row.id, request.content);
    return copy(views.conversation(row, user.id));
  }
}
