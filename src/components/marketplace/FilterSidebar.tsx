"use client";

interface Filters {
    type: string[];
    minSize: number;
    maxSize: number;
    imar: string[];
    minEmsal: number;
    maxEmsal: number;
    fizibiliteOnly: boolean;
    minScore: number;
}

interface Props {
    filters: Filters;
    onChange: (f: Filters) => void;
    totalCount: number;
}

const TYPES = [
    { id: 'SALE', label: 'Satış' },
    { id: 'KAT_KARSILIGI', label: 'Kat Karşılığı / Ortaklık' },
];

const IMAR_OPTS = ['Konut', 'Ticaret', 'Konut + Ticaret', 'Diğer'];
const IMAR_VALS = ['KONUT', 'TICARET', 'KONUT_TICARET', 'DIGER'];

export function FilterSidebar({ filters, onChange, totalCount }: Props) {
    const set = (partial: Partial<Filters>) => onChange({ ...filters, ...partial });

    const toggleType = (id: string) => {
        const has = filters.type.includes(id);
        set({ type: has ? filters.type.filter(t => t !== id) : [...filters.type, id] });
    };

    const toggleImar = (val: string) => {
        const has = filters.imar.includes(val);
        set({ imar: has ? filters.imar.filter(v => v !== val) : [...filters.imar, val] });
    };

    const resetAll = () => onChange({
        type: ['KAT_KARSILIGI'],
        minSize: 200, maxSize: 10000,
        imar: [], minEmsal: 0.8, maxEmsal: 3.0,
        fizibiliteOnly: false, minScore: 10,
    });

    const labelStyle = { fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.07em', marginBottom: 8, display: 'block' };
    const sectionStyle = { marginBottom: 20 };
    const inputStyle = { width: '100%', padding: '6px 10px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontFamily: 'inherit', fontSize: '0.8rem' };

    return (
        <aside style={{
            width: 240, flexShrink: 0,
            background: 'var(--panel)', borderRight: '1px solid var(--border)',
            overflowY: 'auto', padding: '16px 14px',
            display: 'flex', flexDirection: 'column',
        }}>
            {/* Header */}
            <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--card-title)', marginBottom: 2 }}>Arsa İlanları</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{totalCount.toLocaleString('tr-TR')} ilan bulundu</div>
            </div>

            {/* Satış Türü */}
            <div style={sectionStyle}>
                <span style={labelStyle}>SATIŞ TÜRÜ</span>
                {TYPES.map(t => (
                    <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text)', fontWeight: 500 }}>
                        <div
                            onClick={() => toggleType(t.id)}
                            style={{
                                width: 18, height: 18, borderRadius: 5, border: '2px solid',
                                borderColor: filters.type.includes(t.id) ? 'var(--primary)' : 'var(--border)',
                                background: filters.type.includes(t.id) ? 'var(--primary)' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
                            }}
                        >
                            {filters.type.includes(t.id) && <span style={{ color: 'white', fontSize: '0.6rem', fontWeight: 900 }}>✓</span>}
                        </div>
                        {t.label}
                    </label>
                ))}
            </div>

            {/* Arsa Boyutu */}
            <div style={sectionStyle}>
                <span style={labelStyle}>ARSA BOYUTU (m²)</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="number" value={filters.minSize} onChange={e => set({ minSize: +e.target.value })} style={{ ...inputStyle, width: 70 }} />
                    <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>–</span>
                    <input type="number" value={filters.maxSize} onChange={e => set({ maxSize: +e.target.value })} style={{ ...inputStyle, width: 70 }} />
                </div>
            </div>

            {/* İmar Durumu */}
            <div style={sectionStyle}>
                <span style={labelStyle}>İMAR DURUMU</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {IMAR_OPTS.map((label, i) => {
                        const val = IMAR_VALS[i];
                        const active = filters.imar.includes(val);
                        return (
                            <button
                                key={val}
                                onClick={() => toggleImar(val)}
                                style={{
                                    padding: '4px 10px', borderRadius: 8,
                                    border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                                    background: active ? 'rgba(var(--primary-rgb),.10)' : 'transparent',
                                    color: active ? 'var(--primary)' : 'var(--muted)',
                                    fontSize: '0.72rem', fontWeight: active ? 700 : 500,
                                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                                }}
                            >{label}</button>
                        );
                    })}
                </div>
            </div>

            {/* Emsal */}
            <div style={sectionStyle}>
                <span style={labelStyle}>EMSAL</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="number" step={0.1} value={filters.minEmsal} onChange={e => set({ minEmsal: +e.target.value })} style={{ ...inputStyle, width: 70 }} />
                    <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>–</span>
                    <input type="number" step={0.1} value={filters.maxEmsal} onChange={e => set({ maxEmsal: +e.target.value })} style={{ ...inputStyle, width: 70 }} />
                </div>
            </div>

            {/* Fizibilite */}
            <div style={sectionStyle}>
                <span style={labelStyle}>FİZİBİLİTE</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
                    {/* Toggle switch */}
                    <div
                        onClick={() => set({ fizibiliteOnly: !filters.fizibiliteOnly })}
                        style={{
                            width: 40, height: 22, borderRadius: 11,
                            background: filters.fizibiliteOnly ? 'var(--primary)' : 'var(--border)',
                            position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
                        }}
                    >
                        <div style={{
                            position: 'absolute', top: 3, left: filters.fizibiliteOnly ? 21 : 3,
                            width: 16, height: 16, borderRadius: '50%', background: 'white',
                            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)',
                        }} />
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text)', fontWeight: 500 }}>Fizibilite Skoru Olanlar</span>
                </label>
                {filters.fizibiliteOnly && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Min Skor</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>{filters.minScore}+</span>
                        </div>
                        <input type="range" min={10} max={90} value={filters.minScore} onChange={e => set({ minScore: +e.target.value })}
                            style={{ width: '100%', accentColor: 'var(--primary)' }} />
                    </div>
                )}
            </div>

            {/* Buttons */}
            <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button style={{
                    padding: '10px', borderRadius: 10, background: 'var(--primary)', color: 'white',
                    border: 'none', cursor: 'pointer', fontWeight: 800, fontFamily: 'inherit', fontSize: '0.85rem',
                }}>Filtreleri Uygula</button>
                <button onClick={resetAll} style={{
                    padding: '8px', borderRadius: 10, background: 'transparent', color: 'var(--muted)',
                    border: '1.5px solid var(--border)', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', fontSize: '0.8rem',
                }}>Tümünü Sıfırla</button>
            </div>
        </aside>
    );
}
