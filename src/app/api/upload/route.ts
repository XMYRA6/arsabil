import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { v2 as cloudinary } from 'cloudinary'
import { isAllowedMimeType, isWithinSizeLimit } from '@/lib/upload'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = checkRateLimit(`upload:${session.user.id}`, RATE_LIMITS.UPLOAD)
    if (!rl.ok) {
        return NextResponse.json(
            { error: 'Yükleme limiti aşıldı. Lütfen daha sonra tekrar deneyin.' },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } }
        )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const listingId = formData.get('listingId') as string | null

    if (!file)      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })
    if (!listingId) return NextResponse.json({ error: 'listingId zorunlu' }, { status: 400 })

    if (!isAllowedMimeType(file.type)) {
        return NextResponse.json({ error: 'Sadece JPG, PNG veya WebP yüklenebilir' }, { status: 400 })
    }
    if (!isWithinSizeLimit(file.size)) {
        return NextResponse.json({ error: 'Dosya 5MB limitini aşıyor' }, { status: 400 })
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`
        const result = await cloudinary.uploader.upload(dataUri, {
            folder: 'arsabil/listings',
            public_id: `${listingId}/${crypto.randomUUID()}`,
            overwrite: false,
        })
        return NextResponse.json({ url: result.secure_url, publicId: result.public_id }, { status: 201 })
    } catch {
        return NextResponse.json({ error: 'Yükleme başarısız oldu.' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { publicId } = await req.json()
        if (!publicId) {
            return NextResponse.json({ error: 'publicId zorunlu' }, { status: 400 })
        }
        await cloudinary.uploader.destroy(publicId)
        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ error: 'Silme başarısız oldu.' }, { status: 500 })
    }
}
