import { readFileSync } from 'node:fs';
import { chromeAppProfile } from './args.ts';

// Minimal DevTools Protocol client for the dedicated instance (local only).
// Commands can address a page's own session (`Target.attachToTarget` with
// `flatten`) by passing its session ID.

export type TargetInfo = { targetId: string; type: string; url: string };
type Message = { id?: number; method?: string; sessionId?: string; params?: { targetInfo?: TargetInfo }; result?: unknown; error?: { message: string } };

export async function connectDevtools() {
  const [port, path] = readFileSync(`${chromeAppProfile()}/DevToolsActivePort`, 'utf8').trim().split('\n');
  const socket = new WebSocket(`ws://127.0.0.1:${port}${path}`);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let next = 0;
  const pending = new Map<number, (message: Message) => void>();
  const listeners: ((message: Message) => void)[] = [];
  socket.onmessage = event => {
    const message = JSON.parse(String(event.data)) as Message;
    if (message.id !== undefined) pending.get(message.id)?.(message);
    else listeners.forEach(listener => listener(message));
  };
  socket.onclose = () => {
    pending.forEach(settle => settle({ error: { message: 'DevTools connection closed.' } }));
    pending.clear();
  };
  const send = <T>(method: string, params: Record<string, unknown> = {}, sessionId?: string) => new Promise<T>((resolve, reject) => {
    const id = ++next;
    pending.set(id, message => { pending.delete(id); if (message.error) reject(new Error(message.error.message)); else resolve(message.result as T); });
    socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
  return { send, on: (listener: (message: Message) => void) => listeners.push(listener), close: () => socket.close() };
}

export type Devtools = Awaited<ReturnType<typeof connectDevtools>>;
