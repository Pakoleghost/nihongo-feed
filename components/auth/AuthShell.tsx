import type { ReactNode } from "react";
import styles from "./AuthShell.module.css";

type AuthShellProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  notice?: string;
  children: ReactNode;
};

export default function AuthShell({
  eyebrow = "Pako Nihongo",
  title,
  subtitle,
  notice,
  children,
}: AuthShellProps) {
  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>ぱ</span>
          <span className={styles.brandText}>
            <strong>Pako Nihongo</strong>
            <span>Alumno</span>
          </span>
        </div>
        <div className={styles.content}>
          <header>
            <div className={styles.eyebrow}>{eyebrow}</div>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
          </header>
          {notice && <div className={styles.notice}>{notice}</div>}
          {children}
        </div>
      </section>
    </main>
  );
}

export { styles as authStyles };
