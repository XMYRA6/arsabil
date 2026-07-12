# ArsaBil Deployment (Coolify / VPS — Hostinger)

## 0. Hostinger VPS Kurulumu (Coolify'dan Önce)

Bu bölüm Hostinger'a özgüdür; Coolify'ı başka bir sağlayıcıda (Hetzner, DigitalOcean vb.) kuruyorsan doğrudan Bölüm 1'e geç.

### 0a. VPS Planı

- **Minimum:** KVM 2 (2 vCPU / 8 GB RAM / 100 GB NVMe) — Next.js build'i (özellikle `npx next build`) ve Postgres aynı makinede çalışacağı için 4 GB planlar build sırasında OOM'a girebilir.
- **Önerilen:** KVM 4 (4 vCPU / 16 GB RAM) — Coolify'ın kendi servisleri (proxy, Sentinel, scheduler) + uygulama + Postgres birlikte rahat çalışır, ileride ikinci bir proje eklemek için de yer bırakır.
- OS Template: **Ubuntu 24.04 LTS** seç (Hostinger VPS > Yeniden Yükle / OS ekranından).

### 0b. Coolify Kurulumu

Hostinger hPanel > VPS > **Browser Terminal** (veya SSH ile) bağlan, resmi kurulum script'ini çalıştır:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Kurulum bitince Coolify paneline `http://<vps-ip>:8000` üzerinden eriş, ilk admin hesabını oluştur.

### 0c. Hostinger Firewall

Hostinger VPS panelinde (hPanel > VPS > **Firewall**) varsayılan kural seti genelde yalnızca SSH (22) açık bırakır — aşağıdaki portları eklemeden Coolify dışarıdan erişilemez ve SSL/domain trafiği geçmez:

| Port | Amaç |
|---|---|
| 22 | SSH |
| 80 | HTTP (Let's Encrypt doğrulama + HTTPS'e yönlendirme) |
| 443 | HTTPS (uygulama trafiği) |
| 8000 | Coolify paneli (yalnızca kurulum/yönetim sırasında gerekli; istersen sonradan IP-whitelist ile kısıtla) |
| 6001-6002 | Coolify real-time terminal/log akışı |

Firewall kuralını oluşturduktan sonra hPanel'de VPS'e **ata**mayı unutma — Hostinger'da kural listesi ile VPS ataması ayrı adımlardır.

### 0d. Domain DNS (hPanel)

Domain Hostinger'da kayıtlıysa: hPanel > **Domainler** > ilgili domain > **DNS / Nameserver'lar** > DNS Zone Editor'dan bir `A` kaydı ekle (`@` veya alt domain → VPS IP'si). Domain başka bir sağlayıcıdaysa oradaki DNS panelinden aynı `A` kaydını gir. Yayılma birkaç dakika–birkaç saat sürebilir; `dig <domain>` ile IP'nin doğru çözüldüğünü kontrol et.

---

## 1. Ön Koşullar

- VPS'te Coolify kurulu (yukarıdaki 0b) — Ubuntu 24.04 üzerinde
- Domain DNS kaydı sunucu IP'sine yönlendirilmiş (0d)
- Hostinger Firewall'da 80/443 (ve kurulum sırasında 8000) açık (0c)
- Sunucuda en az 8 GB RAM, 20 GB disk (0a)
- GitHub reposu Coolify'a bağlanmış (OAuth veya SSH deploy key) — bu repo şu an origin'i olmayan lokal bir repo, önce GitHub'a push edilmesi gerekiyor

---

## 2. Coolify Kurulumu

### 2a. Yeni Kaynak Oluştur

1. Coolify > **New Resource** > **Docker Compose**
2. Repo seç (veya tarball yükle), `docker-compose.prod.yml` dosyasını hedef göster
3. Branch: `main`

### 2b. Environment Variables — Deploy Öncesi Checklist

`.env.example` dosyasındaki **tüm** değişkenleri Coolify'ın Environment sekmesine gir. Sırayla işaretle:

- [ ] **`DATABASE_URL`** (zorunlu) — `postgresql://arsabil:<POSTGRES_PASSWORD>@postgres:5432/arsabil`
      Host mutlaka `postgres` olmalı (docker-compose.prod.yml'deki servis adı) — `localhost`/IP yazarsan container ağı içinden çözülmez.
- [ ] **`NEXTAUTH_URL`** (zorunlu) — `https://<domain>`
      Yanlışsa login tamamen kırılır (redirect URL uyuşmazlığı). `http://` değil `https://` olmalı.
- [ ] **`NEXTAUTH_SECRET`** (zorunlu) — üret: `openssl rand -base64 32`
      Her ortam (dev/prod) için ayrı üret, asla `.env.example`/repo'daki test değerini kullanma.
- [ ] **`POSTGRES_DB`** (zorunlu) — `arsabil`
- [ ] **`POSTGRES_USER`** (zorunlu) — `arsabil`
- [ ] **`POSTGRES_PASSWORD`** (zorunlu) — üret: `openssl rand -base64 24`
      `DATABASE_URL` içindeki şifreyle birebir aynı olmalı (ikisini birbirinden bağımsız üretme).
- [ ] **`CLOUDINARY_CLOUD_NAME`** (zorunlu — ilan fotoğrafı yükleme çalışmaz) — Cloudinary Dashboard > hesap adı
- [ ] **`CLOUDINARY_API_KEY`** (zorunlu) — Cloudinary Dashboard > API Keys
- [ ] **`CLOUDINARY_API_SECRET`** (zorunlu) — Cloudinary Dashboard > API Keys (gizli, tekrar gösterilmez — kaybedersen yeniden üret)
- [ ] **`RESEND_API_KEY`** (zorunlu — bu değişken boşsa `npm run build` bile hata verir, bkz. not aşağıda) — Resend Dashboard > API Keys
- [ ] **`NEXT_PUBLIC_SENTRY_DSN`** (opsiyonel) — boş bırakılırsa Sentry tamamen devre dışı kalır, hata değil
- [ ] **`SENTRY_ORG`** / **`SENTRY_PROJECT`** (opsiyonel) — yalnız Sentry kullanılıyorsa
- [ ] **`SENTRY_AUTH_TOKEN`** (opsiyonel) — yalnız build sırasında source map upload için; runtime'da gerekmez

**Not — `RESEND_API_KEY` build-time bağımlılığı:** Bu proje `npm run build` sırasında Resend client'ı import eden bir modülü statik analiz ettiği için `RESEND_API_KEY` tanımsızsa build başarısız olabilir (bu, lokal doğrulama sırasında da gözlemlendi — bkz. Bölüm 10). Coolify'da **build zamanında da** bu değişkenin set olduğundan emin ol, yalnızca runtime'a değil.

**Kritik sıralama uyarısı:** `POSTGRES_PASSWORD` ile `DATABASE_URL` içindeki şifre senkron değilse, ilk deploy'da Postgres container'ı `POSTGRES_PASSWORD` ile başlar ama app container `DATABASE_URL`'deki (farklı) şifreyle bağlanmaya çalışır → `password authentication failed`. İkisini aynı anda, aynı değerle gir.

### 2c. Domain ve SSL

- Coolify > Domain: `https://<domain>` gir
- SSL: Coolify + Traefik otomatik (Let's Encrypt) — ek yapılandırma gerekmez

### 2d. Health Check

- Health check URL: `/api/health`
- Coolify bu endpoint'i kullanarak uygulama hazırlığını izler
- Beklenen yanıt: `{"status":"ok","db":"ok"}`

### 2e. Deploy

**Deploy** butonuna bas. Entrypoint (`prisma migrate deploy`) migration'ları otomatik uygular; ilk deploy'da tablo yapısını oluşturur.

---

## 3. Deploy Sonrası Doğrulama

```bash
# Health endpoint
curl https://<domain>/api/health
# Beklenen: {"status":"ok","db":"ok","uptimeSec":...}
```

SSE (gerçek zamanlı mesajlaşma) doğrulaması:
- İki farklı hesapla `/inbox`'a gir
- Birinden mesaj gönder — karşı tarafta sayfa yenilemeden görünmeli
- Görünmüyorsa Coolify > Service > Traefik ayarlarında proxy buffering kapalı olmalı (varsayılan kapalıdır)

---

## 4. Backup

### Otomatik (Coolify)

Coolify > Database > **Scheduled Backups**: günlük, 7 gün saklama önerilir.

### Manuel

```bash
# Container adını bul
docker ps --filter "name=postgres" --format "{{.Names}}"

# Dump al
docker exec <pg-container> pg_dump -U arsabil -Fc arsabil > arsabil_$(date +%F).dump
```

---

## 5. Restore

```bash
# 1. Uygulamayı durdur (Coolify > Stop)

# 2. Veritabanını geri yükle
docker exec -i <pg-container> \
  pg_restore -U arsabil -d arsabil --clean --if-exists < dosya.dump

# 3. Migration durumunu kontrol et
docker exec <app-container> \
  node node_modules/prisma/build/index.js migrate status

# 4. Uygulamayı başlat (Coolify > Start)
```

---

## 6. Rollback

- **Kod rollback:** Coolify > Deployments > önceki deployment kaydında **Redeploy**
- **Şema rollback:** Prisma down migration üretmez. Şema değişikliği içeren bir deploy'u geri almak için restore (Bölüm 5) kullan. Bu yüzden şema değiştiren her deploy ÖNCESİNDE manuel backup al.

---

## 7. Rate Limit Notu

Rate limitler in-memory'dir:
- Container restart'ında sıfırlanır
- Tek instance varsayar — yatay ölçeklemede (birden fazla app container) `src/lib/rate-limit.ts` Redis tabanlı implementasyonla değiştirilmeli (arayüz `checkRateLimit` sabit kalır)

---

## 8. İlk Yönetici Hesabı

Uygulama çalışır durumdayken veritabanından doğrudan rol ata:

```bash
docker exec -it <pg-container> psql -U arsabil -d arsabil
```

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = '<admin-email>';
```

---

## 9. Çevre Değişkeni Referans

Tüm gerekli değişkenler `.env.example` dosyasında belgelenmiştir; ayrıntılı checklist Bölüm 2b'de. Production deploy'dan önce her değişkeni doldur; eksik değerler build veya runtime hatalarına yol açar.

---

## 10. Deploy Öncesi Son Kontrol

Coolify'a ilk deploy'dan önce sırayla:

- [ ] `git remote -v` — repo bir GitHub/GitLab remote'una push edilmiş mi? (Bkz. Bölüm 1 notu — bu repo şu an lokal, remote yok)
- [ ] Bölüm 2b'deki tüm environment variable'lar Coolify'da dolduruldu mu?
- [ ] `POSTGRES_PASSWORD` ile `DATABASE_URL` içindeki şifre birebir aynı mı?
- [ ] Hostinger Firewall'da 80/443 açık ve VPS'e atanmış mı? (Bölüm 0c)
- [ ] Domain DNS `A` kaydı VPS IP'sine işaret ediyor mu — `dig <domain>` ile doğrula (Bölüm 0d)
- [ ] Lokal `docker build .` başarıyla tamamlanıyor mu? (Coolify'daki build de aynı Dockerfile'ı kullanır — lokal hata varsa Coolify'da da olur)

### 10a. Lokal Doğrulama Sonucu (2026-07-12)

`docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d` ile tam prod stack lokalde doğrulandı:

- ✅ Build tamamlandı (Prisma engine indirme + `next build` dahil)
- ✅ `arsabil-main-postgres-1` healthy, `arsabil-main-app-1` healthy
- ✅ `prisma migrate deploy` container başlangıcında otomatik çalıştı, sorunsuz
- ✅ `curl http://localhost:3000/api/health` → `{"status":"ok","db":"ok","uptimeSec":214}` — Bölüm 2d/3'teki beklenen yanıtla birebir uyuşuyor
- ✅ `/` ve `/login` sayfaları HTTP 200 döndü

**Lokal test sırasında karşılaşılan 2 nokta (Coolify'da geçerli DEĞİL, yalnızca bu makinede aynı repo dizininde dev+prod compose'u art arda çalıştırırken dikkat edilmeli):**

1. `docker compose -f docker-compose.prod.yml up` komutu **mutlaka `--env-file .env.production` ile** çalıştırılmalı — `env_file:` direktifi yalnızca container'ın runtime ortamına değişken enjekte eder, compose dosyasındaki `${POSTGRES_PASSWORD:?...}` gibi interpolasyonları BESLEMEZ; onun için ayrı olarak `--env-file` gerekir. (Coolify bunu etkilemez — Coolify environment variable'ları kendi mekanizmasıyla süreç ortamına zaten enjekte eder.)
2. **Proje adı çakışması:** `docker-compose.dev.yml` ve `docker-compose.prod.yml` her ikisi de servisi `postgres` adıyla tanımlıyor, ve Docker Compose proje adını varsayılan olarak dizin adından türetiyor (`arsabil-main`) — dosya adından değil. Aynı dizinde önce dev sonra prod compose'u `-p` (proje adı) belirtmeden çalıştırırsan, Compose ikisini AYNI proje/servis olarak görür ve dev container'ı prod konfigürasyonuyla **recreate** eder (bu oturumda birebir yaşandı: `arsabil_postgres_dev` container'ı `arsabil-main-postgres-1` olarak değiştirildi). Veri kaybı olmadı çünkü named volume'lar [`arsabil_pgdata` (dev) / `arsabil_pgdata_prod` (prod)] ayrı ve container silinince volume silinmiyor — ama container'ı geri almak için `docker compose -f docker-compose.dev.yml up -d` yeniden çalıştırmak gerekti. Lokalde ikisini yan yana test edeceksen prod tarafını izole bir proje adıyla çalıştır: `docker compose -p arsabil-prod-test --env-file .env.production -f docker-compose.prod.yml up --build -d`.

**Cosmetic (engelleyici değil):** Runtime loglarında `Prisma failed to detect the libssl/openssl version... Defaulting to "openssl-1.1.x"` uyarısı görünüyor — Dockerfile zaten `PRISMA_SCHEMA_ENGINE_BINARY`/`PRISMA_QUERY_ENGINE_LIBRARY` ile binary yollarını sabitleyerek bu auto-detection'ı bypass ediyor (bkz. Dockerfile satır 36-38 yorumu), sorgular sorunsuz çalışıyor (`SELECT 1` logları, health check `db:"ok"`) — yalnızca log gürültüsü.
