import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id as string

    try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Geçersiz dosya tipi. JPEG, PNG veya WebP yükleyin.' }, { status: 400 })
        }

        const maxSize = 2 * 1024 * 1024 // 2MB
        if (file.size > maxSize) {
            return NextResponse.json({ error: 'Dosya 2MB\'dan büyük olamaz.' }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`

        const result = await cloudinary.uploader.upload(dataUri, {
            folder: 'arsabil/avatars',
            public_id: `user_${userId}`,
            overwrite: true,
        })

        await prisma.user.update({
            where: { id: userId },
            data: { image: result.secure_url },
        })

        return NextResponse.json({ imageUrl: result.secure_url })
    } catch {
        return NextResponse.json({ error: 'Yükleme başarısız oldu.' }, { status: 500 })
    }
}
