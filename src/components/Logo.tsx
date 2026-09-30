import styles from "./Logo.module.css";

type LogoProps = {
  size?: "md" | "lg";
  inverted?: boolean;
};

export function Logo({ size = "lg", inverted = false }: LogoProps) {
  const className = [styles.logo, styles[size], inverted && styles.inverted].filter(Boolean).join(" ");
  return (
    <span className={className} aria-label="Clutch">
      clutch<span className={styles.dot}>.</span>
    </span>
  );
}

export function Tagline({ inverted = false }: { inverted?: boolean }) {
  return (
    <p className={[styles.tagline, inverted && styles.inverted].filter(Boolean).join(" ")}>
      Skate <span aria-hidden>•</span> Est. 2026 <span aria-hidden>•</span> Ride with control
    </p>
  );
}
