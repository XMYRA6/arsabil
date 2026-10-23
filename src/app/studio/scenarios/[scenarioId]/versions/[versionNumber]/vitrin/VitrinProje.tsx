'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { resolveScene } from '@/lib/dioramas/scene';
import { useThemeZaman } from '@/components/home/useThemeZaman';
import { ProposalVisualCapture } from '@/components/studio/ProposalVisualCapture';
import { ShareProposalDialog } from '@/components/studio/ShareProposalDialog';
import type { StudioProposalViewModel } from '@/lib/studio/proposalViewModel';
import type { StudioSnapshotDraft } from '@/lib/studio/types';
import styles from './page.module.css';

const sayi = (n: number, d = 0) => n.toLocaleString('tr-TR', { maximumFractionDigits: d });

/**
 * Proje vitrini — Figma 11 (Vitrin). Kaydedilmiş senaryo versiyonunun
 * herkese gösterilebilir özeti: diorama, öne çıkan sayılar, program karması
 * ve 2B yerleşim.
 */
export function VitrinProje({ viewModel, snapshot }: { viewModel: StudioProposalViewModel; snapshot: StudioSnapshotDraft }) {
  const [paylasAcik, setPaylasAcik] = useState(false);
  const zaman = useThemeZaman();
  const sahne = resolveScene({ tur: 'kat', varyant: 'bitmis', egim: 'duz', zaman });
  const { projectContext, massingAnd2D, programSummary, landownerOfferSummary, financialAssumptions } = viewModel;

  const toplamDaire = programSummary.residentialUnitCount + programSummary.commercialUnitCount;
  const toplamAdet = programSummary.items.reduce((t, i) => t + i.unitCount, 0);
  const payYuzde = toplamDaire > 0 ? Math.round((landownerOfferSummary.entitledUnitCount / toplamDaire) * 100) : null;
  const kimlik = projectContext.parcelIdentity;
  const konum = kimlik ? `${kimlik.ilce} / ${kimlik.mahalle}` : null;

  const stats: { etiket: string; deger: string; alt: string }[] = [
    { etiket: 'Arsa alanı', deger: sayi(projectContext.parcelAreaM2), alt: 'm²' },
    { etiket: 'Toplam daire', deger: sayi(toplamDaire), alt: `${massingAnd2D.floorCount} kat` },
    {
      etiket: 'Arsa sahibine',
      deger: `${sayi(landownerOfferSummary.entitledUnitCount, 1)} daire`,
      alt: payYuzde != null ? `%${payYuzde} pay` : '',
    },
  ];
  if (financialAssumptions.unitValueTl != null) {
    stats.push({ etiket: 'Daire değeri', deger: `${sayi(financialAssumptions.unitValueTl / 1_000_000, 2)} M`, alt: '₺' });
  }

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.topBar}>
          <Link href="/dashboard/projects" className={styles.backLink}>← Projelerim</Link>
          <div className={styles.topRight}>
            <button type="button" className={styles.shareBtn} onClick={() => setPaylasAcik(true)}>Paylaş</button>
            <span className={styles.badge}>Proje vitrini</span>
          </div>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>PROJE VİTRİNİ</p>
            <h1 className={styles.title}>{projectContext.scenarioName}</h1>
            <p className={styles.lead}>
              {konum ? `${konum} · ` : ''}
              {sayi(toplamDaire)} daire, {massingAnd2D.floorCount} kat
              {payYuzde != null ? `. Arsa sahibine %${payYuzde} pay.` : '.'} Senaryo ve maliyet hesapları ArsaBil ile hazırlandı.
            </p>
            <div className={styles.actions}>
              <Link href="/hesapla" className={styles.primary}>Teklif ver <span aria-hidden="true">→</span></Link>
              <Link href="/dashboard/projects" className={styles.soft}>Senaryoları gör</Link>
            </div>
          </div>
          <div className={styles.visual}>
            {/* eslint-disable-next-line @next/next/no-img-element -- yerel statik WebP */}
            <img src={sahne.src800} alt="" className={styles.dioramaImg} />
          </div>
        </section>

        <section className={styles.stats} aria-label="Proje özeti">
          {stats.map((s) => (
            <div key={s.etiket} className={styles.stat}>
              <span className={styles.statLabel}>{s.etiket}</span>
              <span className={styles.statValue}>{s.deger}</span>
              {s.alt && <span className={styles.statSub}>{s.alt}</span>}
            </div>
          ))}
        </section>

        <section className={styles.cards}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Program karması</h2>
            <div className={styles.mix}>
              {programSummary.items.map((item) => {
                const pct = toplamAdet > 0 ? Math.round((item.unitCount / toplamAdet) * 100) : 0;
                return (
                  <div key={item.id} className={styles.mixRow}>
                    <div className={styles.mixHead}>
                      <strong>{item.useLabel}</strong>
                      <span>{item.unitCount} daire · %{pct}</span>
                    </div>
                    <div className={styles.track}><div className={styles.fill} style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>2B yerleşim</h2>
            <ProposalVisualCapture
              parcelPolygon={snapshot.massingInput.parcelPolygon ?? null}
              footprintPolygon={snapshot.buildingMass?.footprint ?? null}
              layoutDraft={snapshot.layoutDraft ?? null}
              parcelSourceStatus={projectContext.parcelSourceStatus}
            />
          </div>
        </section>

        <p className={styles.footnote}>ArsaBil ile hazırlandı · Bilgilendirme amaçlıdır.</p>
        <ShareProposalDialog
          isOpen={paylasAcik}
          onClose={() => setPaylasAcik(false)}
          scenarioId={projectContext.scenarioId}
          versionNumber={projectContext.versionNumber}
          scenarioName={projectContext.scenarioName}
          viewModel={viewModel}
        />
      </div>
    </main>
  );
}
