import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Avatar } from "./Avatar";
import { BagIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from "./icons";
import { Logo } from "./Logo";
import styles from "./SiteHeader.module.css";

export const NAV_LINKS = [
  { to: "/explorar", label: "Explorar" },
  { to: "/comunidade", label: "Comunidade" },
  { to: "/market", label: "Market" },
  { to: "/eventos", label: "Eventos" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const navRef = useRef<HTMLElement>(null);
  const searchSlotRef = useRef<HTMLDivElement>(null);

  // Fecha o menu do celular ao trocar de página
  useEffect(() => setMenuOpen(false), [location.pathname]);

  // A busca cresce para a esquerda até perto do último link do menu (Eventos).
  // A largura depende do espaço livre, que muda com o tamanho da janela: por isso é medida
  // ao abrir a página e a cada mudança de tamanho, e fica pronta antes de o mouse chegar
  // (assim a animação já começa com o destino certo).
  const measureSearch = useCallback(() => {
    const slot = searchSlotRef.current;
    const lastLink = navRef.current?.querySelector("a:last-of-type");
    if (!slot || !lastLink) return;
    const room = slot.getBoundingClientRect().right - lastLink.getBoundingClientRect().right - 24;
    slot.style.setProperty("--search-open", `${Math.max(room, slot.offsetWidth)}px`);
  }, []);

  useEffect(() => {
    measureSearch();
    // As fontes mudam a largura do menu quando terminam de carregar
    document.fonts?.ready.then(measureSearch);
    window.addEventListener("resize", measureSearch);
    return () => window.removeEventListener("resize", measureSearch);
  }, [measureSearch]);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logoLink} aria-label="Clutch, página inicial">
          <Logo size="md" />
        </Link>

        <nav ref={navRef} className={[styles.nav, menuOpen && styles.navOpen].filter(Boolean).join(" ")} aria-label="Principal">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => [styles.navLink, isActive && styles.active].filter(Boolean).join(" ")}
            >
              {link.label}
            </NavLink>
          ))}
          <SearchForm className={styles.searchMobile} />
        </nav>

        <div className={styles.actions}>
          <div ref={searchSlotRef} className={styles.searchSlot} onMouseEnter={measureSearch} onFocus={measureSearch}>
            <SearchForm className={styles.searchDesktop} />
          </div>
          <CartLink />
          <UserMenu />
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {menuOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function SearchForm({ className }: { className: string }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (query.trim()) navigate(`/market?busca=${encodeURIComponent(query.trim())}`);
  }

  return (
    <form role="search" className={[styles.search, className].join(" ")} onSubmit={handleSubmit}>
      <input
        type="search"
        placeholder="buscar na loja..."
        aria-label="Buscar na loja"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type="submit" aria-label="Pesquisar">
        <SearchIcon size={16} />
      </button>
    </form>
  );
}

// Atalho para o carrinho, com a quantidade de itens. Só aparece para quem está logado.
function CartLink() {
  const { user } = useAuth();
  const { cart } = useCart();
  if (!user) return null;

  const count = cart?.count ?? 0;
  return (
    <Link to="/market/carrinho" className={styles.cart} aria-label={count > 0 ? `Carrinho (${count})` : "Carrinho"}>
      <BagIcon size={20} />
      {count > 0 && <span className={styles.cartCount}>{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora dele
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!user) {
    return (
      <Link to="/login" className={styles.avatar} aria-label="Entrar">
        <UserIcon size={22} />
      </Link>
    );
  }

  return (
    <div className={styles.userMenu} ref={ref}>
      <button
        type="button"
        className={styles.avatar}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Menu da conta"
      >
        <Avatar user={user} size={33} />
      </button>
      {open && (
        <div className={styles.dropdown}>
          <p className={styles.userName}>{user.name}</p>
          <p className={styles.userHandle}>@{user.username}</p>
          <Link to="/conta" className={styles.menuItem} onClick={() => setOpen(false)}>
            Configurações
          </Link>
          <Link to="/market/pedidos" className={styles.menuItem} onClick={() => setOpen(false)}>
            Meus pedidos
          </Link>
          {user.role === "ADMIN" && (
            <Link to="/admin" className={styles.menuLink} onClick={() => setOpen(false)}>
              Painel admin
            </Link>
          )}
          <button type="button" className={styles.signOut} onClick={signOut}>
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
