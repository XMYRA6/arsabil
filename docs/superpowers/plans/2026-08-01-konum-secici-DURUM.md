# Konum Seçici Planı — DURUM (2026-08-01 gecesi, ara verildi)

Bu dosya **git'e commit'li** bir devam notudur. Ayrıntılı ledger
`.superpowers/sdd/2026-08-01-ilce-fiyat-verisi-ve-mobil-konum-secici/progress.md`
içinde ama o dizin gitignored — worktree silinirse veya `git clean -fdx` çalışırsa gider.
Bu dosya hayatta kalır.

## Nerede kaldık

**Plan:** `docs/superpowers/plans/2026-08-01-ilce-fiyat-verisi-ve-mobil-konum-secici.md` (7 task)
**Spec:** `docs/superpowers/specs/2026-08-01-ilce-fiyat-verisi-ve-mobil-konum-secici-design.md`
**Worktree:** `.claude/worktrees/konum-secici` · **Branch:** `feature/konum-secici`
**Yürütme yöntemi:** `superpowers:subagent-driven-development`
**main:** `7a2add9` (branch buradan dallandı; `origin` ÖLÜ, push yok)

| Task | Durum | Commit |
|---|---|---|
| 1 — Türkçe-duyarlı arama | ✅ complete, review clean | `e281715` |
| 2 — Veri dosyası + doğrulayıcı + seed | ⬜ sırada | — |
| 3 — `handleKonumSec` atomik seçim | ⬜ | — |
| 4 — `KonumSecici` kapalı hal | ⬜ | — |
| 5 — Aranabilir sheet | ⬜ | — |
| 6 — `KonumBlogu` entegrasyonu | ⬜ | — |
| 7 — Canlı ölçüm turu | ⬜ | — |

**Doğrulama (HEAD `e281715`):** jest **739/739** · tsc **0** · eslint **12** (baseline).

## YARIN İLK İŞ

`superpowers:subagent-driven-development` ile **Task 2'den** devam et. Ledger'ın ilk satırı
plan dosyasını adlandırıyor; `Task <N>: complete` satırı olan task'lar BİTMİŞTİR, yeniden
dispatch etme.

Akış hatırlatması: `scripts/task-brief PLAN N` → implementer dispatch → `scripts/review-package
PLAN BASE HEAD` → task reviewer → temizse ledger'a `Task N: complete`.

## Bu turda çıkan ve TAŞINMASI gereken not

**Plandaki "beklenen test sayısı" satırlarına güvenme.** Task 1'in brief'i "PASS (14 test)"
diyordu, gerçek 11 (3 + 8). Hiçbir test düşürülmedi — sayı benim aritmetik hatamdı. Sonraki
task'larda beklenen sayıyı brief'in kod bloğundaki `it()` sayısını sayarak doğrula.

## Ortam durumu (yarın gerekecek)

- **Docker DB açık bırakıldı** (`npm run dev:db` ile ayağa kalktı). Kapalıysa tekrar çalıştır.
- **DB'de 5 UYDURMA ilçe satırı var** — denetim turu için ben girdim (İstanbul/Kadıköy·Beşiktaş·
  Üsküdar, Ankara/Çankaya, İzmir/Karşıyaka). Rakamlar gerçek DEĞİL. Task 7 canlı tur için veri
  istiyor, o yüzden şimdilik duruyorlar; **gerçek seed verisi gelmeden önce silinecekler.**
- Worktree'ye `.env` ve `.env.local` elle kopyalandı (gitignored, otomatik gelmiyor),
  `npm install` yapıldı (node_modules worktree'de ayrı).
- Ana checkout'ta jest: `npx jest --no-coverage --roots "<rootDir>/src"` — başka worktree'ler
  açıkken düz `npx jest` onların kopyalarını da toplar.

## İNSANDAN BEKLENEN

**~900 ilçe için satış TL/m² ve birim inşaat maliyeti TL/m².** CSV / Excel / yapıştırılmış
metin — biçim fark etmez, dönüştürme bende. Task 2 veri dosyasını **boş dizi** ile kuracak,
yani implementasyon veriyi beklemeden ilerleyebilir; rakamlar geldiğinde yalnızca
`ILCE_FIYATLARI` doldurulup `npm run db:seed:district-prices` koşulacak.

## Hatırlatma: bu iş neden var

Seçici "mobilde yok" sanılıyordu; denetim bunun yanlış olduğunu ölçtü. Seçici iki platformda da
**var ve çalışıyor**. Gerçek engeller: (1) `DistrictPrice` tablosu boş ve seed yok, iki platform
da seçiciyi `districtPrices.length > 0` koşuluna bağlamış; (2) mobil sunum masaüstü bileşeninin
birebir kopyası — `<select>`ler ölçülen **28px**, projenin kendi `--touch-target` token'ı 44px.
