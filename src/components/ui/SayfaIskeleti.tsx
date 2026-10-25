import styles from './SayfaIskeleti.module.css';

export type IskeletVaryant = 'liste' | 'detay' | 'panel';

function Blok({ className, kind }: { className: string; kind?: string }) {
  return <div className={`${styles.blok} ${className}`} data-testid="iskelet-blok" data-kind={kind} />;
}

export function SayfaIskeleti({ varyant }: { varyant: IskeletVaryant }) {
  return (
    <div
      className={styles.kok}
      role="status"
      aria-busy="true"
      aria-label="Yükleniyor"
    >
      <span className={styles.srOnly}>Yükleniyor…</span>
      <Blok className={styles.baslik} />
      {varyant === 'liste' && (
        <div className={styles.izgara}>
          {Array.from({ length: 6 }, (_, i) => (
            <Blok key={i} kind="kart" className={styles.kart} />
          ))}
        </div>
      )}
      {varyant === 'detay' && (
        <>
          <Blok className={styles.gorsel} />
          <Blok className={styles.paragraf} />
          <Blok className={styles.paragraf} />
          <Blok className={`${styles.paragraf} ${styles.paragrafKisa}`} />
        </>
      )}
      {varyant === 'panel' && (
        <>
          <Blok className={styles.panelBlok} />
          <Blok className={styles.panelBlok} />
          <Blok className={styles.panelBlok} />
        </>
      )}
    </div>
  );
}
