"use client";

type View = 'split' | 'map' | 'list';

interface Props {
    view: View;
    onChange: (v: View) => void;
}

export function ViewToggle({ view, onChange }: Props) {
    const opts: { id: View; icon: string; label: string }[] = [
        { id: 'map', icon: '🗺', label: 'Harita' },
        { id: 'list', icon: '☰', label: 'Liste' },
        { id: 'split', icon: '❏', label: 'Split' },
    ];

    return (
        <div style={{
            display: 'flex', gap: 2,
            background: 'var(--bg)', border: '1.5px solid var(--border)',
            borderRadius: 10, padding: 3,
        }}>
            {opts.map(o => (
                <button
                    key={o.id}
                    onClick={() => onChange(o.id)}
                    title={o.label}
                    style={{
                        padding: '5px 10px', borderRadius: 7,
                        background: view === o.id ? 'var(--primary)' : 'transparent',
                        color: view === o.id ? 'white' : 'var(--muted)',
                        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        fontSize: '0.75rem', fontWeight: view === o.id ? 700 : 500,
                        transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: 4,
                    }}
                >
                    <span>{o.icon}</span>
                    <span style={{ display: 'none' }}>{o.label}</span>
                </button>
            ))}
        </div>
    );
}
