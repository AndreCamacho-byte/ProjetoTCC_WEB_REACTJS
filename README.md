# meu-projeto

Projeto base React + TypeScript + Vite.

## Como rodar

```bash
npm install
npm run dev
```

## Estrutura de pastas

```
src/
  assets/       # imagens, ícones, fontes
  components/   # componentes reutilizáveis (ex: HelloWorld.tsx)
  hooks/        # custom hooks (useX.ts)
  pages/        # telas/páginas da aplicação
  services/     # chamadas de API, integrações externas
  styles/       # CSS global e temas
  types/        # tipos e interfaces TypeScript compartilhados
  utils/        # funções utilitárias/helpers
  App.tsx       # componente raiz
  main.tsx      # ponto de entrada
```

## Testes

```bash
npm test              # roda todos os testes uma vez
npm run test:watch    # fica rodando e repete a cada alteração
```

Os testes ficam ao lado de cada arquivo (`*.test.ts` / `*.test.tsx`) e usam [Vitest](https://vitest.dev) com [Testing Library](https://testing-library.com), que simula a pessoa digitando e clicando nas telas. As chamadas à API são simuladas, então não é preciso ter o backend rodando.
