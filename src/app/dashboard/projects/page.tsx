"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { ScenarioCompare } from "@/components/ScenarioCompare";
import { exportToExcel } from "@/lib/export/excel";
import type { ScenarioData } from "@/lib/export/excel";
import { toast } from "react-hot-toast";
import styles from '../dashboard.module.css';

type Scenario = ScenarioData & { id: string };

interface Project {
    id: string;
    name: string;
    description?: string;
    _count?: { scenarios: number };
    scenarios?: Scenario[];
}

export default function ProjectsPage() {
    const { status } = useSession();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const fetchProjects = () => {
        setLoading(true);
        fetch('/api/projects')
            .then(r => r.json())
            .then(data => { setProjects(data.projects || []); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- oturum açıkken veri çekme; setState fetchProjects içinde gerçekleşiyor
        if (status === 'authenticated') fetchProjects();
    }, [status]);

    const handleExcel = (project: Project) => {
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
                    <div className={styles.emptyStateHint}>
                        Hesap makinesindeki &quot;Rapor Kaydet&quot; butonu ile ilk projenizi oluşturun.
                    </div>
                </div>
            ) : (
                <div className={styles.projectsList}>
                    {projects.map(project => (
                        <div key={project.id} className={styles.listingCard}>
                            <div className={styles.listingHeader}>
                                <h4>{project.name}</h4>
                                <div className={styles.projectBadges}>
                                    <span className={`${styles.statusBadge} ${styles.statusActive}`}>
                                        {project._count?.scenarios || 0} senaryo
                                    </span>
                                </div>
                            </div>

                            {project.description && (
                                <p className={styles.projectDescription}>
                                    {project.description}
                                </p>
                            )}

                            {(project.scenarios?.length ?? 0) > 0 && (
                                <div className={styles.scenariosBlock}>
                                    <h5 className={styles.scenariosTitle}>
                                        Senaryolar
                                    </h5>
                                    <div className={styles.scenariosGrid}>
                                        {(project.scenarios ?? []).map((s: Scenario) => (
                                            <div key={s.id} className={`${styles.reportCard} ${styles.scenarioMiniCard}`}>
                                                <h4>{s.name}</h4>
                                                <div className={styles.scenarioMiniValue}>
                                                    ₺{s.fdTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                                                </div>
                                                <div className={styles.scenarioMiniMeta}>
                                                    {s.fdPerM2.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m² | %{(s.landShareRatio * 100).toFixed(0)} arsa payı
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className={styles.projectActions}>
                                {(project.scenarios?.length ?? 0) >= 2 && (
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

                            {selectedProject?.id === project.id && (
                                <div className={styles.compareWrap}>
                                    <ScenarioCompare
                                        scenarios={project.scenarios ?? []}
                                        onShareRequest={async (ids) => {
                                            const res = await fetch('/api/compare/share', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ scenarioIds: ids }),
                                            });
                                            if (!res.ok) return null;
                                            const { token } = await res.json();
                                            return `${window.location.origin}/compare/${token}`;
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
