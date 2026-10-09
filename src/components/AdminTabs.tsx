import { NavLink } from "react-router-dom";
import styles from "@/pages/AdminUsersPage.module.css";

const TABS = [
  { to: "/admin", label: "Usuários" },
  { to: "/admin/produtos", label: "Produtos" },
  { to: "/admin/pedidos", label: "Pedidos" },
];

// Abas do painel do administrador
export function AdminTabs() {
  return (
    <nav className={styles.tabs} aria-label="Painel do administrador">
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end className={({ isActive }) => (isActive ? styles.tabActive : styles.tab)}>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
