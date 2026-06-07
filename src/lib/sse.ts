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
