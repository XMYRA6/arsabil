# ArsaBil Faz 3B-III — SSE Gerçek Zamanlı Mesajlaşma Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace polling in `/inbox` with Server-Sent Events (SSE) so new messages appear instantly without page refresh.

**Architecture:** `src/lib/sse.ts` holds an in-memory Map of userId → SSE controller. `GET /api/messages/sse` opens a persistent stream per user and sends initial conversation list on connect. `POST /api/messages` (existing) calls `notifyUser(receiverId, ...)` after saving. `/inbox` replaces its fetch-on-load with a single `EventSource` connection that updates state on events.

**Limitation:** In-memory SSE works for single-instance deployments. Multi-instance (horizontal scaling) would need Redis pub/sub — out of scope, noted in comments.

**Tech Stack:** Next.js 16 App Router, TypeScript, Node.js runtime (NOT Edge — Edge doesn't support persistent streams), `EventSource` browser API.

---

## File Map

| File | Action |
|------|--------|
| `src/lib/sse.ts` | New — SSE client registry |
| `src/app/api/messages/sse/route.ts` | New — SSE streaming endpoint |
| `src/app/api/messages/route.ts` | Modify — POST calls `notifyUser` |
| `src/app/inbox/page.tsx` | Modify — polling → SSE |

---

### Task 1: SSE client registry

**Files:**
- Create: `src/lib/sse.ts`

Simple in-memory Map. Exported functions: `addClient`, `removeClient`, `notifyUser`.

- [ ] **Step 1: Create `src/lib/sse.ts`**

```typescript
type SSEController = ReadableStreamDefaultController

// In-memory store: userId → open SSE stream controller
// For multi-instance deployments, replace with Redis pub/sub
const clients = new Map<string, SSEController>()

export function addClient(userId: string, controller: SSEController): void {
    clients.set(userId, controller)
}

export function removeClient(userId: string): void {
    clients.delete(userId)
}

export function notifyUser(userId: string, data: object): void {
    const controller = clients.get(userId)
    if (!controller) return
    try {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`)
    } catch {
        // Client disconnected — clean up
        clients.delete(userId)
    }
}
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Run tests**

```
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/sse.ts
git commit -m "feat: add SSE client registry (src/lib/sse.ts)"
```

---

### Task 2: GET /api/messages/sse — SSE streaming endpoint

**Files:**
- Create: `src/app/api/messages/sse/route.ts`

Opens a persistent SSE stream per authenticated user. On connect, sends the initial conversation list. Keeps connection alive with a comment-only heartbeat every 30s. Cleans up on disconnect.

**Context:**
- Auth: `getServerSession(authOptions)` from `'next-auth/next'`; `authOptions` from `'@/lib/auth'`
- Prisma: `prisma` from `'@/lib/prisma'`
- SSE: `addClient`, `removeClient` from `'@/lib/sse'`
- The conversation-building logic mirrors `GET /api/messages` (groups messages by other user, counts unread)
- `export const dynamic = 'force-dynamic'` prevents Next.js from caching this route
- Must use Node.js runtime (NOT Edge) for persistent streams

- [ ] **Step 1: Create `src/app/api/messages/sse/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addClient, removeClient } from '@/lib/sse'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return new Response('Unauthorized', { status: 401 })
    }
    const userId = session.user.id as string

    const stream = new ReadableStream({
        start(controller) {
            addClient(userId, controller)

            // Send initial conversation list on connect
            prisma.message.findMany({
                where: { OR: [{ senderId: userId }, { receiverId: userId }] },
                orderBy: { createdAt: 'desc' },
                include: {
                    sender:   { select: { id: true, name: true, image: true } },
                    receiver: { select: { id: true, name: true, image: true } },
                },
            }).then(messages => {
                const map = new Map<string, {
                    otherUser: { id: string; name: string | null; image: string | null }
                    lastMessage: string
                    lastMessageAt: string
                    unreadCount: number
                }>()

                for (const msg of messages) {
                    const otherUser = msg.senderId === userId ? msg.receiver : msg.sender
                    if (!map.has(otherUser.id)) {
                        map.set(otherUser.id, {
                            otherUser,
                            lastMessage: msg.content,
                            lastMessageAt: msg.createdAt.toISOString(),
                            unreadCount: 0,
                        })
                    }
                    if (msg.receiverId === userId && !msg.read) {
                        map.get(otherUser.id)!.unreadCount += 1
                    }
                }

                try {
                    controller.enqueue(
                        `data: ${JSON.stringify({ type: 'init', conversations: Array.from(map.values()) })}\n\n`
                    )
                } catch { /* client disconnected before init */ }
            }).catch(() => {})

            // Heartbeat to keep connection alive (comment lines don't trigger onmessage)
            const heartbeat = setInterval(() => {
                try {
                    controller.enqueue(': heartbeat\n\n')
                } catch {
                    clearInterval(heartbeat)
                }
            }, 30000)

            req.signal.addEventListener('abort', () => {
                clearInterval(heartbeat)
                removeClient(userId)
                try { controller.close() } catch { /* already closed */ }
            })
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type':  'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection':    'keep-alive',
        },
    })
}
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Run tests**

```
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/messages/sse/route.ts
git commit -m "feat: add GET /api/messages/sse Server-Sent Events endpoint"
```

---

### Task 3: Notify receiver via SSE when message is sent

**Files:**
- Modify: `src/app/api/messages/route.ts`

The existing `POST` handler creates a message and fires notifications/email. Add a `notifyUser` call so the receiver's open SSE stream gets the new message instantly.

- [ ] **Step 1: Read `src/app/api/messages/route.ts`**

Read the file. Find the POST handler. Note that `message` is created via `prisma.message.create` with `include: { sender: { select: { id, name, image } } }`.

- [ ] **Step 2: Add `notifyUser` import**

Add to existing imports at the top:
```typescript
import { notifyUser } from '@/lib/sse'
```

- [ ] **Step 3: Add `notifyUser` call after message creation**

Find this block in the POST handler:
```typescript
// Alıcıya bildirim oluştur (hata olursa sessizce geç)
createNotification({
```

Add the `notifyUser` call BEFORE this block:

```typescript
// Push new message to receiver's open SSE stream (fire-and-forget)
notifyUser(receiverId, {
    type: 'new_message',
    message: {
        id:         message.id,
        content:    message.content,
        senderId:   message.senderId,
        receiverId: message.receiverId,
        createdAt:  message.createdAt.toISOString(),
        read:       false,
        reportId:   message.reportId,
        sender:     message.sender,
    },
})

// Alıcıya bildirim oluştur (hata olursa sessizce geç)
createNotification({
```

- [ ] **Step 4: TypeScript check**

```
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Run tests**

```
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/messages/route.ts
git commit -m "feat: push new_message SSE event to receiver on message send"
```

---

### Task 4: Inbox — replace polling with SSE

**Files:**
- Modify: `src/app/inbox/page.tsx`

Replace the initial `loadConversations()` useEffect with an `EventSource` connection. The SSE `init` event provides the conversation list; `new_message` events update it in real time.

**Key pattern:** Use a `useRef` for `activeOtherId` inside the SSE handler to avoid reconnecting on every conversation switch.

- [ ] **Step 1: Read `src/app/inbox/page.tsx`**

Read the full file to understand the existing state and effects.

- [ ] **Step 2: Add `activeOtherIdRef`**

Find:
```typescript
const bottomRef = useRef<HTMLDivElement>(null)
const textareaRef = useRef<HTMLTextAreaElement>(null)
```

Add after them:
```typescript
const activeOtherIdRef = useRef<string | null>(null)
```

- [ ] **Step 3: Keep ref in sync with state**

Find the existing `loadConversations` useEffect block. Add a new useEffect AFTER the existing ones to sync the ref:

```typescript
useEffect(() => {
    activeOtherIdRef.current = activeOtherId
}, [activeOtherId])
```

- [ ] **Step 4: Replace the conversations polling useEffect with SSE**

Find and REMOVE this useEffect (the one that called `loadConversations` on mount):
```typescript
useEffect(() => {
    if (status === 'authenticated') loadConversations()
}, [status, loadConversations])
```

Replace it with the SSE effect:

```typescript
useEffect(() => {
    if (status !== 'authenticated') return

    const es = new EventSource('/api/messages/sse')

    es.onmessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data as string)

        if (data.type === 'init') {
            setConversations(data.conversations)
            return
        }

        if (data.type === 'new_message') {
            const msg = data.message as {
                id: string; content: string; senderId: string; receiverId: string
                createdAt: string; read: boolean; reportId: string | null
                sender: { id: string; name: string | null; image: string | null }
            }
            const otherId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId

            // Update conversation list
            setConversations(prev => {
                const exists = prev.some(c => c.otherUser.id === otherId)
                if (exists) {
                    return prev.map(c =>
                        c.otherUser.id === otherId
                            ? {
                                ...c,
                                lastMessage:    msg.content,
                                lastMessageAt:  msg.createdAt,
                                unreadCount:
                                    msg.senderId !== currentUserId &&
                                    activeOtherIdRef.current !== otherId
                                        ? c.unreadCount + 1
                                        : c.unreadCount,
                            }
                            : c
                    )
                }
                // New conversation — add it with the sender info
                return [
                    {
                        otherUser:      msg.sender,
                        lastMessage:    msg.content,
                        lastMessageAt:  msg.createdAt,
                        unreadCount:    msg.senderId !== currentUserId ? 1 : 0,
                    },
                    ...prev,
                ]
            })

            // If viewing this conversation, append message to chat
            if (
                activeOtherIdRef.current === msg.senderId ||
                activeOtherIdRef.current === msg.receiverId
            ) {
                setMessages(prev => [...prev, msg])
            }
        }
    }

    es.onerror = () => {
        // EventSource auto-reconnects — no action needed
    }

    return () => es.close()
}, [status, currentUserId])
```

- [ ] **Step 5: Remove the now-unused `loadConversations` callback and its import**

Find:
```typescript
const loadConversations = useCallback(async () => {
    const res = await fetch('/api/messages')
    const data = await res.json()
    if (data.conversations) setConversations(data.conversations)
}, [])
```

Delete it. Also remove `useCallback` from the React import if it's no longer used elsewhere in the file (check `loadMessages` — it still uses `useCallback`, so keep it).

- [ ] **Step 6: TypeScript check**

```
npx tsc --noEmit
```

Expected: zero errors. If `currentUserId` causes a type issue (it may be `string | undefined`), the SSE effect checks `status !== 'authenticated'` which guarantees session is loaded — add `if (!currentUserId) return` at the top of the SSE effect as a guard.

- [ ] **Step 7: Run tests**

```
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/app/inbox/page.tsx
git commit -m "feat: replace inbox polling with SSE for real-time messaging"
```
