# Clutch — Frontend

Site do **Clutch**, a rede social do skatista: spots e encontros no mapa, comunidade com feed e chat entre amigos, e uma loja de streetwear. Projeto de Trabalho de Conclusão de Curso (turma DS2A, 2026).

**Grupo:** André Camacho, Gabriel Neri, Guilherme Sales e Tito Leal.

| Repositório | O que é |
|---|---|
| **ProjetoTCC_WEB_REACTJS** (este) | Site em React |
| [ProjetoTCC_WEB_BACKEND](https://github.com/AndreCamacho-byte/ProjetoTCC_WEB_BACKEND) | API e banco de dados |
| [Terraform_TCC_WEB_REACT](https://github.com/AndreCamacho-byte/Terraform_TCC_WEB_REACT) | Infraestrutura na AWS |

## O que o site faz

| Área | Funcionalidades |
|---|---|
| **Conta** | Cadastro com @username e confirmação do email por código, login em duas etapas (senha + código por email), esqueci minha senha, foto de perfil, bio, nível de skate, troca de senha e exclusão da conta |
| **Explorar (spots)** | Mapa do OpenStreetMap com os spots aprovados, "usar minha localização", sugerir spot com até 3 fotos |
| **Eventos (encontros)** | Marcar encontro num spot (com ou sem limite de pessoas), confirmar e desmarcar presença, "Meus encontros" |
| **Comunidade** | Feed "Todos" e "Seguindo", posts com até 4 fotos, curtir, comentar, salvar, compartilhar, seguir, perfil público e busca de pessoas |
| **Mensagens** | Chat entre amigos (quem se segue) e envio de posts para amigos |
| **Market** | Vitrine com filtros, página do produto (tamanhos, detalhes, perguntas frequentes), carrinho, compra com pagamento simulado e pedidos |
| **Painel do administrador** | Usuários (editar, suspender, remover), produtos e marcas, pedidos e aprovação de spots |
| **Segurança** | Spots, encontros e loja só a partir dos 12 anos; o email de ninguém aparece no site; sair da conta pede confirmação |

## Tecnologias

React 18 · TypeScript 5 · Vite 8 · React Router 7 · CSS Modules · Leaflet 1.9 (OpenStreetMap) · Vitest · Testing Library

## Como rodar

O site precisa da API rodando em `http://localhost:3000` (veja o README do backend).

```bash
npm install
npm run dev
```

Abra http://localhost:5173. As chamadas para `/api` são repassadas para o backend local (configurado em `vite.config.ts`).

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Sobe o site em modo desenvolvimento |
| `npm run build` | Confere os tipos e gera a versão de produção em `dist/` |
| `npm run preview` | Abre a versão de produção gerada |
| `npm test` | Roda os testes automáticos |
| `npm run test:watch` | Roda os testes e repete a cada alteração |
| `npm run typecheck:tests` | Confere os tipos dos arquivos de teste |

## Estrutura de pastas

```
src/
  main.tsx      ponto de entrada: roteador, login (AuthProvider) e carrinho (CartProvider)
  App.tsx       todas as rotas e as proteções de cada uma
  layouts/      moldura das páginas (cabeçalho e rodapé) e das telas de login
  pages/        telas: market/, community/, chat/, spots/, conta, login e painel do admin
  components/   peças reaproveitáveis (cabeçalho, botão, campo, foto de perfil, proteções de rota)
  services/     única camada que chama a API (api.ts põe o token e trata os erros)
  hooks/        dados compartilhados: useAuth (quem está logado), useCart (carrinho)
  types/        formato dos dados em TypeScript
  utils/        validação de formulários, formatação de preço e data, redução das fotos
  styles/       cores e fontes da marca
  test/         utilitários dos testes
```

O atalho `@/` nos imports aponta para `src/` (configurado no `vite.config.ts` e no `tsconfig.app.json`).

### Proteções de rota

| Componente | O que faz |
|---|---|
| `PrivateRoute` | Exige login |
| `AdminRoute` | Só administradores |
| `PublicOnlyRoute` | Quem já entrou não vê login e cadastro |
| `AgeGate` | Spots, encontros e loja só a partir dos 12 anos |
| `UsernameGate` | Contas antigas escolhem um @username antes de continuar |

As mesmas regras existem na API: esconder uma tela não é a única proteção.

## Testes

```bash
npm test
```

**250 testes** em 19 arquivos, todos passando. Ficam ao lado de cada arquivo (`*.test.ts` / `*.test.tsx`) e usam [Vitest](https://vitest.dev) com [Testing Library](https://testing-library.com), que simula a pessoa digitando e clicando. As chamadas à API são simuladas, então não é preciso ter o backend rodando.

## Publicação (deploy)

O site é publicado na AWS pelo [Terraform](https://github.com/AndreCamacho-byte/Terraform_TCC_WEB_REACT): uma máquina com Nginx serve os arquivos de `dist/` e repassa `/api` para a máquina da API, e o CloudFront entrega tudo em HTTPS. No build, a variável `VITE_SITE_URL` recebe o endereço público do site, usado na prévia do link ao compartilhar.
