'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { HomeMobile } from './mobile/HomeMobile';
import { Hero } from '@/components/home/Hero';
import {
  AkifSection,
  LandTypesSection,
  PriceMapTeaser,
  ProductsSection,
  StepsSection,
} from '@/components/home/HomeSections';

function MarketingHomePage() {
  return (
    <>
      <Hero />
      <LandTypesSection />
      <ProductsSection />
      <PriceMapTeaser />
      <AkifSection />
      <StepsSection />
    </>
  );
}

export default function HomePage() {
  const { status } = useSession();
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean | null>(null);

  useEffect(() => {
    const mql = window.matchMedia('not all and (max-width: 768px)');
    const update = () => setIsDesktopViewport(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  // SSR ve ilk client render'de MarketingHomePage VARSAYILAN olarak gosterilir
  // -- /hesapla'nin "hicbir sey belli olana kadar iskelet goster" deseni
  // BILEREK KULLANILMIYOR: `/` SEO'ya kritik bir sayfa ve pazarlama sayfasi
  // zaten GUVENLI bir varsayilan (mevcut/eski davranisin ta kendisi).
  // Yalnizca viewport VE oturum ikisi de gercekten "giris yapmis + mobil"
  // oldugunu DOGRULADIGINDA HomeMobile'a GECILIR -- bu kisa bir client-side
  // flash olabilir ama yalnizca bu ekranin hedefledigi yeni kullanici
  // grubunu etkiler; SSR/ilk paint HER ZAMAN pazarlama sayfasidir, hic
  // regresyon yok.
  if (isDesktopViewport === false && status === 'authenticated') {
    return <HomeMobile />;
  }

  return <MarketingHomePage />;
}
