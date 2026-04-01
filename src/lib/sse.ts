// In-memory SSE event bus (works for single Railway instance)
// For multi-instance scaling, replace with Redis pub/sub

type SSEController = ReadableStreamDefaultController<Uint8Array>;

const clients = new Set<SSEController>();

export function addSseClient(controller: SSEController) {
  clients.add(controller);
}

export function removeSseClient(controller: SSEController) {
  clients.delete(controller);
}

export function broadcastSseEvent(event: Record<string, unknown>) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  const encoded = new TextEncoder().encode(data);

  for (const controller of clients) {
    try {
      controller.enqueue(encoded);
    } catch {
      clients.delete(controller);
    }
  }
}
