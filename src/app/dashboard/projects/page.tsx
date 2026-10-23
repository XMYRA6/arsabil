"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ScenarioCompare } from "@/components/ScenarioCompare";
import { exportToExcel } from "@/lib/export/excel";
import type { ScenarioData } from "@/lib/export/excel";
import { toast } from "react-hot-toast";
import styles from '../panelListe.module.css';

type Scenario = ScenarioData & { id: string };

interface Project {
    id: string;
    name: string;
    description?: string;
    akifMemory?: string | null;
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

    const handleClearMemory = async (project: Project) => {
        try {
            const res = await fetch(`/api/projects/${project.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'clear_memory' }),
            });
            if (!res.ok) {
                toast.error('Temizlenemedi, tekrar dene.');
                return;
            }
            setProjects((prev) =>
                prev.map((p) => (p.id === project.id ? { ...p, akifMemory: null } : p))
            );
            toast.success('Arsa Dosyası temizlendi.');
        } catch {
            toast.error('Bağlantı hatası, tekrar dene.');
        }
    };

    if (loading) return <div className={styles.state}>Yükleniyor...</div>;

    return (
        <main className={styles.shell}>
            <header className={styles.head}>
                <div>
                    <h1>Projelerim</h1>
                    <p>Kayıtlı projeleriniz, senaryolarınız ve Excel çıktılarınız</p>
                </div>
                <Link href="/hesapla" className={styles.btn}>+ Yeni proje</Link>
            </header>

            {projects.length === 0 ? (
                <section className={styles.empty}>
                    <h2>Henüz projeniz yok.</h2>
                    <p>Hesap makinesindeki &quot;Rapor Kaydet&quot; butonu ile ilk projenizi oluşturun.</p>
                </section>
            ) : (
                <div className={styles.stack}>
                    {projects.map(project => {
                        const senaryolar = project.scenarios ?? [];
                        const acik = selectedProject?.id === project.id;
                        return (
                            <article key={project.id} className={styles.card}>
                                <div className={styles.cardRow}>
                                    <div>
                                        <h2 className={styles.cardTitle}>{project.name}</h2>
                                        <p className={styles.cardMeta}>{project._count?.scenarios || 0} senaryo</p>
                                    </div>
                                    <div className={styles.actions}>
                                        {senaryolar.length >= 2 && (
                                            <button type="button" className={styles.btnSmSoft} onClick={() => setSelectedProject(acik ? null : project)}>
                                                {acik ? 'Gizle' : 'Karşılaştır'}
                                            </button>
                                        )}
                                        <button type="button" className={styles.btnSmSoft} onClick={() => handleExcel(project)}>Excel</button>
                                        <Link href="/hesapla" className={styles.btnSm}>Aç</Link>
                                    </div>
                                </div>

                                {project.description && <p className={styles.desc}>{project.description}</p>}

                                {project.akifMemory && (
                                    <div className={styles.memory}>
                                        <h3 className={styles.memoryTitle}>Akif&apos;in Hatırladıkları</h3>
                                        <p className={styles.memoryText}>{project.akifMemory}</p>
                                        <button type="button" className={styles.btnSmSoft} onClick={() => handleClearMemory(project)}>Temizle</button>
                                    </div>
                                )}

                                {senaryolar.length > 0 && (
                                    <div className={styles.tabloKap}>
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th>Senaryo</th>
                                                    <th className={styles.num}>Arsa payı</th>
                                                    <th className={styles.num}>TL/m²</th>
                                                    <th className={styles.num}>Toplam değer</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {senaryolar.map((sc: Scenario) => (
                                                    <tr key={sc.id}>
                                                        <td>{sc.name}</td>
                                                        <td className={styles.num}>%{(sc.landShareRatio * 100).toFixed(0)}</td>
                                                        <td className={styles.num}>{sc.fdPerM2.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</td>
                                                        <td className={styles.num}>₺{sc.fdTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {acik && (
                                    <div className={styles.compareWrap}>
                                        <ScenarioCompare
                                            scenarios={senaryolar}
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
                            </article>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
