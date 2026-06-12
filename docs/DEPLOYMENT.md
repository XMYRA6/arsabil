# ArsaBil Deployment (Coolify / VPS)

## 1. Ön Koşullar

- VPS'te Coolify kurulu (tercihen Ubuntu 22.04 / Debian 12)
- Domain DNS kaydı sunucu IP'sine yönlendirilmiş (A kaydı)
- Sunucuda en az 2 GB RAM, 20 GB disk
- GitHub reposu Coolify'a bağlanmış (OAuth veya SSH deploy key)

---

## 2. Coolify Kurulumu

### 2a. Yeni Kaynak Oluştur

1. Coolify > **New Resource** > **Docker Compose**
2. Repo seç (veya tarball yükle), `docker-compose.prod.yml` dosyasını hedef göster
3. Branch: `main`

### 2b. Environment Variables

`.env.example` dosyasındaki **tüm** değişkenleri Coolify'ın Environment sekmesine gir:

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | `postgresql://arsabil:<sifre>@postgres:5432/arsabil` — host, compose servis adıyla eşleşmeli (`postgres`) |
| `NEXTAUTH_URL` | `https://<domain>` — yanlışsa login tamamen kırılır |
| `NEXTAUTH_SECRET` | En az 32 karakter: `openssl rand -base64 32` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary hesap adı |
| `CLOUDINARY_API_KEY` | Cloudinary API anahtarı |
| `CLOUDINARY_API_SECRET` | Cloudinary API gizli anahtarı |
| `RESEND_API_KEY` | Resend e-posta API anahtarı |
| `POSTGRES_DB` | `arsabil` |
| `POSTGRES_USER` | `arsabil` |
| `POSTGRES_PASSWORD` | Güçlü bir şifre — `openssl rand -base64 24` |
| `NEXT_PUBLIC_SENTRY_DSN` | (isteğe bağlı) Boş bırakılırsa Sentry devre dışı |
| `SENTRY_AUTH_TOKEN` | (isteğe bağlı) Source map upload için, yalnız build ortamında |

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

Tüm gerekli değişkenler `.env.example` dosyasında belgelenmiştir. Production deploy'dan önce her değişkeni doldur; eksik değerler build veya runtime hatalarına yol açar.
