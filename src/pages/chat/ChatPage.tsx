import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Avatar } from "@/components/Avatar";
import { ChatIcon, ChevronLeftIcon, SendIcon } from "@/components/icons";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/services/api";
import { chatService, notifyChatRead } from "@/services/chat";
import type { Conversation, ConversationSummary, Message } from "@/types/chat";
import { timeAgo } from "@/utils/format";
import { apiMessage } from "@/utils/validation";
import styles from "./Chat.module.css";
import { FriendsDialog } from "./FriendsDialog";

// A cada quantos milissegundos o site pergunta se chegou mensagem nova
const THREAD_POLL_MS = 4000;
const LIST_POLL_MS = 15000;
export const MAX_MESSAGE_LENGTH = 1000;

// Página de mensagens: /mensagens (lista) e /mensagens/:id (conversa aberta)
export function ChatPage() {
  usePageTitle("Mensagens");

  const { id } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);

  const loadList = useCallback(async () => {
    try {
      setConversations(await chatService.listConversations());
    } catch (err) {
      setError(apiMessage(err));
    }
  }, []);

  // A lista também se atualiza sozinha, para mostrar conversas novas e as não lidas
  useEffect(() => {
    loadList();
    const timer = window.setInterval(() => document.visibilityState === "visible" && loadList(), LIST_POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadList]);

  async function startWith(username: string) {
    setPicking(false);
    try {
      const conversation = await chatService.open(username);
      navigate(`/mensagens/${conversation.id}`);
    } catch (err) {
      setError(apiMessage(err));
    }
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.layout} ${id ? styles.hasThread : styles.noThread}`}>
        <aside className={styles.sidebar} aria-label="Conversas">
          <header className={styles.sidebarHeader}>
            <h1>Mensagens</h1>
            <button type="button" className={styles.primary} onClick={() => setPicking(true)}>
              Nova conversa
            </button>
          </header>
          {error && (
            <p className={styles.error} role="alert" style={{ marginTop: 8 }}>
              {error}
            </p>
          )}
          {!conversations && !error && <p className={styles.empty}>Carregando...</p>}
          {conversations?.length === 0 && (
            <p className={styles.empty}>
              Nenhuma conversa ainda. Você pode conversar com seus amigos: pessoas que você segue e que seguem você de
              volta.
            </p>
          )}
          <ul className={styles.list}>
            {conversations?.map((c) => (
              <li key={c.id}>
                <Link to={`/mensagens/${c.id}`} className={c.id === id ? styles.itemActive : styles.item}>
                  <Avatar user={c.other} size={44} />
                  <span className={styles.itemText}>
                    <span className={styles.itemTop}>
                      <span className={styles.itemName}>{c.other.name}</span>
                      {c.lastMessage && <span className={styles.itemTime}>{timeAgo(c.lastMessage.createdAt)}</span>}
                    </span>
                    <span className={`${styles.preview} ${c.unread > 0 ? styles.unreadPreview : ""}`}>
                      {c.lastMessage && previewText(c.lastMessage)}
                    </span>
                  </span>
                  {c.unread > 0 && (
                    <span className={styles.badge} aria-label={`${c.unread} não lidas`}>
                      {c.unread}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <section className={styles.thread} aria-label="Conversa">
          {id ? (
            <Thread key={id} id={id} onActivity={loadList} />
          ) : (
            <div className={styles.placeholder}>
              <div>
                <ChatIcon size={40} />
                <p>Escolha uma conversa ou comece uma nova.</p>
              </div>
            </div>
          )}
        </section>
      </div>

      {picking && (
        <FriendsDialog title="Nova conversa" mode="one" onClose={() => setPicking(false)} onPickOne={(f) => startWith(f.username)} />
      )}
    </div>
  );
}

function previewText(last: NonNullable<ConversationSummary["lastMessage"]>) {
  const text = last.content || (last.sharedPost ? "Compartilhou um post" : "");
  return last.mine ? `Você: ${text}` : text;
}

// Conversa aberta: mensagens, envio e atualização automática
function Thread({ id, onActivity }: { id: string; onActivity: () => void }) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  // Última mensagem conhecida: a atualização automática pede só o que veio depois dela
  const lastId = useRef<string | undefined>(undefined);
  const stickToBottom = useRef(true);

  usePageTitle(conversation ? `Conversa com ${conversation.other.name}` : "Mensagens");

  const scrollToBottom = () => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  // Marca como lida e só depois atualiza a lista e o ícone (senão eles ainda mostrariam como não lida)
  const markRead = useCallback(() => {
    chatService.markRead(id).then(
      () => {
        notifyChatRead();
        onActivity();
      },
      () => {},
    );
  }, [id, onActivity]);

  // Abre a conversa: dados do outro lado e as últimas mensagens
  useEffect(() => {
    let ignore = false;
    Promise.all([chatService.get(id), chatService.getMessages(id)])
      .then(([info, page]) => {
        if (ignore) return;
        setConversation(info);
        setMessages(page.messages);
        setOlderCursor(page.nextCursor);
        lastId.current = page.messages[page.messages.length - 1]?.id;
        requestAnimationFrame(scrollToBottom);
        markRead();
      })
      .catch((err) => {
        if (ignore) return;
        setError(err instanceof ApiError && err.status === 404 ? "Conversa não encontrada." : apiMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, [id, markRead, onActivity]);

  // De tempos em tempos, busca as mensagens que chegaram
  useEffect(() => {
    if (!conversation) return;
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const page = lastId.current ? await chatService.getMessages(id, { after: lastId.current }) : await chatService.getMessages(id);
        if (page.messages.length === 0) return;
        // A mensagem que a própria pessoa acabou de mandar pode vir de novo: não repete
        setMessages((current) => {
          const known = new Set(current.map((m) => m.id));
          return [...current, ...page.messages.filter((m) => !known.has(m.id))];
        });
        lastId.current = page.messages[page.messages.length - 1].id;
        if (stickToBottom.current) requestAnimationFrame(scrollToBottom);
        markRead();
      } catch {
        // Falha passageira: tenta de novo na próxima volta
      }
    }, THREAD_POLL_MS);
    return () => window.clearInterval(timer);
  }, [conversation, id, markRead, onActivity]);

  async function loadOlder() {
    if (!olderCursor) return;
    const el = list.current;
    const before = el ? el.scrollHeight - el.scrollTop : 0;
    try {
      const page = await chatService.getMessages(id, { cursor: olderCursor });
      setMessages((current) => [...page.messages, ...current]);
      setOlderCursor(page.nextCursor);
      // Mantém a pessoa no mesmo ponto da conversa depois de carregar as antigas
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - before;
      });
    } catch (err) {
      setError(apiMessage(err));
    }
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setError("");
    try {
      const message = await chatService.send(id, content);
      setMessages((current) => [...current, message]);
      lastId.current = message.id;
      setText("");
      stickToBottom.current = true;
      requestAnimationFrame(scrollToBottom);
      onActivity();
    } catch (err) {
      setError(apiMessage(err));
      if (err instanceof ApiError && err.code === "NOT_FRIENDS") {
        setConversation((current) => current && { ...current, canSend: false });
      }
    } finally {
      setSending(false);
    }
  }

  // Enter manda; Shift+Enter pula linha
  function handleKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  if (!conversation) {
    return error ? (
      <p className={styles.error} role="alert" style={{ marginTop: 16 }}>
        {error}
      </p>
    ) : (
      <p className={styles.empty}>Carregando...</p>
    );
  }

  const { other } = conversation;

  return (
    <>
      <header className={styles.threadHeader}>
        <Link to="/mensagens" className={styles.back} aria-label="Voltar para as conversas">
          <ChevronLeftIcon size={22} />
        </Link>
        <Link to={`/u/${other.username}`} aria-label={`Perfil de ${other.name}`}>
          <Avatar user={other} size={40} />
        </Link>
        <div>
          <Link to={`/u/${other.username}`} className={styles.threadName}>
            {other.name}
          </Link>
          <span className={styles.preview}>@{other.username}</span>
        </div>
      </header>

      <div
        className={styles.messages}
        ref={list}
        aria-live="polite"
        onScroll={(event) => {
          const el = event.currentTarget;
          // Só rola sozinho quando a pessoa está lendo o fim da conversa
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {olderCursor && (
          <button type="button" className={styles.loadOlder} onClick={loadOlder}>
            Ver mensagens anteriores
          </button>
        )}
        {messages.length === 0 && <p className={styles.empty}>Mande a primeira mensagem para {other.name}.</p>}
        {messages.map((message) => (
          <div key={message.id} className={message.mine ? styles.bubbleMine : styles.bubble}>
            {message.post && (
              <Link to={`/comunidade/post/${message.post.id}`} className={styles.sharedPost}>
                {message.post.imageUrl && <img src={message.post.imageUrl} alt="" />}
                <span>
                  <strong>{message.post.author.name}</strong>
                  <span>{message.post.excerpt || "Ver post"}</span>
                </span>
              </Link>
            )}
            {message.sharedPost && !message.post && <span className={styles.unavailable}>Este post não está mais disponível.</span>}
            {message.content}
            <time className={styles.bubbleTime} dateTime={message.createdAt}>
              {timeAgo(message.createdAt)}
            </time>
          </div>
        ))}
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {conversation.canSend ? (
        <form className={styles.composer} onSubmit={send}>
          <textarea
            aria-label={`Mensagem para ${other.name}`}
            placeholder="Escreva uma mensagem..."
            maxLength={MAX_MESSAGE_LENGTH}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
          />
          <button type="submit" className={styles.sendButton} aria-label="Enviar" disabled={!text.trim() || sending}>
            <SendIcon size={20} />
          </button>
        </form>
      ) : (
        <p className={styles.notice}>
          Vocês não se seguem mais, então não dá para mandar mensagens. O histórico continua aqui.
        </p>
      )}
    </>
  );
}
