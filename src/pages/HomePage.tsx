import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";

// Página provisória depois do login. Aqui vai entrar o feed.
export function HomePage() {
  const { user, signOut } = useAuth();

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16, textAlign: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <Logo size="md" />
        <h1 style={{ margin: 0 }}>Hey, {user?.name}!</h1>
        <p style={{ margin: 0, color: "var(--color-text-muted)" }}>@{user?.username} · The feed is coming soon.</p>
        <Button onClick={signOut} style={{ maxWidth: 200 }}>
          Sign out
        </Button>
      </div>
    </main>
  );
}
