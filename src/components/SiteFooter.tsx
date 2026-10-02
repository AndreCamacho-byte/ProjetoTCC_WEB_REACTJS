import { Link } from "react-router-dom";
import { FacebookIcon, InstagramIcon, MailIcon, TwitterIcon, YoutubeIcon } from "./icons";
import { Logo } from "./Logo";
import styles from "./SiteFooter.module.css";

const CONTACT_EMAIL = "clutchenterprisesbr@gmail.com";

// Links das redes sociais: troque "#" pelos endereços reais quando existirem
const SOCIAL_LINKS = [
  { label: "Instagram", href: "#", Icon: InstagramIcon },
  { label: "Twitter", href: "#", Icon: TwitterIcon },
  { label: "YouTube", href: "#", Icon: YoutubeIcon },
  { label: "Facebook", href: "#", Icon: FacebookIcon },
  { label: "Email", href: `mailto:${CONTACT_EMAIL}`, Icon: MailIcon },
];

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Logo size="md" inverted />
            <p>For those who Shred</p>
          </div>

          <nav aria-label="Rodapé">
            <h2 className={styles.title}>Navegação</h2>
            <ul className={styles.list}>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/comunidade">Comunidade</Link></li>
              <li><Link to="/market">Marketplace</Link></li>
              <li><Link to="/sobre">Sobre nós</Link></li>
              <li><Link to="/privacidade">Política de Privacidade</Link></li>
            </ul>
          </nav>

          <div>
            <h2 className={styles.title}>Contato</h2>
            <ul className={styles.list}>
              <li>São Paulo, SP</li>
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          <ul className={styles.social}>
            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <li key={label}>
                <a href={href} aria-label={label}>
                  <Icon size={18} />
                </a>
              </li>
            ))}
          </ul>
          <p className={styles.copyright}>
            © 2026 Clutch
            <br />
            Todos os direitos reservados
          </p>
        </div>
      </div>
    </footer>
  );
}
