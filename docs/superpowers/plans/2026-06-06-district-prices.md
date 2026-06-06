# İlçe Bazlı Fiyat Entegrasyonu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin panelden il/ilçe bazlı fiyat girişi sağlamak ve kullanıcı `/hesapla` sayfasında konum seçince `manualMarketPrice` ve `globalUnitPrice` state'lerini otomatik güncellemek.

**Architecture:** `DistrictPrice` Prisma modeli → REST API (`/api/district-prices`) → Admin CRUD sayfası + `LocationSelector` bileşeni → `hesapla/page.tsx` entegrasyonu. Tüm kayıtlar sayfa açılışında tek seferde çekilir, client-side filtrelenir.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 5.22.0, PostgreSQL, NextAuth.js

---

## File Map

| Eylem | Dosya | Sorumluluk |
|-------|-------|-----------|
| Modify | `prisma/schema.prisma` | `DistrictPrice` modeli ekle |
| Create | `src/app/api/district-prices/route.ts` | GET (liste) + POST |
| Create | `src/app/api/district-prices/[id]/route.ts` | PUT + DELETE |
| Modify | `src/app/admin/layout.tsx` | Nav item ekle |
| Create | `src/app/admin/district-prices/page.tsx` | Admin CRUD sayfası |
| Create | `src/components/LocationSelector.tsx` | İl→İlçe cascade bileşeni + `DistrictPriceEntry` interface |
| Modify | `src/app/hesapla/page.tsx` | State, fetch, handler, render |

---

### Task 1: Prisma Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add DistrictPrice model to schema**

`prisma/schema.prisma` dosyasındaki son modelin hemen arkasına ekle:

```prisma
model DistrictPrice {
  id                       String   @id @default(cuid())
  il                       String
  ilce                     String
  avgSalesPricePerM2       Float
  avgUnitConstructionPrice Float
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  @@unique([il, ilce])
  @@index([il])
}
```

- [ ] **Step 2: Run migration**

```powershell
npx prisma@5.22.0 migrate dev --name add_district_price
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 3: Regenerate Prisma client**

```powershell
npx prisma@5.22.0 generate
```

Expected output: `Generated Prisma Client ...`

- [ ] **Step 4: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```powershell
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add DistrictPrice model to schema"
```

---

### Task 2: API Route — GET + POST

**Files:**
- Create: `src/app/api/district-prices/route.ts`

- [ ] **Step 1: Create the route file**

`src/app/api/district-prices/route.ts` dosyasını oluştur, tam içerik:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const il = request.nextUrl.searchParams.get("il");
    const where = il ? { il } : {};
    const prices = await prisma.districtPrice.findMany({
      where,
      orderBy: [{ il: "asc" }, { ilce: "asc" }],
    });
    return NextResponse.json(prices);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "İlçe fiyatları getirilemedi." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 });
    }
    const { il, ilce, avgSalesPricePerM2, avgUnitConstructionPrice } =
      await request.json();
    if (
      !il ||
      !ilce ||
      avgSalesPricePerM2 === undefined ||
      avgUnitConstructionPrice === undefined
    ) {
      return NextResponse.json(
        {
          message:
            "il, ilce, avgSalesPricePerM2, avgUnitConstructionPrice zorunludur.",
        },
        { status: 400 }
      );
    }
    const price = await prisma.districtPrice.create({
      data: {
        il: String(il),
        ilce: String(ilce),
        avgSalesPricePerM2: Number(avgSalesPricePerM2),
        avgUnitConstructionPrice: Number(avgUnitConstructionPrice),
      },
    });
    return NextResponse.json(price, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { message: "Bu il/ilçe kombinasyonu zaten mevcut." },
        { status: 409 }
      );
    }
    console.error(error);
    return NextResponse.json(
      { message: "Kayıt eklenirken hata oluştu." },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```powershell
git add src/app/api/district-prices/route.ts
git commit -m "feat: add GET+POST /api/district-prices"
```

---

### Task 3: API Route — PUT + DELETE

**Files:**
- Create: `src/app/api/district-prices/[id]/route.ts`

Not: Bu proje Next.js 16'dır ve `params` bir Promise'dir. Örüntü şu şekilde:
```ts
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
```

- [ ] **Step 1: Create the [id] route file**

`src/app/api/district-prices/[id]/route.ts` dosyasını oluştur, tam içerik:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 });
    }
    const { id } = await context.params;
    const body = await request.json();
    const data: Record<string, string | number> = {};
    if (body.il !== undefined) data.il = String(body.il);
    if (body.ilce !== undefined) data.ilce = String(body.ilce);
    if (body.avgSalesPricePerM2 !== undefined)
      data.avgSalesPricePerM2 = Number(body.avgSalesPricePerM2);
    if (body.avgUnitConstructionPrice !== undefined)
      data.avgUnitConstructionPrice = Number(body.avgUnitConstructionPrice);
    const price = await prisma.districtPrice.update({ where: { id }, data });
    return NextResponse.json(price);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ message: "Kayıt bulunamadı." }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json(
      { message: "Güncelleme başarısız." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 });
    }
    const { id } = await context.params;
    await prisma.districtPrice.delete({ where: { id } });
    return NextResponse.json({ message: "Silindi." });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ message: "Kayıt bulunamadı." }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ message: "Silme başarısız." }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```powershell
git add src/app/api/district-prices/[id]/route.ts
git commit -m "feat: add PUT+DELETE /api/district-prices/[id]"
```

---

### Task 4: Admin Nav + Admin District Prices Page

**Files:**
- Modify: `src/app/admin/layout.tsx:26` (navItems dizisi)
- Create: `src/app/admin/district-prices/page.tsx`

Context: Admin layout'un `navItems` dizisi şu anda 6 item içeriyor (Genel Bakış, İlan Yönetimi, Teklifler, Analitik, Kullanıcılar, Motor Ayarları). Yeni item en sona eklenir.

- [ ] **Step 1: Add nav item to admin layout**

`src/app/admin/layout.tsx` dosyasını oku ve `navItems` dizisinin son elemanından sonra şunu ekle:

```tsx
{ href: '/admin/district-prices', label: 'İlçe Fiyatları', icon: '📍' },
```

Tam olarak bu array entry'si `{ href: '/admin/settings', label: 'Motor Ayarları', icon: '⚙️' },` satırından sonra gelmelidir.

- [ ] **Step 2: Create admin district-prices page**

`src/app/admin/district-prices/page.tsx` dosyasını oluştur, tam içerik:

```tsx
"use client";

import { useEffect, useState } from "react";
import styles from "../admin.module.css";
import { Button } from "@/components/ui/Button";

interface DistrictPrice {
  id: string;
  il: string;
  ilce: string;
  avgSalesPricePerM2: number;
  avgUnitConstructionPrice: number;
}

interface ModalState {
  open: boolean;
  mode: "add" | "edit";
  item: Partial<DistrictPrice>;
}

export default function AdminDistrictPrices() {
  const [prices, setPrices] = useState<DistrictPrice[]>([]);
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

  useEffect(() => {
    fetchPrices();
  }, []);

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

  const filtered = filterIl
    ? prices.filter((p) =>
        p.il.toLowerCase().includes(filterIl.toLowerCase())
      )
    : prices;

  const iller = [...new Set(prices.map((p) => p.il))].sort();

  const openAdd = () => setModal({ open: true, mode: "add", item: {} });
  const openEdit = (item: DistrictPrice) =>
    setModal({ open: true, mode: "edit", item });
  const closeModal = () => {
    setModal({ open: false, mode: "add", item: {} });
    setMessage(null);
  };

  const handleSave = async () => {
    const { il, ilce, avgSalesPricePerM2, avgUnitConstructionPrice } =
      modal.item;
    if (!il || !ilce || !avgSalesPricePerM2 || !avgUnitConstructionPrice) {
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
    key: keyof DistrictPrice;
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
                ? "rgba(47,191,113,0.1)"
                : "rgba(255,90,95,0.1)",
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
            }}
          >
            <option value="">Tüm İller</option>
            {iller.map((il) => (
              <option key={il} value={il}>
                {il}
              </option>
            ))}
          </select>
          <Button variant="primary" onClick={openAdd}>
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
                              background: "rgba(255,90,95,0.1)",
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
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```powershell
git add src/app/admin/layout.tsx src/app/admin/district-prices/page.tsx
git commit -m "feat: add admin district prices page with CRUD"
```

---

### Task 5: LocationSelector Component

**Files:**
- Create: `src/components/LocationSelector.tsx`

Bu bileşen `DistrictPriceEntry` interface'ini export eder; `hesapla/page.tsx` bunu import eder (interface tekrarı yok).

3 görsel durum:
- **Durum 1 (boş):** Gri bar, placeholder metin, İl dropdown aktif, İlçe disabled
- **Durum 2 (il seçildi):** İl mavi vurgu, İlçe dropdown populate ve aktif
- **Durum 3 (ilçe seçildi):** Yeşil bar, "İl / İlçe · Piyasa: X TL/m² · Birim: Y TL/m²", ✕ butonu

- [ ] **Step 1: Create LocationSelector component**

`src/components/LocationSelector.tsx` dosyasını oluştur, tam içerik:

```tsx
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
  };

  if (selectedIlce && selectedEntry) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "rgba(47,191,113,0.06)",
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
        gap: "8px",
        background: "var(--panel-2)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "8px 14px",
        marginBottom: "10px",
      }}
    >
      <span style={{ fontSize: "1.1rem" }}>📍</span>
      <span style={{ flex: 1, fontSize: "0.85rem", color: "var(--muted)" }}>
        {selectedIl
          ? "İlçe seçince fiyatlar güncellenir"
          : "Proje konumunu seç — piyasa fiyatı otomatik dolsun"}
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
                background: "rgba(31,111,235,0.07)",
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```powershell
git add src/components/LocationSelector.tsx
git commit -m "feat: add LocationSelector component with DistrictPriceEntry interface"
```

---

### Task 6: hesapla/page.tsx Integration

**Files:**
- Modify: `src/app/hesapla/page.tsx`

Referans satırları (değişmemiş olmalı — önceki görevde ScenarioCompare entegre edildi):
- L22: `import { ScenarioCompare } from '@/components/ScenarioCompare';` — yeni import bundan sonra gelir
- L96: `const [savedScenarios, setSavedScenarios] = useState<ScenarioItem[]>([]);` — yeni state bundan sonra gelir
- L144: `fetch('/api/settings/risk-levels')` içinde olan useEffect kapanır L156'da `}, []);` ile — yeni fetch bundan önce
- L190: `}, [luxLevel, apartmentSize, ...]);` — reaktivite useEffect bunun hemen arkasına gelir
- L275: `};` — `handleRemoveScenario` biter — yeni handler'lar buradan sonra gelir
- L688: boş satır, L689: `<div className={styles.actionBottomRow}>` — LocationSelector buraya

**Değişiklik 1: Import**

- [ ] **Step 1: Add LocationSelector import**

L22'deki `import { ScenarioCompare }...` satırından **sonra** ekle:

```tsx
import { LocationSelector, DistrictPriceEntry } from '@/components/LocationSelector';
```

**Değişiklik 2: State**

- [ ] **Step 2: Add 4 state variables**

L96'daki `const [savedScenarios, setSavedScenarios] = useState<ScenarioItem[]>([]);` satırından **sonra** ekle:

```tsx
  const [selectedIl, setSelectedIl] = useState<string>('');
  const [selectedIlce, setSelectedIlce] = useState<string>('');
  const [districtPrices, setDistrictPrices] = useState<DistrictPriceEntry[]>([]);
  const [originalUnitPrice, setOriginalUnitPrice] = useState<number | null>(null);
```

**Değişiklik 3: Data fetch**

- [ ] **Step 3: Add district-prices fetch inside existing useEffect**

L155'teki `.catch(console.error);` (risk-levels fetch'in catch'i) ile L156'daki `}, []);` arasına ekle:

```tsx
    fetch('/api/district-prices')
      .then(res => res.json())
      .then((data: DistrictPriceEntry[]) => {
        if (Array.isArray(data)) setDistrictPrices(data);
      })
      .catch(console.error);
```

Not: Bu blok mevcut `useEffect(() => { ... }, [])` closure'ının içinde kalır.

**Değişiklik 4: Reaktivite useEffect**

- [ ] **Step 4: Add apartmentSize reactivity useEffect**

L190'daki hesap useEffect'inin kapanan `}, [...]);` satırından **sonra** (L191 civarı) ekle:

```tsx
  useEffect(() => {
    if (!selectedIlce) return;
    const entry = districtPrices.find(
      d => d.il === selectedIl && d.ilce === selectedIlce
    );
    if (!entry) return;
    const market = Math.round(entry.avgSalesPricePerM2 * apartmentSize);
    setManualMarketPrice(market.toLocaleString('tr-TR', { maximumFractionDigits: 0 }));
  }, [apartmentSize, selectedIl, selectedIlce, districtPrices]);
```

**Değişiklik 5: Handlers**

- [ ] **Step 5: Add location handlers**

L275'teki `handleRemoveScenario` kapanışından **sonra** (L276, boş satırdan sonra) ekle:

```tsx
  const handleIlChange = (il: string) => {
    setSelectedIl(il);
    setSelectedIlce('');
  };

  const handleIlceChange = (ilce: string) => {
    setSelectedIlce(ilce);
    const entry = districtPrices.find(d => d.il === selectedIl && d.ilce === ilce);
    if (!entry) return;
    if (originalUnitPrice === null) setOriginalUnitPrice(globalUnitPrice);
    setGlobalUnitPrice(entry.avgUnitConstructionPrice);
    const market = Math.round(entry.avgSalesPricePerM2 * apartmentSize);
    setManualMarketPrice(market.toLocaleString('tr-TR', { maximumFractionDigits: 0 }));
  };

  const handleClearLocation = () => {
    setSelectedIl('');
    setSelectedIlce('');
    if (originalUnitPrice !== null) {
      setGlobalUnitPrice(originalUnitPrice);
      setOriginalUnitPrice(null);
    }
  };
```

**Değişiklik 6: Render**

- [ ] **Step 6: Add LocationSelector to JSX**

L688'deki boş satır ile L689'daki `<div className={styles.actionBottomRow}>` arasına ekle:

```tsx
            {districtPrices.length > 0 && (
              <LocationSelector
                districtPrices={districtPrices}
                selectedIl={selectedIl}
                selectedIlce={selectedIlce}
                onIlChange={handleIlChange}
                onIlceChange={handleIlceChange}
                onClear={handleClearLocation}
              />
            )}
```

- [ ] **Step 7: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```powershell
git add src/app/hesapla/page.tsx
git commit -m "feat: integrate LocationSelector into hesapla page"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** DB model ✓ · GET/POST API ✓ · PUT/DELETE API ✓ · Admin CRUD sayfası ✓ · Admin nav item ✓ · LocationSelector 3 durum ✓ · hesapla state/fetch/handler/render ✓ · `@@unique` 409 handling ✓ · `originalUnitPrice` restore ✓ · `apartmentSize` reaktivite ✓ · `districtPrices.length > 0` guard ✓
- [x] **Placeholder scan:** Tüm adımlar tam kod içeriyor, TBD yok.
- [x] **Type consistency:** `DistrictPriceEntry` Task 5'te tanımlanıp export edildi, Task 6'da import edildi. `avgSalesPricePerM2` ve `avgUnitConstructionPrice` tüm adımlarda tutarlı.
- [x] **API pattern:** `context: { params: Promise<{ id: string }> }` + `await context.params` — Next.js 16 standardına uygun.
