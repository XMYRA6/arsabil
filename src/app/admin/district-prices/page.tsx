"use client";

import { useEffect, useState } from "react";
import styles from "../admin.module.css";
import { Button } from "@/components/ui/Button";
import { DistrictPriceEntry } from "@/components/LocationSelector";
import { DataCard, CardList } from "@/components/mobile/DataCard";

interface ModalState {
  open: boolean;
  mode: "add" | "edit";
  item: Partial<DistrictPriceEntry>;
}

export default function AdminDistrictPrices() {
  const [prices, setPrices] = useState<DistrictPriceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterIl, setFilterIl] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [modal, setModal] = useState<ModalState>({
    open: false,
    mode: "add",
    item: {},
  });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/district-prices");
      const data = await res.json();
      if (Array.isArray(data)) setPrices(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- bileşen montajında fiyat listesi çekiliyor; setState fetchPrices içinde gerçekleşiyor
    fetchPrices();
  }, []);

  const filtered = filterIl
    ? prices.filter((p) =>
        p.il.toLowerCase().includes(filterIl.toLowerCase())
      )
    : prices;

  const iller = [...new Set(prices.map((p) => p.il))].sort();

  const openAdd = () => setModal({ open: true, mode: "add", item: {} });
  const openEdit = (item: DistrictPriceEntry) =>
    setModal({ open: true, mode: "edit", item });
  const closeModal = () => {
    setModal({ open: false, mode: "add", item: {} });
    setMessage(null);
  };

  const handleSave = async () => {
    const { il, ilce, avgSalesPricePerM2, avgUnitConstructionPrice } =
      modal.item;
    if (!il || !ilce || avgSalesPricePerM2 === undefined || avgSalesPricePerM2 === null || avgUnitConstructionPrice === undefined || avgUnitConstructionPrice === null) {
      setMessage({ type: "error", text: "Tüm alanlar zorunludur." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const isEdit = modal.mode === "edit" && modal.item.id;
      const res = await fetch(
        isEdit
          ? `/api/district-prices/${modal.item.id}`
          : "/api/district-prices",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            il,
            ilce,
            avgSalesPricePerM2: Number(avgSalesPricePerM2),
            avgUnitConstructionPrice: Number(avgUnitConstructionPrice),
          }),
        }
      );
      if (res.ok) {
        setMessage({
          type: "success",
          text: isEdit ? "Güncellendi." : "Eklendi.",
        });
        closeModal();
        fetchPrices();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.message || "Hata oluştu." });
      }
    } catch {
      setMessage({ type: "error", text: "Sunucu hatası." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/district-prices/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Silindi." });
        setPrices((prev) => prev.filter((p) => p.id !== id));
      } else {
        setMessage({ type: "error", text: "Silme başarısız." });
      }
    } catch {
      setMessage({ type: "error", text: "Sunucu hatası." });
    } finally {
      setDeleteId(null);
    }
  };

  const FIELDS: {
    label: string;
    key: keyof DistrictPriceEntry;
    type: string;
    placeholder: string;
  }[] = [
    { label: "İl", key: "il", type: "text", placeholder: "örn: İstanbul" },
    { label: "İlçe", key: "ilce", type: "text", placeholder: "örn: Kadıköy" },
    {
      label: "Piyasa Fiyatı (TL/m²)",
      key: "avgSalesPricePerM2",
      type: "number",
      placeholder: "örn: 95000",
    },
    {
      label: "İnşaat Birim Fiyatı (TL/m²)",
      key: "avgUnitConstructionPrice",
      type: "number",
      placeholder: "örn: 14500",
    },
  ];

  return (
    <>
      <div className={styles.pageHeader}>
        <h1>İlçe Fiyatları</h1>
        <p>İl/ilçe bazlı ortalama piyasa ve inşaat birim fiyatlarını yönetin</p>
      </div>

      {message && !modal.open && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            marginBottom: 14,
            background:
              message.type === "success"
                ? "rgba(var(--green-rgb),0.1)"
                : "rgba(var(--red-rgb),0.1)",
            border: `1px solid ${
              message.type === "success" ? "var(--green)" : "var(--red)"
            }`,
            color:
              message.type === "success" ? "var(--green)" : "var(--red)",
            fontSize: "0.9rem",
          }}
        >
          {message.text}
        </div>
      )}

      <div className={styles.card} style={{ padding: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "16px",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="🔍 İl ara..."
            value={filterIl}
            onChange={(e) => setFilterIl(e.target.value)}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--input-bg)",
              color: "var(--text)",
              fontSize: "0.9rem",
              fontFamily: "inherit",
            }}
          />
          <select
            value={filterIl}
            onChange={(e) => setFilterIl(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--input-bg)",
              color: "var(--text)",
              fontSize: "0.9rem",
              fontFamily: "inherit",
              WebkitAppearance: "none",
              appearance: "none",
            }}
          >
            <option value="">Tüm İller</option>
            {iller.map((il) => (
              <option key={il} value={il}>
                {il}
              </option>
            ))}
          </select>
          <Button variant="primary" onClick={openAdd} className={styles.adminPrimaryBtn}>
            + Yeni Ekle
          </Button>
        </div>

        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "var(--muted)",
            }}
          >
            Yükleniyor...
          </div>
        ) : (
          <div className={styles.tableWrap}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                {["İl", "İlçe", "Piyasa (TL/m²)", "İnşaat (TL/m²)", "Eylem"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 12px",
                        textAlign: h === "Eylem" ? "center" : h.includes("TL") ? "right" : "left",
                        color: "var(--muted)",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: "var(--muted)",
                    }}
                  >
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((p, i) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background:
                        i % 2 === 0 ? "transparent" : "var(--panel-2)",
                    }}
                  >
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                      {p.il}
                    </td>
                    <td style={{ padding: "10px 12px" }}>{p.ilce}</td>
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        color: "var(--primary)",
                        fontWeight: 700,
                      }}
                    >
                      {p.avgSalesPricePerM2.toLocaleString("tr-TR")}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        fontWeight: 600,
                      }}
                    >
                      {p.avgUnitConstructionPrice.toLocaleString("tr-TR")}
                    </td>
                    <td
                      style={{ padding: "10px 12px", textAlign: "center" }}
                    >
                      <button
                        onClick={() => openEdit(p)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--primary)",
                          fontSize: "1rem",
                          marginRight: 8,
                        }}
                        title="Düzenle"
                      >
                        ✏️
                      </button>
                      {deleteId === p.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(p.id)}
                            style={{
                              background: "rgba(var(--red-rgb),0.1)",
                              border: "1px solid var(--red)",
                              borderRadius: 4,
                              cursor: "pointer",
                              color: "var(--red)",
                              fontSize: "0.8rem",
                              padding: "2px 6px",
                              marginRight: 4,
                            }}
                          >
                            Evet, sil
                          </button>
                          <button
                            onClick={() => setDeleteId(null)}
                            style={{
                              background: "none",
                              border: "1px solid var(--border)",
                              borderRadius: 4,
                              cursor: "pointer",
                              color: "var(--muted)",
                              fontSize: "0.8rem",
                              padding: "2px 6px",
                            }}
                          >
                            İptal
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setDeleteId(p.id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--red)",
                            fontSize: "1rem",
                          }}
                          title="Sil"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className={styles.mobileCardList}>
            <CardList>
              {filtered.map((p) => (
                <DataCard
                  key={p.id}
                  className={styles.dataCardGlass}
                  title={`${p.il} — ${p.ilce}`}
                  fields={[
                    { label: 'İlçe', value: p.ilce },
                    { label: 'Piyasa (TL/m²)', value: <span className={styles.tabularNums}>{p.avgSalesPricePerM2.toLocaleString('tr-TR')}</span> },
                    { label: 'İnşaat (TL/m²)', value: <span className={styles.tabularNums}>{p.avgUnitConstructionPrice.toLocaleString('tr-TR')}</span> },
                  ]}
                  actions={
                    <>
                      <button onClick={() => openEdit(p)} className={styles.iconBtn} title="Düzenle">✏️ Düzenle</button>
                      {deleteId === p.id ? (
                        <>
                          <button onClick={() => handleDelete(p.id)} className={styles.iconBtn} style={{ color: 'var(--red)' }}>Evet, sil</button>
                          <button onClick={() => setDeleteId(null)} className={styles.iconBtn}>İptal</button>
                        </>
                      ) : (
                        <button onClick={() => setDeleteId(p.id)} className={styles.iconBtn} style={{ color: 'var(--red)' }} title="Sil">🗑️ Sil</button>
                      )}
                    </>
                  }
                />
              ))}
            </CardList>
          </div>
        )}
      </div>

      {modal.open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "2rem",
              width: "100%",
              maxWidth: 420,
            }}
          >
            <h3
              style={{
                margin: "0 0 20px",
                fontWeight: 800,
                color: "var(--card-title)",
              }}
            >
              {modal.mode === "add" ? "Yeni İlçe Fiyatı" : "Düzenle"}
            </h3>
            {FIELDS.map((field) => (
              <div key={field.key} style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "var(--label-color)",
                    marginBottom: 4,
                  }}
                >
                  {field.label}
                </label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={
                    (modal.item[field.key] as string | number | undefined) ?? ""
                  }
                  onChange={(e) =>
                    setModal((prev) => ({
                      ...prev,
                      item: {
                        ...prev.item,
                        [field.key]:
                          field.type === "number"
                            ? Number(e.target.value)
                            : e.target.value,
                      },
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--input-bg)",
                    color: "var(--text)",
                    fontSize: "0.95rem",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            ))}
            {message && (
              <div
                style={{
                  marginBottom: 14,
                  fontSize: "0.85rem",
                  color:
                    message.type === "error" ? "var(--red)" : "var(--green)",
                }}
              >
                {message.text}
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                marginTop: 8,
              }}
            >
              <Button variant="outline" onClick={closeModal}>
                İptal
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={saving} className={styles.adminPrimaryBtn}>
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
