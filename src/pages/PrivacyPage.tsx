import { Link } from "react-router-dom";
import { MIN_AGE } from "@/utils/age";
import styles from "./PrivacyPage.module.css";

const CONTACT_EMAIL = "clutchenterprisesbr@gmail.com";
const LAST_UPDATE = "2 de outubro de 2026";

// Política de Privacidade. O texto descreve o que o site faz de verdade com os dados:
// ao mudar o que é coletado (ex.: localização nos spots, endereço no marketplace),
// atualize esta página e a data acima.
export function PrivacyPage() {
  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Privacidade</p>
        <h1>Política de Privacidade</h1>
        <p className={styles.updated}>Última atualização: {LAST_UPDATE}</p>
      </header>

      <p className={styles.lead}>
        Esta política explica quais dados o Clutch coleta, por que coleta, com quem compartilha e como você pode
        consultar, corrigir ou apagar o que é seu. Ela segue a Lei Geral de Proteção de Dados (LGPD, Lei nº
        13.709/2018).
      </p>

      <section>
        <h2>1. Quem somos</h2>
        <p>
          O Clutch é uma rede social para skatistas, desenvolvida como projeto acadêmico (Trabalho de Conclusão de
          Curso). Para qualquer assunto sobre os seus dados, fale com a gente pelo email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>2. Quais dados coletamos</h2>
        <h3>Dados que você informa</h3>
        <ul>
          <li>
            <strong>Nome, email e senha</strong>, no cadastro. A senha é guardada de forma embaralhada (hash): nem a
            nossa equipe consegue ler.
          </li>
          <li>
            <strong>Data de nascimento</strong>, usada só para aplicar a regra de idade mínima de algumas áreas do
            site.
          </li>
          <li>
            <strong>Nome de usuário (@)</strong>, criado a partir do seu email e que você pode trocar.
          </li>
          <li>
            <strong>Foto de perfil</strong>, se você quiser enviar uma.
          </li>
        </ul>
        <h3>Dados gerados pelo uso</h3>
        <ul>
          <li>Datas de criação da conta e de confirmação do email.</li>
          <li>
            Códigos e links temporários de confirmação de email e de redefinição de senha, guardados de forma
            embaralhada e apagados depois de usados.
          </li>
          <li>
            Registros técnicos de acesso mantidos pelo servidor, como endereço IP, data e hora, usados para
            segurança e diagnóstico de problemas.
          </li>
        </ul>
        <h3>O que não coletamos</h3>
        <p>
          Hoje o Clutch não coleta a sua localização, não usa cookies de publicidade nem ferramentas de rastreamento
          e não vende dados. Quando as áreas de spots, encontros e marketplace forem lançadas, esta política será
          atualizada antes de qualquer novo dado ser coletado, e a localização só será usada com a sua permissão.
        </p>
      </section>

      <section>
        <h2>3. Para que usamos os dados</h2>
        <ul>
          <li>
            <strong>Criar e manter a sua conta</strong> e permitir o login (necessário para prestar o serviço que
            você pediu).
          </li>
          <li>
            <strong>Enviar emails da conta</strong>: confirmação do cadastro e redefinição de senha. Não enviamos
            propaganda.
          </li>
          <li>
            <strong>Aplicar a regra de idade</strong> das áreas restritas (proteção de crianças e adolescentes).
          </li>
          <li>
            <strong>Mostrar o seu perfil</strong> (nome, @ e foto) dentro do site.
          </li>
          <li>
            <strong>Manter o site seguro</strong>, prevenindo abusos e acessos indevidos (legítimo interesse).
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Crianças e adolescentes</h2>
        <p>
          As áreas de spots, encontros e marketplace são liberadas somente a partir dos {MIN_AGE} anos. Contas sem
          data de nascimento informada ficam com essas áreas bloqueadas até a data ser preenchida.
        </p>
        <p>
          Se você tem menos de {MIN_AGE} anos, crie e use a sua conta apenas com o conhecimento e o consentimento
          do seu pai, mãe ou responsável. Responsáveis podem pedir a exclusão da conta de uma criança pelo email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>5. Com quem compartilhamos</h2>
        <p>Não vendemos nem cedemos os seus dados. Eles passam apenas pelos serviços que fazem o site funcionar:</p>
        <ul>
          <li>
            <strong>Amazon Web Services (AWS)</strong>: hospedagem do site e do servidor.
          </li>
          <li>
            <strong>Aiven</strong>: banco de dados onde ficam as contas.
          </li>
          <li>
            <strong>Brevo</strong>: envio dos emails de confirmação e de redefinição de senha (recebe o seu nome e
            email para entregar a mensagem).
          </li>
          <li>
            <strong>Google Fonts</strong>: fornece as fontes do site. Ao carregar a página, o seu navegador se
            conecta aos servidores do Google, que recebem o seu endereço IP.
          </li>
        </ul>
        <p>
          Alguns desses serviços mantêm servidores fora do Brasil, então os seus dados podem ser armazenados em
          outros países. Dentro do Clutch, os administradores do site podem ver o seu nome, email e idade, e podem
          corrigir ou remover contas para moderar a plataforma.
        </p>
      </section>

      <section>
        <h2>6. Onde os dados ficam no seu aparelho</h2>
        <p>
          Para manter você conectado, o site guarda no seu navegador um código de sessão (armazenamento local), que
          vale por 7 dias e é apagado quando você clica em “Sair”. Não usamos cookies de terceiros.
        </p>
      </section>

      <section>
        <h2>7. Por quanto tempo guardamos</h2>
        <p>
          Os seus dados ficam guardados enquanto a sua conta existir. Quando você exclui a conta, apagamos o seu
          cadastro, a foto de perfil e os conteúdos ligados a ela. Códigos de confirmação e links de redefinição de
          senha expiram sozinhos (em até 24 horas e em 1 hora, respectivamente).
        </p>
      </section>

      <section>
        <h2>8. Segurança</h2>
        <p>
          Senhas, códigos e links são guardados de forma embaralhada, o acesso ao banco de dados é restrito e
          criptografado, e só administradores acessam o painel de usuários.
        </p>
        <p>
          Como o Clutch é um projeto acadêmico em fase de testes, o endereço do site pode ainda não usar conexão
          criptografada (HTTPS). Por isso, não use aqui uma senha que você usa em outros serviços. Nenhum sistema é
          totalmente seguro: se soubermos de algum incidente que afete os seus dados, avisaremos você.
        </p>
      </section>

      <section>
        <h2>9. Seus direitos</h2>
        <p>Pela LGPD, você pode a qualquer momento:</p>
        <ul>
          <li>
            <strong>Consultar e corrigir</strong> seus dados: nome, @ e foto ficam em{" "}
            <Link to="/conta">Configurações</Link>.
          </li>
          <li>
            <strong>Excluir a sua conta</strong> e os dados ligados a ela, também em{" "}
            <Link to="/conta">Configurações</Link>.
          </li>
          <li>
            <strong>Pedir uma cópia</strong> dos seus dados, a correção da data de nascimento ou tirar dúvidas sobre
            o tratamento, pelo email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </li>
          <li>
            <strong>Reclamar</strong> à Autoridade Nacional de Proteção de Dados (ANPD), se achar que os seus dados
            não foram tratados corretamente.
          </li>
        </ul>
      </section>

      <section>
        <h2>10. Mudanças nesta política</h2>
        <p>
          Se esta política mudar, a nova versão será publicada nesta página com a data de atualização. Mudanças
          importantes, como a coleta de um novo tipo de dado, serão avisadas no site.
        </p>
      </section>
    </article>
  );
}
