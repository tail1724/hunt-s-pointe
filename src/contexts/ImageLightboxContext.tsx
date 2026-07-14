import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { ImageLightbox } from "@/components/ui/image-lightbox";

interface LightboxState {
  url: string;
  alt?: string;
}

interface ImageLightboxContextValue {
  openLightbox: (url: string, alt?: string) => void;
}

const ImageLightboxContext = createContext<ImageLightboxContextValue | null>(null);

export function useImageLightbox() {
  const ctx = useContext(ImageLightboxContext);
  if (!ctx) throw new Error("useImageLightbox must be used within ImageLightboxProvider");
  return ctx;
}

export function ImageLightboxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LightboxState | null>(null);

  const openLightbox = useCallback((url: string, alt?: string) => {
    setState({ url, alt });
  }, []);

  return (
    <ImageLightboxContext.Provider value={{ openLightbox }}>
      {children}
      <ImageLightbox
        open={!!state}
        onOpenChange={(open) => !open && setState(null)}
        imageUrl={state?.url || ""}
        alt={state?.alt}
      />
    </ImageLightboxContext.Provider>
  );
}
