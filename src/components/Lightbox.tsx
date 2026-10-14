import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "./icons";
import styles from "./Lightbox.module.css";

type Props = {
  // Uma ou mais fotos; com mais de uma aparecem as setas
  images: string[];
  index?: number;
  alt: string;
  // Foto de perfil fica redonda
  round?: boolean;
  onIndexChange?: (index: number) => void;
  onClose: () => void;
};

// Foto ampliada por cima da página. Fecha com Esc, com o X ou clicando fora da foto.
export function Lightbox({ images, index = 0, alt, round = false, onIndexChange, onClose }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const many = images.length > 1;
  const go = (step: number) => onIndexChange?.((index + step + images.length) % images.length);

  useEffect(() => {
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (many && event.key === "ArrowRight") go(1);
      if (many && event.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    // A página de trás não rola enquanto a foto está aberta
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  });

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <button ref={closeButton} type="button" className={styles.close} aria-label="Fechar foto" onClick={onClose}>
        <CloseIcon size={24} />
      </button>

      {many && (
        <button type="button" className={`${styles.arrow} ${styles.prev}`} aria-label="Foto anterior" onClick={() => go(-1)}>
          <ChevronLeftIcon size={28} />
        </button>
      )}

      <img src={images[index]} alt={alt} className={round ? `${styles.image} ${styles.round}` : styles.image} />

      {many && (
        <>
          <button type="button" className={`${styles.arrow} ${styles.next}`} aria-label="Próxima foto" onClick={() => go(1)}>
            <ChevronRightIcon size={28} />
          </button>
          <p className={styles.counter}>
            {index + 1} / {images.length}
          </p>
        </>
      )}
    </div>,
    document.body,
  );
}
