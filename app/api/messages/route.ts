import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const currentUserId = searchParams.get('currentUserId') || 'u5'
  const chatUserId = searchParams.get('chatUserId')

  try {
    if (chatUserId) {
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: chatUserId, recipientId: currentUserId },
            { senderId: currentUserId, recipientId: chatUserId }
          ]
        },
        orderBy: { createdAt: 'asc' },
        include: { sender: true, recipient: true }
      })
      return NextResponse.json(messages)
    }

    if (userId) {
      const messages = await prisma.message.findMany({
        where: { OR: [{ senderId: userId }, { recipientId: userId }] },
        orderBy: { createdAt: 'asc' },
        include: { sender: true, recipient: true }
      })
      return NextResponse.json(messages)
    }

    const messages = await prisma.message.findMany({
      orderBy: { createdAt: 'desc' },
      include: { sender: true, recipient: true },
      take: 200
    })
    return NextResponse.json(messages)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { content, senderId, recipientId } = await req.json()
    if (!content || !senderId || !recipientId) {
      return NextResponse.json({ error: 'content, senderId, recipientId required' }, { status: 400 })
    }
    const message = await prisma.message.create({
      data: { content, senderId, recipientId },
      include: { sender: true, recipient: true }
    })
    return NextResponse.json(message, { status: 201 })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { messageId, read } = await req.json()
    const updated = await prisma.message.update({ where: { id: messageId }, data: { read } })
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
