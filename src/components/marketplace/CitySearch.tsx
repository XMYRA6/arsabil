"use client";

import { useState, useRef, useEffect } from 'react';

/* ─── All 81 Turkish provinces with lat/lng ─── */
export const TURKEY_CITIES: { name: string; lat: number; lng: number; zoom: number }[] = [
    { name: 'Adana', lat: 37.0, lng: 35.3213, zoom: 11 },
    { name: 'Adıyaman', lat: 37.7648, lng: 38.2786, zoom: 11 },
    { name: 'Afyonkarahisar', lat: 38.7507, lng: 30.5567, zoom: 11 },
    { name: 'Ağrı', lat: 39.7191, lng: 43.0503, zoom: 11 },
    { name: 'Aksaray', lat: 38.3687, lng: 34.0370, zoom: 11 },
    { name: 'Amasya', lat: 40.6499, lng: 35.8353, zoom: 11 },
    { name: 'Ankara', lat: 39.9334, lng: 32.8597, zoom: 12 },
    { name: 'Antalya', lat: 36.8969, lng: 30.7133, zoom: 12 },
    { name: 'Ardahan', lat: 41.1105, lng: 42.7022, zoom: 11 },
    { name: 'Artvin', lat: 41.1828, lng: 41.8183, zoom: 11 },
    { name: 'Aydın', lat: 37.8560, lng: 27.8416, zoom: 11 },
    { name: 'Balıkesir', lat: 39.6484, lng: 27.8826, zoom: 11 },
    { name: 'Bartın', lat: 41.6344, lng: 32.3375, zoom: 11 },
    { name: 'Batman', lat: 37.8812, lng: 41.1351, zoom: 11 },
    { name: 'Bayburt', lat: 40.2552, lng: 40.2249, zoom: 11 },
    { name: 'Bilecik', lat: 40.0567, lng: 30.0165, zoom: 11 },
    { name: 'Bingöl', lat: 38.8854, lng: 40.4966, zoom: 11 },
    { name: 'Bitlis', lat: 38.4010, lng: 42.1095, zoom: 11 },
    { name: 'Bolu', lat: 40.7310, lng: 31.6061, zoom: 11 },
    { name: 'Burdur', lat: 37.7212, lng: 30.2877, zoom: 11 },
    { name: 'Bursa', lat: 40.1826, lng: 29.0665, zoom: 12 },
    { name: 'Çanakkale', lat: 40.1553, lng: 26.4142, zoom: 11 },
    { name: 'Çankırı', lat: 40.6013, lng: 33.6134, zoom: 11 },
    { name: 'Çorum', lat: 40.5506, lng: 34.9556, zoom: 11 },
    { name: 'Denizli', lat: 37.7765, lng: 29.0864, zoom: 11 },
    { name: 'Diyarbakır', lat: 37.9144, lng: 40.2306, zoom: 12 },
    { name: 'Düzce', lat: 40.8438, lng: 31.1565, zoom: 11 },
    { name: 'Edirne', lat: 41.6771, lng: 26.5557, zoom: 11 },
    { name: 'Elazığ', lat: 38.6810, lng: 39.2264, zoom: 11 },
    { name: 'Erzincan', lat: 39.7500, lng: 39.5000, zoom: 11 },
    { name: 'Erzurum', lat: 39.9000, lng: 41.2700, zoom: 12 },
    { name: 'Eskişehir', lat: 39.7767, lng: 30.5206, zoom: 12 },
    { name: 'Gaziantep', lat: 37.0662, lng: 37.3833, zoom: 12 },
    { name: 'Giresun', lat: 40.9128, lng: 38.3895, zoom: 11 },
    { name: 'Gümüşhane', lat: 40.4386, lng: 39.5086, zoom: 11 },
    { name: 'Hakkâri', lat: 37.5744, lng: 43.7408, zoom: 11 },
    { name: 'Hatay', lat: 36.4018, lng: 36.3498, zoom: 11 },
    { name: 'Iğdır', lat: 39.9167, lng: 44.0500, zoom: 11 },
    { name: 'Isparta', lat: 37.7648, lng: 30.5566, zoom: 11 },
    { name: 'İstanbul', lat: 41.015, lng: 28.979, zoom: 12 },
    { name: 'İzmir', lat: 38.4189, lng: 27.1287, zoom: 12 },
    { name: 'Kahramanmaraş', lat: 37.5858, lng: 36.9371, zoom: 11 },
    { name: 'Karabük', lat: 41.2061, lng: 32.6204, zoom: 11 },
    { name: 'Karaman', lat: 37.1815, lng: 33.2150, zoom: 11 },
    { name: 'Kars', lat: 40.6167, lng: 43.1000, zoom: 11 },
    { name: 'Kastamonu', lat: 41.3887, lng: 33.7827, zoom: 11 },
    { name: 'Kayseri', lat: 38.7312, lng: 35.4787, zoom: 12 },
    { name: 'Kırıkkale', lat: 39.8468, lng: 33.5153, zoom: 11 },
    { name: 'Kırklareli', lat: 41.7333, lng: 27.2167, zoom: 11 },
    { name: 'Kırşehir', lat: 39.1425, lng: 34.1709, zoom: 11 },
    { name: 'Kilis', lat: 36.7184, lng: 37.1212, zoom: 11 },
    { name: 'Kocaeli', lat: 40.8533, lng: 29.8815, zoom: 12 },
    { name: 'Konya', lat: 37.8746, lng: 32.4932, zoom: 12 },
    { name: 'Kütahya', lat: 39.4167, lng: 29.9833, zoom: 11 },
    { name: 'Malatya', lat: 38.3552, lng: 38.3095, zoom: 11 },
    { name: 'Manisa', lat: 38.6191, lng: 27.4289, zoom: 11 },
    { name: 'Mardin', lat: 37.3212, lng: 40.7245, zoom: 11 },
    { name: 'Mersin', lat: 36.8121, lng: 34.6415, zoom: 12 },
    { name: 'Muğla', lat: 37.2153, lng: 28.3636, zoom: 11 },
    { name: 'Muş', lat: 38.9462, lng: 41.7539, zoom: 11 },
    { name: 'Nevşehir', lat: 38.6939, lng: 34.6857, zoom: 11 },
    { name: 'Niğde', lat: 37.9667, lng: 34.6833, zoom: 11 },
    { name: 'Ordu', lat: 40.9839, lng: 37.8764, zoom: 11 },
    { name: 'Osmaniye', lat: 37.0746, lng: 36.2464, zoom: 11 },
    { name: 'Rize', lat: 41.0201, lng: 40.5234, zoom: 11 },
    { name: 'Sakarya', lat: 40.6940, lng: 30.4358, zoom: 11 },
    { name: 'Samsun', lat: 41.2867, lng: 36.33, zoom: 12 },
    { name: 'Siirt', lat: 37.9333, lng: 41.95, zoom: 11 },
    { name: 'Sinop', lat: 42.0231, lng: 35.1531, zoom: 11 },
    { name: 'Sivas', lat: 39.7477, lng: 37.0179, zoom: 11 },
    { name: 'Şanlıurfa', lat: 37.1591, lng: 38.7969, zoom: 12 },
    { name: 'Şırnak', lat: 37.4187, lng: 42.4918, zoom: 11 },
    { name: 'Tekirdağ', lat: 40.9833, lng: 27.5167, zoom: 11 },
    { name: 'Tokat', lat: 40.3167, lng: 36.55, zoom: 11 },
    { name: 'Trabzon', lat: 41.0027, lng: 39.7168, zoom: 12 },
    { name: 'Tunceli', lat: 39.1079, lng: 39.5401, zoom: 11 },
    { name: 'Uşak', lat: 38.6823, lng: 29.4082, zoom: 11 },
    { name: 'Van', lat: 38.4946, lng: 43.38, zoom: 11 },
    { name: 'Yalova', lat: 40.65, lng: 29.2667, zoom: 11 },
    { name: 'Yozgat', lat: 39.82, lng: 34.8147, zoom: 11 },
    { name: 'Zonguldak', lat: 41.4564, lng: 31.7987, zoom: 11 },
];

/* ─── Districts for major cities ─── */
type District = { name: string; lat: number; lng: number; zoom: number };
const DISTRICTS: Record<string, District[]> = {
    'İstanbul': [
        { name: 'Kadıköy', lat: 40.9927, lng: 29.0277, zoom: 14 },
        { name: 'Beşiktaş', lat: 41.0422, lng: 29.0089, zoom: 14 },
        { name: 'Üsküdar', lat: 41.0232, lng: 29.0160, zoom: 14 },
        { name: 'Şişli', lat: 41.0602, lng: 28.9877, zoom: 14 },
        { name: 'Beyoğlu', lat: 41.0370, lng: 28.9770, zoom: 14 },
        { name: 'Fatih', lat: 41.0186, lng: 28.9398, zoom: 14 },
        { name: 'Bakırköy', lat: 40.9819, lng: 28.8774, zoom: 14 },
        { name: 'Ataşehir', lat: 40.9923, lng: 29.1127, zoom: 14 },
        { name: 'Maltepe', lat: 40.9346, lng: 29.1310, zoom: 14 },
        { name: 'Kartal', lat: 40.9089, lng: 29.1876, zoom: 14 },
        { name: 'Pendik', lat: 40.8775, lng: 29.2323, zoom: 14 },
        { name: 'Tuzla', lat: 40.8470, lng: 29.3005, zoom: 14 },
        { name: 'Sarıyer', lat: 41.1667, lng: 29.0500, zoom: 14 },
        { name: 'Beylikdüzü', lat: 41.0019, lng: 28.6438, zoom: 14 },
        { name: 'Başakşehir', lat: 41.0940, lng: 28.8090, zoom: 14 },
        { name: 'Esenyurt', lat: 41.0334, lng: 28.6760, zoom: 14 },
        { name: 'Küçükçekmece', lat: 41.0035, lng: 28.7793, zoom: 14 },
        { name: 'Bağcılar', lat: 41.0371, lng: 28.8565, zoom: 14 },
        { name: 'Bahçelievler', lat: 41.0008, lng: 28.8618, zoom: 14 },
        { name: 'Güngören', lat: 41.0204, lng: 28.8848, zoom: 14 },
        { name: 'Esenler', lat: 41.0437, lng: 28.8754, zoom: 14 },
        { name: 'Bayrampaşa', lat: 41.0472, lng: 28.9119, zoom: 14 },
        { name: 'Eyüpsultan', lat: 41.0738, lng: 28.9342, zoom: 14 },
        { name: 'Kağıthane', lat: 41.0811, lng: 28.9714, zoom: 14 },
        { name: 'Gaziosmanpaşa', lat: 41.0713, lng: 28.9165, zoom: 14 },
        { name: 'Sultangazi', lat: 41.1066, lng: 28.8666, zoom: 14 },
        { name: 'Arnavutköy', lat: 41.1826, lng: 28.7392, zoom: 13 },
        { name: 'Çatalca', lat: 41.1434, lng: 28.4606, zoom: 13 },
        { name: 'Silivri', lat: 41.0736, lng: 28.2460, zoom: 13 },
        { name: 'Büyükçekmece', lat: 41.0202, lng: 28.5851, zoom: 14 },
        { name: 'Çekmeköy', lat: 41.0290, lng: 29.1740, zoom: 14 },
        { name: 'Sancaktepe', lat: 41.0030, lng: 29.2310, zoom: 14 },
        { name: 'Sultanbeyli', lat: 40.9670, lng: 29.2620, zoom: 14 },
        { name: 'Ümraniye', lat: 41.0167, lng: 29.0917, zoom: 14 },
        { name: 'Beykoz', lat: 41.1167, lng: 29.1000, zoom: 14 },
        { name: 'Şile', lat: 41.1753, lng: 29.6125, zoom: 13 },
        { name: 'Adalar', lat: 40.8747, lng: 29.0920, zoom: 14 },
        { name: 'Zeytinburnu', lat: 41.0045, lng: 28.9034, zoom: 14 },
        { name: 'Avcılar', lat: 41.0000, lng: 28.7167, zoom: 14 },
    ],
    'Ankara': [
        { name: 'Çankaya', lat: 39.8900, lng: 32.8543, zoom: 14 },
        { name: 'Keçiören', lat: 39.9667, lng: 32.8667, zoom: 14 },
        { name: 'Yenimahalle', lat: 39.9667, lng: 32.8000, zoom: 14 },
        { name: 'Mamak', lat: 39.9245, lng: 32.9175, zoom: 14 },
        { name: 'Etimesgut', lat: 39.9500, lng: 32.6833, zoom: 14 },
        { name: 'Sincan', lat: 39.9722, lng: 32.5833, zoom: 14 },
        { name: 'Altındağ', lat: 39.9500, lng: 32.8667, zoom: 14 },
        { name: 'Pursaklar', lat: 40.0333, lng: 32.9000, zoom: 14 },
        { name: 'Gölbaşı', lat: 39.7833, lng: 32.8000, zoom: 13 },
        { name: 'Polatlı', lat: 39.5846, lng: 32.1475, zoom: 13 },
    ],
    'İzmir': [
        { name: 'Konak', lat: 38.4189, lng: 27.1287, zoom: 14 },
        { name: 'Karşıyaka', lat: 38.4627, lng: 27.1123, zoom: 14 },
        { name: 'Bornova', lat: 38.4700, lng: 27.2200, zoom: 14 },
        { name: 'Buca', lat: 38.3920, lng: 27.1850, zoom: 14 },
        { name: 'Bayraklı', lat: 38.4557, lng: 27.1617, zoom: 14 },
        { name: 'Çiğli', lat: 38.4967, lng: 27.0600, zoom: 14 },
        { name: 'Gaziemir', lat: 38.3240, lng: 27.1330, zoom: 14 },
        { name: 'Karabağlar', lat: 38.3770, lng: 27.1230, zoom: 14 },
        { name: 'Narlıdere', lat: 38.4006, lng: 27.0361, zoom: 14 },
        { name: 'Balçova', lat: 38.3936, lng: 27.0569, zoom: 14 },
        { name: 'Çeşme', lat: 38.3238, lng: 26.3039, zoom: 13 },
        { name: 'Urla', lat: 38.3236, lng: 26.7592, zoom: 13 },
    ],
    'Bursa': [
        { name: 'Osmangazi', lat: 40.1926, lng: 29.0610, zoom: 14 },
        { name: 'Nilüfer', lat: 40.2120, lng: 28.9810, zoom: 14 },
        { name: 'Yıldırım', lat: 40.1876, lng: 29.0950, zoom: 14 },
        { name: 'Mudanya', lat: 40.3760, lng: 28.8830, zoom: 13 },
        { name: 'Gemlik', lat: 40.4346, lng: 29.1604, zoom: 13 },
        { name: 'İnegöl', lat: 40.0776, lng: 29.5133, zoom: 13 },
        { name: 'Gürsu', lat: 40.2330, lng: 29.1720, zoom: 14 },
        { name: 'Kestel', lat: 40.2020, lng: 29.2210, zoom: 14 },
    ],
    'Antalya': [
        { name: 'Muratpaşa', lat: 36.8841, lng: 30.7056, zoom: 14 },
        { name: 'Kepez', lat: 36.9420, lng: 30.6800, zoom: 14 },
        { name: 'Konyaaltı', lat: 36.8717, lng: 30.6370, zoom: 14 },
        { name: 'Aksu', lat: 36.9340, lng: 30.8360, zoom: 14 },
        { name: 'Döşemealtı', lat: 37.0200, lng: 30.5940, zoom: 13 },
        { name: 'Alanya', lat: 36.5447, lng: 31.9998, zoom: 13 },
        { name: 'Manavgat', lat: 36.7870, lng: 31.4430, zoom: 13 },
        { name: 'Serik', lat: 36.9180, lng: 31.1000, zoom: 13 },
        { name: 'Kaş', lat: 36.2010, lng: 29.6390, zoom: 13 },
        { name: 'Kemer', lat: 36.5971, lng: 30.5611, zoom: 13 },
    ],
};

interface Props {
    onCitySelect: (city: { name: string; lat: number; lng: number; zoom: number }) => void;
    selectedCity: string;
}

export function CitySearch({ onCitySelect, selectedCity }: Props) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [showDistricts, setShowDistricts] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const districts = DISTRICTS[selectedCity] || [];

    const filtered = query.length > 0
        ? TURKEY_CITIES.filter(c =>
            c.name.toLocaleLowerCase('tr-TR').startsWith(query.toLocaleLowerCase('tr-TR'))
        ).slice(0, 8)
        : TURKEY_CITIES.slice(0, 8);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
                setShowDistricts(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div ref={wrapperRef} style={{ position: 'relative', display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* City Input */}
            <div style={{ position: 'relative', flex: '0 0 180px' }}>
                <span style={{
                    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                    fontSize: '0.8rem', color: 'var(--muted)', pointerEvents: 'none',
                }}>📍</span>
                <input
                    placeholder="İl ara…"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true); setShowDistricts(false); }}
                    onFocus={() => setOpen(true)}
                    style={{
                        width: '100%', padding: '7px 10px 7px 30px',
                        background: 'var(--bg)', border: '1.5px solid var(--border)',
                        borderRadius: 8, color: 'var(--text)', fontFamily: 'inherit', fontSize: '0.8rem', outline: 'none',
                    }}
                />
                {selectedCity && !open && (
                    <span style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        fontSize: '0.62rem', background: 'var(--primary)', color: 'white',
                        padding: '2px 6px', borderRadius: 5, fontWeight: 700,
                    }}>{selectedCity}</span>
                )}

                {/* City Dropdown */}
                {open && (
                    <div style={{
                        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                        background: 'var(--panel)', border: '1.5px solid var(--border)',
                        borderRadius: 10, maxHeight: 260, overflowY: 'auto',
                        boxShadow: '0 12px 40px rgba(0,0,0,.25)', zIndex: 100,
                    }}>
                        {filtered.length === 0 ? (
                            <div style={{ padding: '12px 14px', fontSize: '0.78rem', color: 'var(--muted)' }}>
                                Sonuç bulunamadı
                            </div>
                        ) : (
                            filtered.map(city => (
                                <div
                                    key={city.name}
                                    onClick={() => {
                                        onCitySelect(city);
                                        setQuery('');
                                        setOpen(false);
                                        setShowDistricts(false);
                                    }}
                                    style={{
                                        padding: '8px 14px',
                                        fontSize: '0.8rem',
                                        color: city.name === selectedCity ? 'var(--primary)' : 'var(--text)',
                                        fontWeight: city.name === selectedCity ? 800 : 500,
                                        cursor: 'pointer',
                                        borderBottom: '1px solid var(--border)',
                                        transition: 'background 0.1s',
                                        display: 'flex', alignItems: 'center', gap: 8,
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(var(--primary-rgb),.08)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <span style={{ fontSize: '0.75rem' }}>📍</span>
                                    {city.name}
                                    {DISTRICTS[city.name] && (
                                        <span style={{
                                            marginLeft: 'auto', fontSize: '0.58rem', background: 'rgba(var(--primary-rgb),.1)',
                                            color: 'var(--primary)', padding: '1px 5px', borderRadius: 4, fontWeight: 700,
                                        }}>{DISTRICTS[city.name].length} ilçe</span>
                                    )}
                                    {city.name === selectedCity && (
                                        <span style={{ fontSize: '0.65rem', color: 'var(--primary)' }}>✓</span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* District Dropdown Button */}
            {districts.length > 0 && (
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowDistricts(p => !p)}
                        style={{
                            padding: '7px 12px', fontSize: '0.78rem',
                            background: showDistricts ? 'var(--primary)' : 'var(--bg)',
                            color: showDistricts ? 'white' : 'var(--text)',
                            border: '1.5px solid var(--border)',
                            borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                            fontWeight: 600, whiteSpace: 'nowrap',
                            transition: 'all 0.15s',
                        }}
                    >
                        🏘️ İlçe ▾
                    </button>

                    {showDistricts && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 4px)', left: 0,
                            background: 'var(--panel)', border: '1.5px solid var(--border)',
                            borderRadius: 10, maxHeight: 300, overflowY: 'auto',
                            boxShadow: '0 12px 40px rgba(0,0,0,.25)', zIndex: 100,
                            minWidth: 180,
                        }}>
                            {districts.map(d => (
                                <div
                                    key={d.name}
                                    onClick={() => {
                                        onCitySelect({ name: d.name, lat: d.lat, lng: d.lng, zoom: d.zoom });
                                        setShowDistricts(false);
                                    }}
                                    style={{
                                        padding: '7px 14px', fontSize: '0.78rem',
                                        color: 'var(--text)', cursor: 'pointer',
                                        borderBottom: '1px solid var(--border)',
                                        transition: 'background 0.1s',
                                        display: 'flex', alignItems: 'center', gap: 6,
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(var(--primary-rgb),.08)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>🏘️</span>
                                    {d.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
