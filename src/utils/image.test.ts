import { describe, expect, it } from "vitest";
import { fileToAvatar } from "./image";

// O recorte da imagem usa <canvas>, que o navegador simulado dos testes não implementa.
// Aqui ficam testadas as recusas, que acontecem antes de a imagem ser aberta.
describe("fileToAvatar", () => {
  it("recusa arquivos que não são imagem", async () => {
    const file = new File(["texto"], "nota.txt", { type: "text/plain" });
    await expect(fileToAvatar(file)).rejects.toThrow("Escolha um arquivo de imagem");
  });

  it("recusa PDF mesmo com extensão de imagem no nome", async () => {
    const file = new File(["%PDF"], "foto.jpg", { type: "application/pdf" });
    await expect(fileToAvatar(file)).rejects.toThrow("Escolha um arquivo de imagem");
  });

  it("recusa imagens com mais de 15 MB", async () => {
    const file = new File([new Uint8Array(15 * 1024 * 1024 + 1)], "enorme.png", { type: "image/png" });
    await expect(fileToAvatar(file)).rejects.toThrow("grande demais");
  });
});
