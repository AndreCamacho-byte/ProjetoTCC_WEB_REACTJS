import type { User } from "@/types/user";

type AvatarProps = {
  user: Pick<User, "name" | "avatarUrl">;
  size: number;
};

// Foto de perfil redonda. Sem foto, mostra a inicial do nome.
export function Avatar({ user, size }: AvatarProps) {
  // Largura e altura sempre iguais. A regra global "img { max-width: 100% }" estreitava só a largura
  // quando sobrava pouco espaço (comum no celular) e a foto ficava achatada: aqui ela não vale.
  const base = {
    width: size,
    height: size,
    minWidth: size,
    maxWidth: "none",
    borderRadius: "50%",
    flexShrink: 0,
  };

  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt="" style={{ ...base, objectFit: "cover", display: "block" }} />;
  }

  return (
    <span
      aria-hidden
      style={{
        ...base,
        display: "grid",
        placeItems: "center",
        background: "var(--brand-sand)",
        color: "var(--brand-ink)",
        fontWeight: 700,
        fontSize: size * 0.42,
      }}
    >
      {user.name.charAt(0).toUpperCase()}
    </span>
  );
}
