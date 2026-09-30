import type { ReactNode } from "react";
import heroPhoto from "@/assets/skate-hero.webp";
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
  return (
    <div className={styles.page}>
      <aside className={styles.hero}>
        <img src={heroPhoto} alt="" className={styles.heroPhoto} />
        <div className={styles.heroContent}>
          <div>
            <p className={styles.heroHeadline}>
              Find your spot.
              <br />
              Find your crew.
            </p>
            <Tagline inverted />
          </div>
        </div>
      </aside>

      <main className={styles.content}>
        <div className={styles.column}>
          <header className={styles.brand}>
            <Logo />
            <Tagline />
          </header>

          <section className={styles.card}>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
            {children}
          </section>

          <div className={styles.switcher}>{switcher}</div>

          <p className={styles.legal}>
            By continuing you agree to our <a href="#">Terms</a> <span aria-hidden>•</span>{" "}
            <a href="#">Privacy</a>
          </p>
        </div>
      </main>
    </div>
  );
}
