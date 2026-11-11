import { Link } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { MIN_AGE } from "@/utils/age";
import styles from "./PrivacyPage.module.css";

const CONTACT_EMAIL = "clutchenterprisesbr@gmail.com";

// Sobre nós: o que é o Clutch, para quem é e como ele nasceu (Trabalho de Conclusão de Curso)
export function AboutPage() {
  usePageTitle("Sobre nós");

  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Sobre nós</p>
        <h1>Feito por quem anda de skate</h1>
      </header>

      <p className={styles.lead}>
        O Clutch é uma rede social para skatistas. Ele junta, num lugar só, o que hoje fica espalhado entre grupos de
        mensagem, perfis em redes sociais e lojas diferentes: onde andar, com quem andar e o que vestir.
      </p>

      <section>
        <h2>Por que o Clutch existe</h2>
        <p>
          Quem anda de skate sabe: o pico bom a gente descobre de boca em boca, o rolê é combinado em grupo que ninguém
          acha depois, e a roupa de skate fica perdida no meio de lojas que não são feitas para a gente. O Clutch nasceu
          para resolver isso e dar à cena um espaço que seja dela.
        </p>
      </section>

      <section>
        <h2>O que dá para fazer aqui</h2>
        <ul>
          <li>
            <strong>Explorar spots:</strong> encontre picos no <Link to="/explorar">mapa</Link> e sugira novos. Cada
            sugestão passa pela equipe antes de aparecer para todo mundo.
          </li>
          <li>
            <strong>Marcar encontros:</strong> combine um rolê num spot e veja quem vai em{" "}
            <Link to="/eventos">Eventos</Link>.
          </li>
          <li>
            <strong>Comunidade:</strong> poste fotos e manobras, comente, siga outros skatistas e converse com os
            amigos na <Link to="/comunidade">comunidade</Link>.
          </li>
          <li>
            <strong>Market:</strong> encontre streetwear e peças de skate na <Link to="/market">loja</Link>.
          </li>
        </ul>
      </section>

      <section>
        <h2>Um espaço seguro</h2>
        <p>
          O Clutch é para maiores de {MIN_AGE} anos. Todo conteúdo pode ser denunciado, qualquer pessoa pode ser
          bloqueada, e a equipe acompanha as denúncias. O seu email nunca aparece para outros usuários. Os detalhes
          estão nos <Link to="/termos">Termos de Uso</Link> e na <Link to="/privacidade">Política de Privacidade</Link>.
        </p>
      </section>

      <section>
        <h2>Quem fez</h2>
        <p>
          O Clutch é um Trabalho de Conclusão de Curso, criado por um grupo de quatro estudantes. Por ser um projeto
          acadêmico, a loja ainda não faz cobranças de verdade: as compras são simuladas.
        </p>
      </section>

      <section>
        <h2>Fale com a gente</h2>
        <p>
          Dúvidas, ideias ou um spot que ficou de fora? Escreva para{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </article>
  );
}
