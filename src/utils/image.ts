const AVATAR_SIZE = 256; // lado da foto de perfil, em pixels
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB (limite do arquivo original, antes de reduzir)

// Prepara a foto de perfil no próprio navegador: recorta um quadrado no centro da imagem,
// reduz para 256x256 e converte para JPEG. Assim o que vai para o servidor é sempre pequeno,
// qualquer que seja o tamanho da foto escolhida.
export async function fileToAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Escolha um arquivo de imagem (JPG, PNG ou WebP).");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("A imagem é grande demais. Escolha uma de até 15 MB.");
  }

  const image = await loadImage(file);
  const side = Math.min(image.naturalWidth, image.naturalHeight);

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível processar a imagem neste navegador.");

  // Fundo branco para imagens com transparência (o JPEG não tem transparência)
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  context.drawImage(
    image,
    (image.naturalWidth - side) / 2,
    (image.naturalHeight - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );

  return canvas.toDataURL("image/jpeg", 0.85);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível abrir essa imagem. Tente outro arquivo."));
    };
    image.src = url;
  });
}
