import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EmptyState, ErrorNote, Loading } from "../../components/Feedback";
import { PageHeader } from "../../components/PageHeader";
import { AppEvents } from "../../core/AppEvents";
import { useAsync } from "../../hooks/useAsync";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";
import { useSession } from "../../state/SessionContext";
import { useToast } from "../../state/ToastContext";

/** Conversations between customers and masters: list on the left, the open thread on the right. */
export function MessagesPage() {
  const { id } = useParams();
  const conversationId = id ? Number(id) : null;
  const { i18n, format } = useLocale();
  const { user } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const errorText = useErrorText();
  const conversations = useAsync(() => services.messaging.listConversations(), []);
  const messages = useAsync(async () => (conversationId ? services.messaging.getMessages(conversationId) : []), [conversationId]);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);

  const reloadConversations = conversations.reload;
  useEffect(() => AppEvents.messagesChanged.subscribe(() => void reloadConversations()), [reloadConversations]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
    // Opening a thread marks it as read, so the unread counters must refresh.
    if (messages.data?.length) void reloadConversations();
  }, [messages.data, reloadConversations]);
  useEffect(() => {
    if (!conversationId && conversations.data?.length && window.innerWidth > 800) navigate(`/messages/${conversations.data[0].id}`, { replace: true });
  }, [conversationId, conversations.data, navigate]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!conversationId || !text.trim()) return;
    try {
      await services.messaging.send(conversationId, text);
      setText("");
      await Promise.all([messages.reload(), conversations.reload()]);
    } catch (error) {
      toast.show(errorText(error), "error");
    }
  };

  const current = conversations.data?.find((conversation) => conversation.id === conversationId);
  return (
    <div className="container">
      <PageHeader title={i18n.t("messages.title")} />
      {conversations.loading && !conversations.data && <Loading />}
      {conversations.error !== null && <ErrorNote error={conversations.error} />}
      {conversations.data && !conversations.data.length && <EmptyState title={i18n.t("messages.empty")} text={i18n.t("messages.emptyText")} />}
      {conversations.data && conversations.data.length > 0 && (
        <div className={`messages${conversationId ? " has-thread" : ""}`}>
          <ul className="conversation-list">
            {conversations.data.map((conversation) => {
              const other = user?.id === conversation.customerId ? conversation.masterName : conversation.customerName;
              return (
                <li key={conversation.id}>
                  <Link to={`/messages/${conversation.id}`} className={conversation.id === conversationId ? "is-on" : ""}>
                    <strong>{other}</strong>
                    <span>{conversation.subject}</span>
                    <small className="muted">{conversation.lastMessagePreview}</small>
                    {conversation.unreadCount > 0 && <span className="counter">{conversation.unreadCount}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
          <section className="thread">
            {current ? (
              <>
                <header className="thread-head">
                  <Link to="/messages" className="btn btn-link thread-back">
                    {i18n.t("common.back")}
                  </Link>
                  <strong>{current.subject}</strong>
                  <span className="muted">
                    {current.customerName} — {current.masterName}
                  </span>
                </header>
                <div className="thread-body">
                  {messages.data?.map((message) => (
                    <div key={message.id} className={`bubble${message.senderId === user?.id ? " is-mine" : ""}`}>
                      <p>{message.content}</p>
                      <small>
                        {message.senderId === user?.id ? i18n.t("messages.you") : message.senderName}
                        {" — "}{format.dateTime(message.createdAt)}
                      </small>
                    </div>
                  ))}
                  <div ref={end} />
                </div>
                <form className="thread-form" onSubmit={(event) => void send(event)}>
                  <textarea rows={2} value={text} onChange={(event) => setText(event.target.value)} placeholder={i18n.t("messages.placeholder")} aria-label={i18n.t("messages.placeholder")} />
                  <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
                    {i18n.t("messages.send")}
                  </button>
                </form>
              </>
            ) : (
              <p className="muted thread-empty">{i18n.t("messages.pick")}</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
