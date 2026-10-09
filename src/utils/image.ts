const AVATAR_SIZE = 256; // lado da foto de perfil, em pixels
const PRODUCT_SIZE = 800; // lado da foto de produto
const PRODUCT_MAX_BYTES = 560 * 1024; // o servidor aceita até 600 KB por foto
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB (limite do arquivo original, antes de reduzir)

// Prepara a foto de perfil no próprio navegador: recorta um quadrado no centro da imagem,
// reduz para 256x256 e converte para JPEG. Assim o que vai para o servidor é sempre pequeno,
// qualquer que seja o tamanho da foto escolhida.
export async function fileToAvatar(file: File): Promise<string> {
  return (await squareCanvas(file, AVATAR_SIZE)).toDataURL("image/jpeg", 0.85);
}

// Foto de produto: quadrada, 800x800, em JPEG. Se ainda ficar pesada, comprime um pouco mais.
export async function fileToProductPhoto(file: File): Promise<string> {
  const canvas = await squareCanvas(file, PRODUCT_SIZE);

  let photo = "";
  for (const quality of [0.85, 0.75, 0.6, 0.45]) {
    photo = canvas.toDataURL("image/jpeg", quality);
    if (dataUrlBytes(photo) <= PRODUCT_MAX_BYTES) break;
  }
  return photo;
}

// Tamanho, em bytes, do arquivo guardado em uma data URL base64
export function dataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return (base64.length * 3) / 4 - padding;
}

async function squareCanvas(file: File, size: number) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Escolha um arquivo de imagem (JPG, PNG ou WebP).");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("A imagem é grande demais. Escolha uma de até 15 MB.");
  }

  const image = await loadImage(file);
  const side = Math.min(image.naturalWidth, image.naturalHeight);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível processar a imagem neste navegador.");

  // Fundo branco para imagens com transparência (o JPEG não tem transparência)
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);
  context.drawImage(
    image,
    (image.naturalWidth - side) / 2,
    (image.naturalHeight - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );

  return canvas;
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
