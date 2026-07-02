"use client";

import React from "react";

export interface DistrictPriceEntry {
  id: string;
  il: string;
  ilce: string;
  avgSalesPricePerM2: number;
  avgUnitConstructionPrice: number;
}

interface LocationSelectorProps {
  districtPrices: DistrictPriceEntry[];
  selectedIl: string;
  selectedIlce: string;
  onIlChange: (il: string) => void;
  onIlceChange: (ilce: string) => void;
  onClear: () => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  districtPrices,
  selectedIl,
  selectedIlce,
  onIlChange,
  onIlceChange,
  onClear,
}) => {
  const iller = [...new Set(districtPrices.map((d) => d.il))].sort();
  const ilceler = districtPrices
    .filter((d) => d.il === selectedIl)
    .map((d) => d.ilce)
    .sort();

  const selectedEntry = districtPrices.find(
    (d) => d.il === selectedIl && d.ilce === selectedIlce
  );

  const baseSelectStyle: React.CSSProperties = {
    padding: "4px 8px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--input-bg)",
    color: "var(--text)",
    fontSize: "0.85rem",
    fontFamily: "inherit",
    cursor: "pointer",
    WebkitAppearance: "none",
    appearance: "none",
  };

  if (selectedIlce && selectedEntry) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "rgba(var(--green-rgb),0.06)",
          border: "1px solid var(--green)",
          borderRadius: 12,
          padding: "8px 14px",
          marginBottom: "10px",
        }}
      >
        <span style={{ fontSize: "1.1rem", color: "var(--green)" }}>📍</span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: "0.9rem",
              color: "var(--green)",
            }}
          >
            {selectedIl} / {selectedIlce}
          </div>
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--muted)",
              marginTop: 2,
            }}
          >
            Piyasa: {selectedEntry.avgSalesPricePerM2.toLocaleString("tr-TR")}{" "}
            TL/m²&nbsp;·&nbsp;Birim:{" "}
            {selectedEntry.avgUnitConstructionPrice.toLocaleString("tr-TR")}{" "}
            TL/m²
          </div>
        </div>
        <button
          onClick={onClear}
          aria-label="Konumu temizle"
          title="Konumu temizle"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--muted)",
            fontSize: "1rem",
            padding: "2px 4px",
          }}
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "10px 12px",
        marginBottom: "10px",
      }}
    >
      <span style={{
        width: "36px",
        height: "36px",
        borderRadius: "10px",
        background: "var(--primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: "1rem",
      }}>📍</span>
      <span style={{ flex: 1, fontSize: "0.85rem", color: "var(--muted)" }}>
        {selectedIl
          ? "İlçe seçince fiyatlar güncellenir"
          : "İl / İlçe seçin →"}
      </span>
      <select
        value={selectedIl}
        onChange={(e) => onIlChange(e.target.value)}
        style={{
          ...baseSelectStyle,
          ...(selectedIl
            ? {
                borderColor: "var(--primary)",
                color: "var(--primary)",
                fontWeight: 700,
              }
            : {}),
        }}
      >
        <option value="">İl seç...</option>
        {iller.map((il) => (
          <option key={il} value={il}>
            {il}
          </option>
        ))}
      </select>
      <select
        value={selectedIlce}
        onChange={(e) => onIlceChange(e.target.value)}
        disabled={!selectedIl}
        style={{
          ...baseSelectStyle,
          ...(selectedIl
            ? {
                borderColor: "var(--primary)",
              }
            : { opacity: 0.5, cursor: "not-allowed" }),
        }}
      >
        <option value="">İlçe seç...</option>
        {ilceler.map((ilce) => (
          <option key={ilce} value={ilce}>
            {ilce}
          </option>
        ))}
      </select>
    </div>
  );
};
