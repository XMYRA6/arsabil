"use client";

import React from 'react';
import Link from 'next/link';
import styles from './page.module.css';

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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              Hemen Hesapla
            </Link>
            <Link href="/marketplace" className={styles.secondaryBtn}>
              Pazar Yerine Git
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section>
        <h2 className={styles.sectionTitle}>Neden ArsaBil?</h2>
        <div className={styles.featuresGrid}>
          
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
            </div>
            <h3 className={styles.featureTitle}>Engine v2 Teknolojisi</h3>
            <p className={styles.featureDesc}>Gelişmiş algoritmalar ile piyasa dinamiklerini analiz eder, en doğru inşaat maliyeti ve arsa payı oranlarını anında sunar.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>
            </div>
            <h3 className={styles.featureTitle}>Detaylı Maliyet Analizi</h3>
            <p className={styles.featureDesc}>İksa masrafları, lüks seviyesi, risk payı ve müteahhit kârını dahil ederek 360 derece finansal modelleme yapar.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
            </div>
            <h3 className={styles.featureTitle}>Akıllı Pazar Yeri</h3>
            <p className={styles.featureDesc}>Hesaplanan fizibilite raporlarıyla birlikte arsanızı doğrudan doğrulanmış müteahhitlerin teklifine açabilirsiniz.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <h3 className={styles.featureTitle}>Güvenli & Hızlı</h3>
            <p className={styles.featureDesc}>Tüm verileriniz uçtan uca şifrelenir. Günler süren fizibilite süreçleri saniyelere iner, anında PDF rapor alabilirsiniz.</p>
          </div>

        </div>
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

      {/* Blog / News Section */}
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
