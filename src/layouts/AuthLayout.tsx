import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import heroPhoto from "@/assets/skate-hero.webp";
import { ChevronLeftIcon } from "@/components/icons";
import { Logo, Tagline } from "@/components/Logo";
import styles from "./AuthLayout.module.css";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  // Link para alternar entre login e cadastro, exibido abaixo do card
  switcher: ReactNode;
};

// Layout das telas de login e cadastro.
// Celular: igual ao mockup (logo, card e link). Desktop: foto à esquerda e formulário à direita.
export function AuthLayout({ title, subtitle, children, switcher }: AuthLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Volta para a página anterior do site. Se a pessoa abriu o login direto por um link
  // (sem página anterior no Clutch), leva para a home.
  function goBack() {
    if (location.key !== "default") navigate(-1);
    else navigate("/");
  }

  return (
    <div className={styles.page}>
      {/* Fica no canto superior esquerdo da tela (sobre a foto no desktop) */}
      <button type="button" className={styles.backButton} onClick={goBack}>
        <ChevronLeftIcon size={18} strokeWidth={2.5} />
        Voltar
      </button>

      <aside className={styles.hero}>
        <img src={heroPhoto} alt="" className={styles.heroPhoto} />
        <div className={styles.heroContent}>
          <div>
            <p className={styles.heroHeadline}>
              Ache seu spot.
              <br />
              Ache sua crew.
            </p>
            <Tagline inverted />
          </div>
        </div>
      </aside>

      <main className={styles.content}>
        <div className={styles.column}>
          <header className={styles.brand}>
            <Link to="/" className={styles.brandLink} aria-label="Clutch, página inicial">
              <Logo />
            </Link>
            <Tagline />
          </header>

          <section className={styles.card}>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
            {children}
          </section>

          <div className={styles.switcher}>{switcher}</div>

          <p className={styles.legal}>
            Ao continuar, você concorda com os nossos <a href="#">Termos</a> <span aria-hidden>•</span>{" "}
            <a href="#">Privacidade</a>
          </p>
        </div>
      </main>
    </div>
  );
}
