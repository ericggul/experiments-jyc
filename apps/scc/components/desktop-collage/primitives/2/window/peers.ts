import type { Rect } from '../model/field';

// Every window announces where it is on the desktop; together they hold one
// field. Same-origin windows share a BroadcastChannel, so no server is in the
// loop. A window that stops announcing is forgotten after a short silence.

export type Peer = { id: number; color: string; /** The core's colour: the entangled partner's. */ partner: string; /** Page area. */ content: Rect; /** Whole window including its title bar. */ outer: Rect; seen: number };
type Message = { type: 'state'; peer: Omit<Peer, 'seen'> } | { type: 'hello' } | { type: 'bye'; id: number };

const SILENCE_MS = 1500;
const HEARTBEAT_MS = 400;

/** This window's page area and frame, in desktop coordinates. */
export function readOwnRects(): { content: Rect; outer: Rect } {
  const chrome = window.outerHeight - window.innerHeight;
  return {
    content: { x: window.screenX, y: window.screenY + chrome, width: window.innerWidth, height: window.innerHeight },
    outer: { x: window.screenX, y: window.screenY, width: window.outerWidth, height: window.outerHeight },
  };
}

const same = (a: Rect, b: Rect) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

export function createPeers(channelName: string, self: { id: number; color: string; partner: string }) {
  const peers = new Map<number, Peer>();
  const listeners = new Set<() => void>();
  // Opened per mount (connect) and closed on unmount (disconnect), so a
  // remount in development StrictMode never reuses a closed channel.
  let channel: BroadcastChannel | null = null;
  let ids: number[] = [];
  let lastSent = 0;
  let dirty = true;

  const emit = () => {
    const next = [...peers.keys()].sort((a, b) => a - b);
    if (next.join() !== ids.join()) { ids = next; listeners.forEach(listener => listener()); }
  };
  const post = (message: Message) => channel?.postMessage(message);
  const own = () => peers.get(self.id);

  const receive = ({ data }: MessageEvent<Message>) => {
    if (data.type === 'hello') { const me = own(); if (me) post({ type: 'state', peer: { id: me.id, color: me.color, partner: me.partner, content: me.content, outer: me.outer } }); return; }
    if (data.type === 'bye') { peers.delete(data.id); dirty = true; emit(); return; }
    const previous = peers.get(data.peer.id);
    if (!previous || !same(previous.content, data.peer.content)) dirty = true;
    peers.set(data.peer.id, { ...data.peer, seen: performance.now() });
    emit();
  };

  return {
    /** Re-reads this window's position; announces it when it moved or the heartbeat is due. */
    tick(now: number) {
      const rects = readOwnRects();
      const me = own();
      const moved = !me || !same(me.content, rects.content) || !same(me.outer, rects.outer);
      peers.set(self.id, { ...self, ...rects, seen: now });
      if (moved) dirty = true;
      if (moved || now - lastSent > HEARTBEAT_MS) { post({ type: 'state', peer: { ...self, ...rects } }); lastSent = now; }
      for (const [id, peer] of peers) if (id !== self.id && now - peer.seen > SILENCE_MS) { peers.delete(id); dirty = true; }
      emit();
    },
    /** Joins the field and asks the other windows to announce themselves. */
    connect() {
      if (channel) return;
      channel = new BroadcastChannel(channelName);
      channel.onmessage = receive;
      post({ type: 'hello' });
    },
    /** Leaves the field; the others forget this window at once. */
    disconnect() {
      if (!channel) return;
      post({ type: 'bye', id: self.id });
      channel.close();
      channel = null;
    },
    get: (id: number) => peers.get(id),
    /** True once after any position or membership change. */
    takeDirty() { const was = dirty; dirty = false; return was; },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getIds: () => ids,
  };
}

export type Peers = ReturnType<typeof createPeers>;
