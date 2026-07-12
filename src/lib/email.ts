import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(params: {
    to: string
    subject: string
    html: string
}): Promise<void> {
    await resend.emails.send({
        from: 'ArsaBil <noreply@arsabil.com>',
        to: params.to,
        subject: params.subject,
        html: params.html,
    })
}

export async function getEmailPrefs(userId: string): Promise<{
    mesaj: boolean
    teklif: boolean
    ilan: boolean
}> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { emailPrefs: true },
    })
    try {
        const parsed = JSON.parse(user?.emailPrefs ?? '{}')
        return {
            mesaj: parsed.mesaj ?? true,
            teklif: parsed.teklif ?? true,
            ilan: parsed.ilan ?? true,
        }
    } catch {
        return { mesaj: true, teklif: true, ilan: true }
    }
}

export function buildMessageEmail(senderName: string): string {
    return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#1f6feb">Yeni Mesajınız Var</h2>
        <p><strong>${senderName}</strong> size bir mesaj gönderdi.</p>
        <a href="https://arsabil.com/inbox" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#1f6feb;color:white;text-decoration:none;border-radius:8px;font-weight:700">Mesajı Görüntüle →</a>
        <p style="margin-top:24px;font-size:0.8rem;color:#6b7280">Bu bildirimi almak istemiyorsanız profil ayarlarınızdan e-posta tercihlerinizi güncelleyebilirsiniz.</p>
    </div>`
}

export function buildOfferEmail(listingTitle: string, share: number): string {
    return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#10b981">Yeni Teklif Geldi!</h2>
        <p>"<strong>${listingTitle}</strong>" ilanınıza <strong>%${share}</strong> arsa payı teklifi geldi.</p>
        <a href="https://arsabil.com/dashboard" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:700">Teklifleri Görüntüle →</a>
        <p style="margin-top:24px;font-size:0.8rem;color:#6b7280">Bu bildirimi almak istemiyorsanız profil ayarlarınızdan e-posta tercihlerinizi güncelleyebilirsiniz.</p>
    </div>`
}

export function buildApprovalEmail(listingTitle: string): string {
    return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#10b981">İlanınız Onaylandı!</h2>
        <p>"<strong>${listingTitle}</strong>" ilanınız yönetici tarafından onaylandı ve pazar yerine eklendi.</p>
        <a href="https://arsabil.com/marketplace" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#1f6feb;color:white;text-decoration:none;border-radius:8px;font-weight:700">Pazar Yerini Görüntüle →</a>
        <p style="margin-top:24px;font-size:0.8rem;color:#6b7280">Bu bildirimi almak istemiyorsanız profil ayarlarınızdan e-posta tercihlerinizi güncelleyebilirsiniz.</p>
    </div>`
}

export function buildRejectionEmail(listingTitle: string | null): string {
    const title = listingTitle ?? 'İlanınız'
    return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#ef4444">❌ İlan Onaylanmadı</h2>
        <p>"<strong>${title}</strong>" başlıklı ilanınız incelendi ve onaylanmadı.</p>
        <p style="color:#666;font-size:0.9rem">
            Daha fazla bilgi için destek ekibimizle iletişime geçebilirsiniz.
        </p>
        <a href="https://arsabil.com/dashboard"
           style="display:inline-block;margin-top:16px;padding:10px 20px;background:#6366f1;color:white;border-radius:8px;text-decoration:none">
            Dashboard'a Git
        </a>
    </div>`
}

export function buildPasswordResetEmail(resetUrl: string): string {
    return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#1f6feb">Şifre Sıfırlama Talebi</h2>
        <p>Hesabınız için bir şifre sıfırlama talebi aldık. Aşağıdaki bağlantıya tıklayarak yeni bir şifre belirleyebilirsiniz.</p>
        <a href="${resetUrl}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#1f6feb;color:white;text-decoration:none;border-radius:8px;font-weight:700">Şifremi Sıfırla →</a>
        <p style="margin-top:24px;font-size:0.8rem;color:#6b7280">Bu talebi siz oluşturmadıysanız bu e-postayı yok sayabilirsiniz — hesabınızda hiçbir değişiklik yapılmayacaktır. Bağlantı 1 saat sonra geçersiz olur.</p>
    </div>`
}

export function buildEmailVerificationEmail(verifyUrl: string): string {
    return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#1f6feb">ArsaBil'e Hoş Geldiniz</h2>
        <p>Hesabınızı doğrulamak için aşağıdaki bağlantıya tıklayın.</p>
        <a href="${verifyUrl}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#1f6feb;color:white;text-decoration:none;border-radius:8px;font-weight:700">E-postamı Doğrula →</a>
        <p style="margin-top:24px;font-size:0.8rem;color:#6b7280">Doğrulama isteğe bağlıdır — hesabınızı doğrulamadan da kullanmaya devam edebilirsiniz. Bağlantı 24 saat sonra geçersiz olur.</p>
    </div>`
}
