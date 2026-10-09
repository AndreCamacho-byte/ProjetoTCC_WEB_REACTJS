import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { SearchIcon } from "@/components/icons";
import { useAuth } from "@/hooks/useAuth";
import { adminService, type UserPage, type UserUpdate } from "@/services/admin";
import type { User } from "@/types/user";
import { ageFrom } from "@/utils/age";
import { getErrorMessage, todayIso } from "@/utils/validation";
import { ApiError } from "@/services/api";
import { AdminTabs } from "@/components/AdminTabs";
import { usePageTitle } from "@/hooks/usePageTitle";
import styles from "./AdminUsersPage.module.css";

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

// Os erros do painel vêm prontos do backend (ex.: "@username já está em uso")
const adminError = (error: unknown) =>
  error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 401
    ? error.message
    : getErrorMessage(error);

// Painel do administrador: lista, busca, edita e remove usuários
export function AdminUsersPage() {
  usePageTitle("Painel admin");

  const { user: me } = useAuth();
  const [data, setData] = useState<UserPage | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState({ search: "", page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<User | null>(null);
  const [removing, setRemoving] = useState<User | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await adminService.listUsers(query));
    } catch (err) {
      setError(adminError(err));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setQuery({ search: search.trim(), page: 1 });
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className={styles.page}>
      <AdminTabs />
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Administração</p>
          <h1 className={styles.title}>Usuários</h1>
        </div>
        <form className={styles.search} role="search" onSubmit={handleSearch}>
          <input
            type="search"
            placeholder="Buscar por nome, @ ou email"
            aria-label="Buscar usuários"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" aria-label="Buscar">
            <SearchIcon size={18} />
          </button>
        </form>
      </header>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Função</th>
              <th>Email confirmado</th>
              <th>Idade</th>
              <th>Criado em</th>
              <th>
                <span className={styles.srOnly}>Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                  <span className={styles.handle}>@{user.username}</span>
                </td>
                <td>{user.email}</td>
                <td>
                  <span className={user.role === "ADMIN" ? styles.badgeAdmin : styles.badge}>
                    {user.role === "ADMIN" ? "Admin" : "Usuário"}
                  </span>
                </td>
                <td>{user.emailVerifiedAt ? "Sim" : "Não"}</td>
                <td>{user.birthDate ? `${ageFrom(user.birthDate)} anos` : "Não verificada"}</td>
                <td>{dateFormat.format(new Date(user.createdAt))}</td>
                <td className={styles.actions}>
                  <button type="button" className={styles.linkButton} onClick={() => setEditing(user)}>
                    Editar
                  </button>
                  {user.id === me?.id ? (
                    <span className={styles.you}>você</span>
                  ) : (
                    <button type="button" className={styles.dangerButton} onClick={() => setRemoving(user)}>
                      Remover
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data && data.users.length === 0 && (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
            {!data && loading && (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  Carregando...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <footer className={styles.footer}>
          <span>
            {data.total} {data.total === 1 ? "usuário" : "usuários"}
          </span>
          <div className={styles.pagination}>
            <button
              type="button"
              disabled={data.page <= 1 || loading}
              onClick={() => setQuery((q) => ({ ...q, page: q.page - 1 }))}
            >
              Anterior
            </button>
            <span>
              Página {data.page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={data.page >= totalPages || loading}
              onClick={() => setQuery((q) => ({ ...q, page: q.page + 1 }))}
            >
              Próxima
            </button>
          </div>
        </footer>
      )}

      {editing && (
        <EditUserDialog
          user={editing}
          isMe={editing.id === me?.id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {removing && (
        <RemoveUserDialog
          user={removing}
          onClose={() => setRemoving(null)}
          onRemoved={() => {
            setRemoving(null);
            load();
          }}
        />
      )}
    </div>
  );
}

type DialogProps = { title: string; onClose: () => void; children: ReactNode; wide?: boolean };

export function Dialog({ title, onClose, children, wide = false }: DialogProps) {
  // Fecha com a tecla Esc
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={wide ? `${styles.dialog} ${styles.dialogWide}` : styles.dialog} role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

type EditProps = { user: User; isMe: boolean; onClose: () => void; onSaved: () => void };

function EditUserDialog({ user, isMe, onClose, onSaved }: EditProps) {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [role, setRole] = useState(user.role);
  const [emailVerified, setEmailVerified] = useState(Boolean(user.emailVerifiedAt));
  const originalBirthDate = user.birthDate?.slice(0, 10) ?? "";
  const [birthDate, setBirthDate] = useState(originalBirthDate);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    // Envia só o que mudou
    const changes: UserUpdate = {};
    if (name.trim() !== user.name) changes.name = name.trim();
    if (username.trim().toLowerCase() !== user.username) changes.username = username.trim().toLowerCase();
    if (role !== user.role) changes.role = role;
    if (emailVerified !== Boolean(user.emailVerifiedAt)) changes.emailVerified = emailVerified;
    if (birthDate !== originalBirthDate) changes.birthDate = birthDate || null;
    if (Object.keys(changes).length === 0) return onClose();

    setSaving(true);
    try {
      await adminService.updateUser(user.id, changes);
      onSaved();
    } catch (err) {
      const details = err instanceof ApiError ? err.details.map((d) => d.message).join(" ") : "";
      setError(details || adminError(err));
      setSaving(false);
    }
  }

  return (
    <Dialog title="Editar usuário" onClose={onClose}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <p className={styles.dialogEmail}>{user.email}</p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <label>
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} />
        </label>
        <label>
          @username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Função
          <select value={role} onChange={(e) => setRole(e.target.value as User["role"])} disabled={isMe}>
            <option value="USER">Usuário</option>
            <option value="ADMIN">Administrador</option>
          </select>
          {isMe && <small>Você não pode tirar a sua própria função de administrador.</small>}
        </label>
        <label>
          Data de nascimento
          <input type="date" max={todayIso()} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          <small>Em branco = idade não verificada (spots e marketplace bloqueados).</small>
        </label>
        <label className={styles.checkbox}>
          <input type="checkbox" checked={emailVerified} onChange={(e) => setEmailVerified(e.target.checked)} />
          Email confirmado (pode entrar no site)
        </label>
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={styles.primary} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

type RemoveProps = { user: User; onClose: () => void; onRemoved: () => void };

function RemoveUserDialog({ user, onClose, onRemoved }: RemoveProps) {
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);

  async function remove() {
    setError("");
    setRemoving(true);
    try {
      await adminService.deleteUser(user.id);
      onRemoved();
    } catch (err) {
      setError(adminError(err));
      setRemoving(false);
    }
  }

  return (
    <Dialog title="Remover usuário" onClose={onClose}>
      <div className={styles.form}>
        <p>
          Remover <strong>{user.name}</strong> ({user.email})? A conta e tudo que é dela (posts, comentários, curtidas,
          encontros e pedidos da loja) serão apagados. <strong>Não dá para desfazer.</strong>
        </p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className={styles.danger} onClick={remove} disabled={removing}>
            {removing ? "Removendo..." : "Remover"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
