# Clutch — Frontend

Site do **Clutch**, uma rede social para skatistas: spots e encontros no mapa, comunidade e marketplace de streetwear. Projeto de Trabalho de Conclusão de Curso.

Este repositório é o frontend. A API fica em [ProjetoTCC_WEB_BACKEND](https://github.com/AndreCamacho-byte/ProjetoTCC_WEB_BACKEND).

**Stack:** React 18 · TypeScript · Vite · React Router · CSS Modules · Vitest

## O que já existe

- **Homepage** com a identidade visual da marca
- **Conta:** cadastro com confirmação de email por código de 6 dígitos, login, esqueci minha senha
- **Configurações:** foto de perfil, nome, @username, troca de senha e exclusão da conta
- **Regra de idade:** spots, encontros e marketplace liberados a partir dos 12 anos
- **Painel do administrador:** listar, buscar, editar e remover usuários
- **Política de privacidade**

Em construção: mapa de spots e encontros, feed da comunidade e marketplace.

## Como rodar

O site precisa da API rodando em `http://localhost:3000` (veja o README do backend).

```bash
npm install
npm run dev
```

Abra http://localhost:5173. As chamadas para `/api` são repassadas para o backend local.

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Sobe o site em modo desenvolvimento |
| `npm run build` | Confere os tipos e gera a versão de produção em `dist/` |
| `npm run preview` | Abre a versão de produção gerada |
| `npm test` | Roda os testes unitários |
| `npm run test:watch` | Roda os testes e repete a cada alteração |
| `npm run typecheck:tests` | Confere os tipos dos arquivos de teste |

## Estrutura de pastas

```
src/
  assets/       imagens do site
  components/   componentes reutilizáveis (cabeçalho, rodapé, campos, proteção de rotas)
  hooks/        hooks (useAuth, usePageTitle)
  layouts/      estrutura das páginas (site com cabeçalho/rodapé, telas de login)
  pages/        telas
  services/     chamadas à API
  styles/       CSS global e cores da marca
  test/         utilitários dos testes
  types/        tipos compartilhados
  utils/        validações, regra de idade, preparo da foto de perfil
  App.tsx       rotas
  main.tsx      ponto de entrada
```

## Testes

```bash
npm test
```

Os testes ficam ao lado de cada arquivo (`*.test.ts` / `*.test.tsx`) e usam [Vitest](https://vitest.dev) com [Testing Library](https://testing-library.com), que simula a pessoa digitando e clicando nas telas. As chamadas à API são simuladas, então não é preciso ter o backend rodando.

## Deploy

O site é publicado na AWS por Terraform: uma máquina com Nginx serve os arquivos de `dist/` e repassa `/api` para a máquina do backend. Na hora do build, a variável `VITE_SITE_URL` recebe o endereço público do site, usado na prévia do link ao compartilhar.
