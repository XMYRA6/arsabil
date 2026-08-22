import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getStudioScenarioVersionDetail } from '@/lib/studio/studioScenarioRepository';
import { StudioVitrinPreview } from '@/components/studio/StudioVitrinPreview';
import Link from 'next/link';

/**
 * Geliştirme ve doğrulama amaçlı Vitrin 3D sahne sayfası (Owner-only).
 * NOT: Bu route kesin ürün yerleşimi DEĞİLDİR; Task 1-5'i gerçek veritabanı
 * snapshot'ı ile test etmek ve doğrulamak için açılmış geçici bir kapıdır.
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

  if (!versionRecord) {
    notFound();
  }

  return (
    <main style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <Link
              href="/hesapla"
              style={{ color: '#38bdf8', fontSize: '13px', textDecoration: 'none', marginBottom: '6px', display: 'inline-block' }}
            >
              ← Hesaplama Aracına Dön
            </Link>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>
              🏢 Studio 3D Vitrin (Versiyon v{versionRecord.versionNumber})
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Senaryo ID: <code>{scenarioId}</code> • Şema: v{versionRecord.schemaVersion}
            </p>
          </div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '24px' }}>
          <StudioVitrinPreview snapshot={versionRecord.snapshot} />
        </div>
      </div>
    </main>
  );
}
