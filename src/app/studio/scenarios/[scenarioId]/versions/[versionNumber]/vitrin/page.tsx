import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getStudioScenarioVersionDetail } from '@/lib/studio/studioScenarioRepository';
import { StudioVitrinPreview } from '@/components/studio/StudioVitrinPreview';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import styles from './page.module.css';

/**
 * Studio 3D Vitrin — kaydedilmiş bir senaryo versiyonunun kütlesini zengin
 * WebGL sahnesinde gösterir; PRO kullanıcılar için fotogerçekçi render
 * üretimini tetikler. Senaryo Kütüphanesindeki "3D Vitrin" bağlantısından
 * açılır. Yalnızca senaryo sahibine görünür.
 */
export default async function StudioVitrinPage({
  params,
}: {
  params: Promise<{ scenarioId: string; versionNumber: string }>;
}) {
  const { scenarioId, versionNumber } = await params;
  const versionNum = parseInt(versionNumber, 10);

  if (isNaN(versionNum) || versionNum <= 0) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const userId = session.user.id as string;
  const versionRecord = await getStudioScenarioVersionDetail(scenarioId, versionNum, userId);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });

  if (!versionRecord) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <Link href="/hesapla" className={styles.backLink}>
            ← Hesaplama Aracına Dön
          </Link>
          <h1 className={styles.title}>
            Studio 3D Vitrin — Versiyon v{versionRecord.versionNumber}
          </h1>
          <p className={styles.subtitle}>
            Kaydedilmiş senaryonuzun kütlesini 3D sahnede inceleyin. PRO planla,
            bu kütlenin arsanızdaki fotogerçekçi görselini üretebilirsiniz.
          </p>
        </header>

        <section className={styles.stage}>
          <StudioVitrinPreview
            snapshot={versionRecord.snapshot}
            scenarioId={scenarioId}
            versionNumber={versionNum}
            isPro={user?.plan === 'PRO'}
          />
        </section>
      </div>
    </main>
  );
}
