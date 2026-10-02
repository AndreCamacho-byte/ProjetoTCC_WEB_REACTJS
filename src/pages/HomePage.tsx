import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeftIcon, ChevronRightIcon, MailIcon } from "@/components/icons";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import heroPhoto from "@/assets/home/hero.jpg";
import conteudoPhoto from "@/assets/home/conteudo.jpg";
import mosaicoClutch from "@/assets/home/mosaico-clutch.jpg";
import mosaicoEveryone from "@/assets/home/mosaico-everyone.jpg";
import mosaicoShredding from "@/assets/home/mosaico-shredding.jpg";
import mosaicoSkate from "@/assets/home/mosaico-skate.jpg";
import newsletterPhoto from "@/assets/home/newsletter.jpg";
import logoCsb from "@/assets/home/parceiro-csb.png";
import logoSls from "@/assets/home/parceiro-sls.png";
import logoVans from "@/assets/home/parceiro-vans.png";
import logoWorldSkate from "@/assets/home/parceiro-world-skate.png";
import servico1 from "@/assets/home/servico-1.jpg";
import servico2 from "@/assets/home/servico-2.jpg";
import servico3 from "@/assets/home/servico-3.jpg";
import servico4 from "@/assets/home/servico-4.jpg";
import styles from "./HomePage.module.css";

const SERVICES = [
  {
    title: "Spots",
    text: "Descubra picos de street, bowl e pista perto de você, direto no mapa.",
    image: servico1,
    to: "/explorar",
  },
  {
    title: "Encontros",
    text: "Marque dia, hora e local para andar com a galera. Quem topar, confirma presença.",
    image: servico2,
    to: "/eventos",
  },
  {
    title: "Market",
    text: "Roupas e acessórios streetwear das marcas parceiras, sem sair do Clutch.",
    image: servico3,
    to: "/market",
  },
  {
    title: "Comunidade",
    text: "Poste suas manobras, siga outros skatistas e acompanhe o rolê de todo mundo.",
    image: servico4,
    to: "/comunidade",
  },
];

const PARTNERS = [
  { name: "SLS", logo: logoSls },
  { name: "CSB", logo: logoCsb },
  { name: "World Skate", logo: logoWorldSkate },
  { name: "Vans", logo: logoVans },
];

export function HomePage() {
  usePageTitle();

  return (
    <div className={styles.page}>
      <Hero />
      <Services />
      <Mosaic />
      <Partners />
      <Content />
      <Newsletter />
    </div>
  );
}

function Hero() {
  const { user } = useAuth();

  return (
    <section className={styles.hero}>
      <img src={heroPhoto} alt="" className={styles.heroPhoto} />
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>For those who shred</h1>
        <p className={styles.heroText}>
          Encontre spots, marque sessões com a sua crew e vista a cultura street. Tudo em um só lugar.
        </p>
        <div className={styles.heroActions}>
          {/* Quem já tem conta não precisa de "Participe": vai direto para os spots */}
          {user ? (
            <Link to="/explorar" className={styles.buttonPrimary}>
              Explorar spots
            </Link>
          ) : (
            <Link to="/register" className={styles.buttonPrimary}>
              Participe
            </Link>
          )}
          <a href="#servicos" className={styles.buttonSecondary}>
            Saiba Mais
          </a>
        </div>
      </div>
    </section>
  );
}

function Services() {
  const trackRef = useRef<HTMLUListElement>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });

  // Liga/desliga as setas conforme a posição do carrossel
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () =>
      setCanScroll({
        left: track.scrollLeft > 4,
        right: track.scrollLeft + track.clientWidth < track.scrollWidth - 4,
      });
    update();
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      track.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  function scroll(direction: 1 | -1) {
    const track = trackRef.current;
    const card = track?.firstElementChild as HTMLElement | null;
    if (track && card) track.scrollBy({ left: direction * (card.offsetWidth + 16), behavior: "smooth" });
  }

  return (
    <section id="servicos" className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Serviços</h2>
        <div className={styles.arrows}>
          <button type="button" onClick={() => scroll(-1)} disabled={!canScroll.left} aria-label="Anterior">
            <ChevronLeftIcon size={22} strokeWidth={2.5} />
          </button>
          <button type="button" onClick={() => scroll(1)} disabled={!canScroll.right} aria-label="Próximo">
            <ChevronRightIcon size={22} strokeWidth={2.5} />
          </button>
        </div>
      </div>
      <ul className={styles.carousel} ref={trackRef}>
        {SERVICES.map((service) => (
          <li key={service.title} className={styles.serviceCard}>
            <Link to={service.to}>
              <img src={service.image} alt="" />
              <h3>{service.title}</h3>
              <p>{service.text}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Mosaic() {
  return (
    <section className={`${styles.section} ${styles.mosaic}`}>
      <div className={`${styles.tile} ${styles.tileWide}`}>
        <img src={mosaicoEveryone} alt="" />
        <div className={styles.tileWideText}>
          <h2>skating for everyone</h2>
          <p>Do primeiro ollie ao primeiro campeonato: no Clutch tem espaço para todo nível.</p>
        </div>
      </div>
      <div className={`${styles.tile} ${styles.tileSmall}`}>
        <img src={mosaicoSkate} alt="" />
        <span className={styles.tileWord}>skate</span>
      </div>
      <div className={`${styles.tile} ${styles.tileSmall}`}>
        <img src={mosaicoClutch} alt="" />
        <span className={styles.tileWord}>clutch</span>
      </div>
      <div className={`${styles.tile} ${styles.tileTall}`}>
        <img src={mosaicoShredding} alt="" />
        <div className={styles.tileTallText}>
          <h2>shredding made easier</h2>
          <p>Ache o spot, chame a crew e vá andar.</p>
        </div>
      </div>
    </section>
  );
}

function Partners() {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Parceiros</h2>
      <ul className={styles.partners}>
        {PARTNERS.map((partner) => (
          <li key={partner.name}>
            <img src={partner.logo} alt={partner.name} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Content() {
  return (
    <section className={`${styles.section} ${styles.content}`}>
      <img src={conteudoPhoto} alt="" className={styles.contentPhoto} />
      <div className={styles.contentCard}>
        <p className={styles.kicker}>marketplace</p>
        <h2 className={styles.contentTitle}>Vista a cultura</h2>
        <p className={styles.contentText}>
          O Market do Clutch reúne roupas, shapes e acessórios de marcas que vivem o skate de verdade. Cada compra
          fortalece quem apoia a cena, e você recebe em casa o que viu a crew usando nas sessões. Novas coleções
          entram toda semana, com drops exclusivos para quem faz parte da comunidade.
        </p>
        <Link to="/market" className={styles.buttonBlock}>
          ver mais
        </Link>
      </div>
    </section>
  );
}

function Newsletter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");

  // Leva para o cadastro já com o email preenchido
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    navigate("/register", { state: { email: email.trim() } });
  }

  return (
    <section className={`${styles.section} ${styles.newsletter}`}>
      <div className={styles.newsletterText}>
        <p className={styles.kicker}>No Time to Waste</p>
        <h2 className={styles.newsletterTitle}>Come Ride With Us</h2>
        {user ? (
          // Quem já está logado não precisa informar o email: o convite leva para os encontros
          <div className={styles.newsletterForm}>
            <Link to="/eventos" className={styles.buttonBlock}>
              ver encontros
            </Link>
          </div>
        ) : (
          <form className={styles.newsletterForm} onSubmit={handleSubmit}>
            <label className={styles.emailField}>
              <span className={styles.emailIcon}>
                <MailIcon size={16} />
              </span>
              <input
                type="email"
                placeholder="seu e-mail aqui"
                aria-label="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button type="submit" className={styles.buttonBlock}>
              participar
            </button>
          </form>
        )}
      </div>
      <div className={styles.newsletterMedia}>
        <img src={newsletterPhoto} alt="" className={styles.newsletterPhoto} />
      </div>
    </section>
  );
}
