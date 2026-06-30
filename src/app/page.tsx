"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

/* ── Animated counter hook ── */
function useCounter(end: number, duration = 1600, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(eased * end));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, end, duration]);
  return val;
}

/* ── Mouse spotlight on each card ── */
function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
  e.currentTarget.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
}

/* ── Stats section ── */
function StatsStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const c1 = useCounter(12400, 1600, visible);
  const c2 = useCounter(3,     800,  visible);
  const c3 = useCounter(97,    1200, visible);
  const c4 = useCounter(500,   1400, visible);

  return (
    <div className={styles.statsStrip} ref={ref}>
      <div className={`${styles.statItem} ${visible ? styles.statVisible : ''}`} style={{ transitionDelay: '0ms' }}>
        <span className={styles.statVal}>{c1.toLocaleString('tr-TR')}+</span>
        <span className={styles.statLabel}>Tamamlanan Analiz</span>
      </div>
      <div className={`${styles.statItem} ${visible ? styles.statVisible : ''}`} style={{ transitionDelay: '80ms' }}>
        <span className={styles.statVal}>~{c2}sn</span>
        <span className={styles.statLabel}>Ortalama Hesaplama</span>
      </div>
      <div className={`${styles.statItem} ${visible ? styles.statVisible : ''}`} style={{ transitionDelay: '160ms' }}>
        <span className={styles.statVal}>%{c3}</span>
        <span className={styles.statLabel}>Model Doğruluğu</span>
      </div>
      <div className={`${styles.statItem} ${visible ? styles.statVisible : ''}`} style={{ transitionDelay: '240ms' }}>
        <span className={styles.statVal}>{c4}+</span>
        <span className={styles.statLabel}>Kayıtlı Müteahhit</span>
      </div>
    </div>
  );
}

/* ── Feature card data ── */
const FEATURES = [
  {
    num: '01',
    tag: 'Engine v2',
    big: 'v2',
    accent: 'blue',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
      </svg>
    ),
    title: 'Engine v2 Teknolojisi',
    desc: 'Gelişmiş algoritmalar ile piyasa dinamiklerini analiz eder, en doğru inşaat maliyeti ve arsa payı oranlarını anında sunar.',
    badge: '12K+ hesaplama tamamlandı',
    span: 2,
  },
  {
    num: '02',
    tag: '360°',
    big: '360°',
    accent: 'green',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>
      </svg>
    ),
    title: 'Detaylı Maliyet Analizi',
    desc: 'İksa masrafları, lüks seviyesi, risk payı ve müteahhit kârını dahil ederek 360 derece finansal modelleme yapar.',
    span: 1,
  },
  {
    num: '03',
    tag: 'Pazar Yeri',
    big: '∞',
    accent: 'purple',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      </svg>
    ),
    title: 'Akıllı Pazar Yeri',
    desc: 'Hesaplanan fizibilite raporlarıyla birlikte arsanızı doğrudan doğrulanmış müteahhitlerin teklifine açabilirsiniz.',
    span: 1,
  },
  {
    num: '04',
    tag: '~3sn',
    big: '🔒',
    accent: 'teal',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
    title: 'Güvenli & Hızlı',
    desc: 'Tüm verileriniz uçtan uca şifrelenir. Günler süren fizibilite süreçleri saniyelere iner, anında PDF rapor alabilirsiniz.',
    badge: 'Saniyeler içinde sonuç',
    span: 2,
  },
] as const;

/* ── Features bento grid ── */
function FeaturesGrid() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    const cards = grid.querySelectorAll<HTMLElement>(`.${styles.bentoCard}`);
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          cards.forEach((c, i) => setTimeout(() => c.classList.add(styles.bentoVisible), i * 100));
          obs.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(grid);
    return () => obs.disconnect();
  }, []);

  return (
    <div className={styles.bentoGrid} ref={ref}>
      {FEATURES.map((f) => (
        <div
          key={f.num}
          className={`${styles.bentoCard} ${styles[`accent${f.accent.charAt(0).toUpperCase() + f.accent.slice(1)}`]}`}
          data-span={f.span}
          onMouseMove={onMouseMove}
        >
          {/* Mouse spotlight */}
          <div className={styles.spotlight} />

          {/* Dekoratif büyük metin */}
          <span className={styles.bigDeco}>{f.big}</span>

          {/* Üst satır */}
          <div className={styles.bentoTop}>
            <span className={styles.bentoTag}>{f.tag}</span>
            <span className={styles.bentoNum}>{f.num}</span>
          </div>

          {/* İkon */}
          <div className={styles.bentoIcon}>{f.icon}</div>

          {/* İçerik */}
          <h3 className={styles.bentoTitle}>{f.title}</h3>
          <p className={styles.bentoDesc}>{f.desc}</p>

          {/* Badge (varsa) */}
          {'badge' in f && (
            <div className={styles.bentoBadge}>{f.badge}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function HomePage() {
  return (
    <div className={styles.container}>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>✨ Türkiye'nin İlk Arsa Fizibilite Motoru</div>
          <h1 className={styles.heroTitle}>
            Arsanızın Gerçek Değerini <br />
            <span>Tahmin Etmeyin, Hesaplayın.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Kat karşılığı inşaat projelerinizde arsa payı, maliyet ve kâr analizini <br />
            <strong>Engine v2</strong> teknolojisi ile saniyeler içinde, bilimsel verilerle yapın.
          </p>
          <div className={styles.heroCta}>
            <Link href="/hesapla" className={styles.primaryBtn}>
              Hemen Hesapla
            </Link>
            <Link href="/marketplace" className={styles.secondaryBtn}>
              Pazar Yerine Git
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <StatsStrip />

      {/* Features Section */}
      <section>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>Neden ArsaBil?</p>
          <h2 className={styles.sectionTitle}>Tek platformda tüm analiz</h2>
          <p className={styles.sectionSub}>Arsa değerlemesinden pazar yerине, finansal modellemeden güvenli paylaşıma kadar.</p>
        </div>
        <FeaturesGrid />
      </section>

      {/* Vision & Mission Section */}
      <section>
        <h2 className={styles.sectionTitle}>Amacımız</h2>
        <div className={styles.visionMission}>
          <div className={styles.visionCard}>
            <div className={styles.visionIcon}>🌌</div>
            <h3 className={styles.visionTitle}>Vizyonumuz</h3>
            <p className={styles.visionText}>
              Türkiye'nin her parselinde, inşaat potansiyelini bir tıkla şeffaflaştıran, dijital gayrimenkul geliştirme standartlarını belirleyen bir ekosistem olmak.
            </p>
          </div>
          <div className={styles.visionCard}>
            <div className={styles.visionIcon}>🎯</div>
            <h3 className={styles.visionTitle}>Misyonumuz</h3>
            <p className={styles.visionText}>
              Arsa sahipleri ve müteahhitler arasındaki güven bariyerini, veriye dayalı anlık analizlerle yıkarak; adil ve hızlı inşaat süreçlerine öncülük etmek.
            </p>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section>
        <h2 className={styles.sectionTitle}>Sektörden Haberler</h2>
        <div className={styles.blogGrid}>
          <div className={styles.blogCard}>
            <div className={styles.blogImage}>📈</div>
            <div className={styles.blogContent}>
              <div className={styles.blogDate}>23 Nisan 2026</div>
              <h3 className={styles.blogTitle}>2026'da Kat Karşılığı İnşaat Trendleri</h3>
              <p className={styles.blogDesc}>Yeni inşaat maliyet endeksleri ve değişen arsa payı oranları ışığında, bu yıl müteahhitler ve arsa sahipleri nelere dikkat etmeli?</p>
              <Link href="#" className={styles.blogReadMore}>
                Devamını Oku
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
          <div className={styles.blogCard}>
            <div className={styles.blogImage}>💡</div>
            <div className={styles.blogContent}>
              <div className={styles.blogDate}>18 Nisan 2026</div>
              <h3 className={styles.blogTitle}>Arsa Değerleme Yöntemleri: Geleneksel vs. Dijital</h3>
              <p className={styles.blogDesc}>Ekspertiz raporları ve kulaktan dolma bilgiler yerine, Engine v2 gibi algoritmik değerleme sistemleri neden daha güvenilir sonuçlar veriyor?</p>
              <Link href="#" className={styles.blogReadMore}>
                Devamını Oku
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
          <div className={styles.blogCard}>
            <div className={styles.blogImage}>🤝</div>
            <div className={styles.blogContent}>
              <div className={styles.blogDate}>10 Nisan 2026</div>
              <h3 className={styles.blogTitle}>Müteahhit-Arsa Sahibi İlişkisinde Şeffaflığın Önemi</h3>
              <p className={styles.blogDesc}>İnşaat sözleşmelerinde yaşanan iptallerin %80'i maliyet şeffaflığı eksikliğinden kaynaklanıyor. Verilerle güven nasıl inşa edilir?</p>
              <Link href="#" className={styles.blogReadMore}>
                Devamını Oku
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>Arsanızın değerini öğrenmeye hazır mısınız?</h2>
        <p className={styles.ctaSubtitle}>Saniyeler içinde detaylı finansal fizibilite raporunuzu oluşturun, pdf olarak indirin veya tekliflere açın.</p>
        <Link href="/hesapla" className={styles.ctaBtn}>
          Ücretsiz Hesapla
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </Link>
      </section>

    </div>
  );
}
