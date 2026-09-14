const id = "dj-2";
const experimentId = "dj";
const variantId = "2";
const room = `experiment:${experimentId}:${variantId}`;
const clients = new Map();

const events = Object.freeze({
  join: "dj:2:join",
  hello: "dj:2:hello",
  presence: "dj:2:presence",
  clock: "dj:2:clock",
  channels: "dj:2:channels",
  command: "dj:2:command",
  state: "dj:2:state",
});

let transport = {
  status: "stopped",
  position: 0,
  startedAt: null,
  trackId: null,
  revision: 0,
};

function clampPosition(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(value, 0);
}

function positionAt(state, serverTime) {
  if (state.status !== "playing" || state.startedAt === null) {
    return state.position;
  }

  const elapsed = Math.max(0, serverTime - state.startedAt) / 1000;
  return state.position + elapsed;
}

function stateAt(serverTime = Date.now()) {
  return { ...transport, serverTime };
}

function getPresence(io, serverTime = Date.now()) {
  const sockets = [...io.sockets.sockets.values()].filter((socket) =>
    socket.rooms.has(room),
  );

  return {
    experimentId,
    variantId,
    total: sockets.length,
    controllers: sockets.filter(
      (socket) => socket.data[id]?.role === "controller",
    ).length,
    screens: sockets.filter((socket) => socket.data[id]?.role === "screen")
      .length,
    channels: [
      ...new Set(
        sockets
      .filter((socket) => socket.data[id]?.role === "screen")
          .flatMap((socket) => socket.data[id]?.channels ?? []),
      ),
    ],
    serverTime,
  };
}

function broadcastPresence(io) {
  io.to(room).emit(events.presence, getPresence(io));
}

function applyCommand(payload, serverTime) {
  const action = payload?.action;

  if (action === "play") {
    const position =
      transport.status === "playing"
        ? positionAt(transport, serverTime)
        : clampPosition(payload.position ?? transport.position);

    transport = {
      status: "playing",
      position,
      startedAt: serverTime + 1200,
      trackId:
        typeof payload.trackId === "string" ? payload.trackId : transport.trackId,
      revision: transport.revision + 1,
    };
    return true;
  }

  if (action === "pause") {
    transport = {
      status: "paused",
      position: positionAt(transport, serverTime),
      startedAt: null,
      trackId: transport.trackId,
      revision: transport.revision + 1,
    };
    return true;
  }

  if (action === "restart") {
    transport = {
      status: "playing",
      position: 0,
      startedAt: serverTime + 1200,
      trackId:
        typeof payload.trackId === "string" ? payload.trackId : transport.trackId,
      revision: transport.revision + 1,
    };
    return true;
  }

  return false;
}

function register({ io, socket }) {
  socket.on(events.clock, (acknowledge) => {
    if (typeof acknowledge === "function") acknowledge(Date.now());
  });

  socket.on(events.join, ({ role, experimentSlug, channels } = {}) => {
    if (experimentSlug !== variantId) return;

    socket.data[id] = {
      role: role === "controller" || role === "screen" ? role : "unknown",
      channels: Array.isArray(channels)
        ? channels.filter((channel) => typeof channel === "string")
        : [],
    };
    clients.set(socket.id, { connectedAt: Date.now() });
    socket.join(room);

    const serverTime = Date.now();
    socket.emit(events.hello, {
      socketId: socket.id,
      presence: getPresence(io, serverTime),
      transport: stateAt(serverTime),
    });
    broadcastPresence(io);
  });

  socket.on(events.channels, (channels = []) => {
    if (!socket.rooms.has(room)) return;
    if (socket.data[id]?.role !== "screen") return;
    socket.data[id].channels = Array.isArray(channels)
      ? channels.filter((channel) => typeof channel === "string")
      : [];
    broadcastPresence(io);
  });

  socket.on(events.command, (payload = {}) => {
    if (!socket.rooms.has(room)) return;
    if (socket.data[id]?.role !== "controller") return;

    const serverTime = Date.now();
    if (!applyCommand(payload, serverTime)) return;
    io.to(room).emit(events.state, stateAt(serverTime));
  });

  socket.on("disconnect", () => {
    clients.delete(socket.id);
    if (socket.data[id]) broadcastPresence(io);
  });
}

export const djTwoExperiment = {
  id,
  events,
  register,
};

export const djTwoModel = {
  applyCommand,
  clampPosition,
  positionAt,
  stateAt,
};
