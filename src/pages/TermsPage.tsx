import { Link } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { MIN_AGE } from "@/utils/age";
import styles from "./PrivacyPage.module.css";

const CONTACT_EMAIL = "clutchenterprisesbr@gmail.com";
const LAST_UPDATE = "16 de outubro de 2026";

// Termos de Uso: as regras de convivência e o que o Clutch é (e não é).
// Ao mudar as regras do site, atualize esta página e a data acima.
export function TermsPage() {
  usePageTitle("Termos de Uso");

  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Regras do Clutch</p>
        <h1>Termos de Uso</h1>
        <p className={styles.updated}>Última atualização: {LAST_UPDATE}</p>
      </header>

      <p className={styles.lead}>
        Estes termos explicam como o Clutch funciona e as regras para usar o site. Ao criar uma conta, você concorda
        com eles e com a nossa <Link to="/privacidade">Política de Privacidade</Link>.
      </p>

      <section>
        <h2>1. O que é o Clutch</h2>
        <p>
          O Clutch é uma rede social para skatistas, criada como Trabalho de Conclusão de Curso. Ele reúne uma
          comunidade para postar e conversar, uma loja de streetwear e, em breve, spots e encontros no mapa. Por ser
          um projeto acadêmico em fase de testes, o site pode ficar fora do ar, mudar ou ter funções removidas.
        </p>
      </section>

      <section>
        <h2>2. Sua conta</h2>
        <ul>
          <li>Use seus dados verdadeiros e confirme o seu email para entrar.</li>
          <li>A conta é pessoal: não compartilhe a sua senha. Você responde pelo que for feito com ela.</li>
          <li>
            Spots, encontros e a loja só são liberados a partir dos {MIN_AGE} anos. Se você tem menos de 18 anos, use o
            Clutch com o conhecimento dos seus pais ou responsáveis.
          </li>
          <li>
            Você pode excluir a sua conta quando quiser, em <Link to="/conta">Configurações</Link>. Isso apaga os seus
            posts, comentários, curtidas e pedidos.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Regras da comunidade</h2>
        <p>O Clutch é um lugar para quem anda de skate se encontrar. Para ele continuar assim, é proibido postar:</p>
        <ul>
          <li>Ofensas, ameaças, assédio, bullying ou discurso de ódio contra qualquer pessoa ou grupo;</li>
          <li>Conteúdo sexual, violento ou que incentive o uso de drogas;</li>
          <li>Fotos ou dados pessoais de outras pessoas sem a autorização delas (endereço, telefone, documentos);</li>
          <li>Golpes, propaganda repetitiva (spam) ou links enganosos;</li>
          <li>Fotos ou textos que não são seus e que você não tem permissão para usar.</li>
        </ul>
        <p>
          As mesmas regras valem para o chat. Só amigos (pessoas que se seguem) conversam: para parar de receber
          mensagens de alguém, deixe de seguir a pessoa. Se receber algo que quebre estas regras, denuncie pelo email de
          contato.
        </p>
        <p>
          O que você posta continua sendo seu. Ao postar, você permite que o Clutch mostre esse conteúdo dentro do
          site enquanto ele estiver publicado.
        </p>
      </section>

      <section>
        <h2>4. Moderação</h2>
        <p>
          Os administradores do Clutch podem apagar posts e comentários que quebrem estas regras e suspender contas.
          Uma conta suspensa não consegue entrar, e os posts dela deixam de aparecer. Se achar que houve um engano,
          escreva para <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>5. Encontros e segurança</h2>
        <p>
          Quando os encontros forem lançados, eles acontecerão no mundo real. Prefira lugares públicos, avise alguém
          de confiança e use equipamento de proteção. Cada pessoa é responsável pela própria segurança durante a
          prática do skate e nos encontros.
        </p>
      </section>

      <section>
        <h2>6. Market</h2>
        <p>
          <strong>Nesta fase de testes, as compras são simuladas:</strong> nenhum valor é cobrado, o site não pede
          dados de cartão e nenhum produto é enviado de verdade. Os pedidos servem para demonstrar como a loja
          funciona.
        </p>
      </section>

      <section>
        <h2>7. Limites de responsabilidade</h2>
        <p>
          O Clutch não se responsabiliza pelo que os usuários postam nem pelo que acontece fora do site, mas age para
          retirar conteúdos que quebrem estas regras assim que fica sabendo deles.
        </p>
      </section>

      <section>
        <h2>8. Mudanças e contato</h2>
        <p>
          Estes termos podem mudar. A nova versão é publicada nesta página com a data de atualização. Dúvidas,
          denúncias ou pedidos: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Estes termos seguem as leis
          brasileiras.
        </p>
      </section>
    </article>
  );
}
