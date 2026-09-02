type HelloWorldProps = {
  nome: string;
};

export function HelloWorld({ nome }: HelloWorldProps) {
  return (
    <div className="hello-world">
      <h1>Olá, {nome}!</h1>
      <p>Seu projeto React + TypeScript + Vite está funcionando.</p>
    </div>
  );
}
