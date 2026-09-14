const id = "camera-monolith";
const variantId = "default";
const room = `experiment:${id}:${variantId}`;
const cameraRoom = `${room}:webrtc`;
const clients = new Map();
const state = { publishers: new Set(), viewers: new Set() };

const events = Object.freeze({
  join: "camera-monolith:join",
  hello: "camera-monolith:hello",
  presence: "camera-monolith:presence",
  publish: "camera-monolith:publish",
  unpublish: "camera-monolith:unpublish",
  viewerReady: "camera-monolith:viewer:ready",
  viewerLeave: "camera-monolith:viewer:leave",
  publisherLeave: "camera-monolith:publisher:leave",
  offer: "camera-monolith:webrtc:offer",
  answer: "camera-monolith:webrtc:answer",
  ice: "camera-monolith:webrtc:ice",
});

function getPresence(io, serverTime = Date.now()) {
  const sockets = [...io.sockets.sockets.values()].filter((socket) =>
    socket.rooms.has(room),
  );
  return {
    experimentId: id,
    variantId,
    total: sockets.length,
    mobiles: sockets.filter((socket) => socket.data[id]?.role === "mobile").length,
    screens: sockets.filter((socket) => socket.data[id]?.role === "screen").length,
    serverTime,
  };
}

function broadcastPresence(io) {
  io.to(room).emit(events.presence, getPresence(io));
}

function isPublisherToViewer(signalingState, publisherId, viewerId) {
  return (
    signalingState.publishers.has(publisherId) &&
    signalingState.viewers.has(viewerId)
  );
}

export function registerCameraMonolithSignaling({
  io,
  socket,
  signalingState,
}) {
  function removePublisher(publisherId) {
    if (!signalingState.publishers.delete(publisherId)) return;
    for (const viewerId of signalingState.viewers) {
      io.to(viewerId).emit(events.publisherLeave, { publisherId });
    }
  }

  function removeViewer(viewerId) {
    if (!signalingState.viewers.delete(viewerId)) return;
    for (const publisherId of signalingState.publishers) {
      io.to(publisherId).emit(events.viewerLeave, { viewerId });
    }
  }

  socket.on(events.publish, () => {
    if (socket.data[id]?.role !== "mobile") return;
    signalingState.publishers.add(socket.id);
    socket.join(cameraRoom);
    for (const viewerId of signalingState.viewers) {
      io.to(socket.id).emit(events.viewerReady, { viewerId });
    }
  });

  socket.on(events.unpublish, () => removePublisher(socket.id));

  socket.on(events.viewerReady, () => {
    if (socket.data[id]?.role !== "screen") return;
    signalingState.viewers.add(socket.id);
    socket.join(cameraRoom);
    for (const publisherId of signalingState.publishers) {
      io.to(publisherId).emit(events.viewerReady, { viewerId: socket.id });
    }
  });

  socket.on(events.viewerLeave, () => removeViewer(socket.id));

  socket.on(events.offer, ({ targetId, description } = {}) => {
    if (
      !isPublisherToViewer(signalingState, socket.id, targetId) ||
      description?.type !== "offer"
    ) {
      return;
    }
    io.to(targetId).emit(events.offer, { fromId: socket.id, description });
  });

  socket.on(events.answer, ({ targetId, description } = {}) => {
    if (
      !isPublisherToViewer(signalingState, targetId, socket.id) ||
      description?.type !== "answer"
    ) {
      return;
    }
    io.to(targetId).emit(events.answer, { fromId: socket.id, description });
  });

  socket.on(events.ice, ({ targetId, candidate } = {}) => {
    const valid =
      isPublisherToViewer(signalingState, socket.id, targetId) ||
      isPublisherToViewer(signalingState, targetId, socket.id);
    if (!valid || !candidate) return;
    io.to(targetId).emit(events.ice, { fromId: socket.id, candidate });
  });

  socket.on("disconnect", () => {
    removePublisher(socket.id);
    removeViewer(socket.id);
  });
}

function register({ io, socket }) {
  registerCameraMonolithSignaling({ io, socket, signalingState: state });

  socket.on(events.join, ({ role, experimentSlug } = {}) => {
    if (experimentSlug !== variantId) return;
    const normalizedRole = role === "mobile" || role === "screen" ? role : "unknown";
    socket.data[id] = { role: normalizedRole };
    clients.set(socket.id, { connectedAt: Date.now() });
    socket.join(room);
    socket.emit(events.hello, {
      socketId: socket.id,
      presence: getPresence(io),
    });
    broadcastPresence(io);
  });

  socket.on("disconnect", () => {
    clients.delete(socket.id);
    if (socket.data[id]) broadcastPresence(io);
  });
}

export const cameraMonolithExperiment = { id, events, register };
