"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { ScenarioCompare } from "@/components/ScenarioCompare";
import { exportToExcel } from "@/lib/export/excel";
import { toast } from "react-hot-toast";
import styles from '../dashboard.module.css';

export default function ProjectsPage() {
    const { status } = useSession();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState<any | null>(null);

    const fetchProjects = () => {
        setLoading(true);
        fetch('/api/projects')
            .then(r => r.json())
            .then(data => { setProjects(data.projects || []); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        if (status === 'authenticated') fetchProjects();
    }, [status]);

    const handleExcel = (project: any) => {
        if (!project.scenarios?.length) {
            toast.error('Bu projede henüz senaryo yok.');
            return;
        }
        exportToExcel(project.scenarios, project.name);
        toast.success('Excel dosyası indirildi.');
    };

    if (loading) return <div className={styles.loading}>Yükleniyor...</div>;

    return (
        <>
            <div className={styles.pageHeader}>
                <h1>Projelerim</h1>
                <p>Kayıtlı projeleriniz, senaryolarınız ve Excel çıktılarınız</p>
            </div>

            {projects.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📁</div>
                    <div>Henüz projeniz yok.</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                        Hesap makinesindeki &quot;Rapor Kaydet&quot; butonu ile ilk projenizi oluşturun.
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {projects.map(project => (
                        <div key={project.id} className={styles.listingCard}>
                            <div className={styles.listingHeader}>
                                <h4>{project.name}</h4>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span className={`${styles.statusBadge} ${styles.statusActive}`}>
                                        {project._count?.scenarios || 0} senaryo
                                    </span>
                                </div>
                            </div>

                            {project.description && (
                                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                    {project.description}
                                </p>
                            )}

                            {/* Senaryolar Listesi */}
                            {project.scenarios?.length > 0 && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <h5 style={{ color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                                        Senaryolar
                                    </h5>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                                        {project.scenarios.map((s: any) => (
                                            <div key={s.id} className={styles.reportCard} style={{ padding: '0.85rem' }}>
                                                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>{s.name}</h4>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary)' }}>
                                                    ₺{s.fdTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                                                    {s.fdPerM2.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m² | %{(s.landShareRatio * 100).toFixed(0)} arsa payı
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {project.scenarios?.length >= 2 && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setSelectedProject(selectedProject?.id === project.id ? null : project)}
                                    >
                                        📊 {selectedProject?.id === project.id ? 'Gizle' : 'Karşılaştır'}
                                    </Button>
                                )}
                                <Button variant="outline" onClick={() => handleExcel(project)}>
                                    📥 Excel İndir
                                </Button>
                            </div>

                            {/* Comparison Table */}
                            {selectedProject?.id === project.id && (
                                <div style={{ marginTop: '1.5rem' }}>
                                    <ScenarioCompare scenarios={project.scenarios} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
