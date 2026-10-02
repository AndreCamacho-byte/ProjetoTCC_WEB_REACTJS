import { useEffect } from "react";

const SITE_NAME = "Clutch";

// Define o texto da aba do navegador: "Entrar | Clutch". Sem título, fica só "Clutch".
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  }, [title]);
}
