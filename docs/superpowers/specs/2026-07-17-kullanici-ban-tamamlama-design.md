# Kullanıcı Askıya Alma (Ban) — Eksik Uygulamanın Tamamlanması

**Tarih:** 2026-07-17
**Durum:** Onaylandı

---

## 1. Genel Bakış

Admin panelinde kullanıcı askıya alma (ban) özelliği frontend'de tam yazılmış ama backend'de hiç tamamlanmamış — buton production'da sessizce çalışmıyor. Bu spec, mevcut yarım bırakılmış özelliği bitirmeyi kapsar; yeni bir UI tasarlanmayacak.

## 2. Mevcut Durum / Bug

- `src/app/admin/users/page.tsx`: "Askıya Al" butonu, `isBanned` state'i, badge, `handleBan()` fonksiyonu — hepsi tam yazılmış, `PATCH /api/admin/users` çağrısını `{ userId, isBanned }` body'siyle yapıyor.
- `prisma/schema.prisma` → `User` modelinde `isBanned` alanı **yok**.
- `src/app/api/admin/users/route.ts` → PATCH handler `isBanned`'ı body'den okumuyor, whitelist'e (`role`, `isVerified`, `plan`) dahil değil. İstek `Object.keys(data).length === 0` dalına düşüp 400 "Güncellenecek alan yok" döner.
- Sonuç: buton tıklanır, `res.ok` false döner, `handleBan()`'de hata dalı olmadığı için kullanıcıya hiçbir geri bildirim de gösterilmez — tamamen sessiz başarısızlık.
- `AdminUsers.test.tsx` zaten `isBanned:true` PATCH isteği bekleyen bir test içeriyor; bu test şu an backend'siz sadece frontend'i doğruluyor.

## 3. Veri Modeli Değişikliği

```prisma
model User {
  // ...mevcut alanlar...
  isBanned Boolean @default(false)
}
```

Migration: `prisma migrate dev --name user-ban-flag` (mevcut proje migration isimlendirme kalıbına uyumlu, örn. `faz2a-plan-approval-email`).

## 4. API Değişikliği — `PATCH /api/admin/users`

`src/app/api/admin/users/route.ts`:

- Body'den `isBanned` okunur, whitelist'e eklenir (`role`, `isVerified`, `plan` ile aynı desen).
- `isBanned === true` gönderildiğinde, aynı transaction içinde hedef kullanıcının `isActive: true` olan tüm `Listing` kayıtları `isActive: false` yapılır (`prisma.$transaction`).
- `isBanned === false` (askı kaldırma) ilanlara dokunmaz — otomatik geri açılmaz, admin/kullanıcı manuel aktif eder.
- Kendi hesabını banlama koruması: mevcut `userId === session.user.id` kontrolü `role` değişikliği için var; aynı korumaya `isBanned` da eklenir (admin kendini banlayamaz).

## 5. Giriş Engeli — `src/lib/auth.ts` → `authorize()`

Şifre doğrulamasından hemen sonra:

```typescript
if (user.isBanned) {
    throw new Error("Hesabınız askıya alınmıştır.");
}
```

Var olan `throw new Error(...)` kalıplarıyla (örn. "Şifre yanlış.") aynı stil — NextAuth `CredentialsProvider` bu hatayı login sayfasına mesaj olarak taşır, ek UI değişikliği gerekmez.

## 6. Kapsam Dışı (bilinçli kararlar)

- **Gerçek zamanlı oturum kesme:** `src/middleware.ts` Edge runtime'da çalışıyor ve şu an DB'ye dokunmuyor (sadece token varlığı kontrolü). Ban, yalnızca bir sonraki girişte etkili olur — zaten oturumu açık banlı kullanıcı JWT süresi (varsayılan NextAuth JWT session ömrü) dolana kadar erişime devam edebilir. Anlık kesme için Edge-uyumlu DB kontrolü veya kısaltılmış `session.maxAge` + periyodik `jwt` callback kontrolü gerekir — bu spec'in kapsamı dışında.
- **Şikayet/flag sistemi:** Kullanıcıların içerik/kullanıcı şikayet etmesi için yeni bir mekanizma bu spec'te yok.
- **Ban sebebi/notu:** Admin'in ban gerekçesi girmesi için alan eklenmiyor — mevcut UI boolean toggle üzerine kurulu, YAGNI.
- **Otomatik askı kaldırma / süreli ban:** Yok, yalnızca manuel aç/kapa.

## 7. Test Stratejisi

- `AdminUsers.test.tsx` (mevcut) — zaten `isBanned:true` PATCH bekliyor, backend tamamlanınca gerçek anlamda doğrulamış olacak; ek olarak askı kaldırma senaryosu.
- `src/app/api/admin/users/__tests__/route.test.ts` (yeni) — PATCH `isBanned` kabul ediyor mu, kendi hesabını banlama engelleniyor mu, ban sırasında aktif ilanların pasife düştüğü.
- `src/lib/auth.test.ts` veya ilgili auth test dosyası (yeni/mevcut) — banlı kullanıcının `authorize()` içinde reddedildiği, hata mesajının doğru olduğu.

## 8. Sonraki Adım

Bu spec onaylandıktan sonra `writing-plans` skill'i ile adım adım implementation planı oluşturulacak.
