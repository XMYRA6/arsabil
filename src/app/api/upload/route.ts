import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { isAllowedMimeType, isWithinSizeLimit, mimeToExtension } from '@/lib/upload'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    const ext = mimeToExtension(file.type)
    const fileName = `${crypto.randomUUID()}.${ext}`
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'listings', listingId)

    await mkdir(uploadDir, { recursive: true })
    const bytes = await file.arrayBuffer()
    await writeFile(join(uploadDir, fileName), Buffer.from(bytes))

    return NextResponse.json({ url: `/uploads/listings/${listingId}/${fileName}` }, { status: 201 })
}
