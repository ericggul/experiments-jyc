import assert from "node:assert/strict";
import test from "node:test";
import {
  cameraMonolithExperiment,
  registerCameraMonolithSignaling,
} from "./index.mjs";

const { events } = cameraMonolithExperiment;

function createIo() {
  const targeted = [];
  return {
    targeted,
    to(targetId) {
      return {
        emit(event, payload) {
          targeted.push({ targetId, event, payload });
        },
      };
    },
  };
}

function createSocket(id, role) {
  const handlers = new Map();
  return {
    id,
    data: { "camera-monolith": { role } },
    joined: [],
    join(joinedRoom) {
      this.joined.push(joinedRoom);
    },
    on(event, handler) {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
    },
    trigger(event, payload) {
      for (const handler of handlers.get(event) ?? []) handler(payload);
    },
  };
}

function setup() {
  const io = createIo();
  const signalingState = { publishers: new Set(), viewers: new Set() };
  const publisher = createSocket("publisher", "mobile");
  const viewer = createSocket("viewer", "screen");
  const stranger = createSocket("stranger", "mobile");
  for (const socket of [publisher, viewer, stranger]) {
    registerCameraMonolithSignaling({ io, socket, signalingState });
  }
  return { io, publisher, signalingState, stranger, viewer };
}

test("announces an active mobile publisher to a ready SCC screen", () => {
  const { io, publisher, signalingState, viewer } = setup();
  viewer.trigger(events.viewerReady);
  publisher.trigger(events.publish);
  assert.deepEqual([...signalingState.publishers], [publisher.id]);
  assert.deepEqual([...signalingState.viewers], [viewer.id]);
  assert.deepEqual(io.targeted.at(-1), {
    targetId: publisher.id,
    event: events.viewerReady,
    payload: { viewerId: viewer.id },
  });
});

test("relays WebRTC messages only for an active publisher-viewer pair", () => {
  const { io, publisher, stranger, viewer } = setup();
  viewer.trigger(events.viewerReady);
  publisher.trigger(events.publish);
  stranger.trigger(events.offer, {
    targetId: viewer.id,
    description: { type: "offer", sdp: "blocked" },
  });
  publisher.trigger(events.offer, {
    targetId: viewer.id,
    description: { type: "offer", sdp: "allowed" },
  });
  viewer.trigger(events.answer, {
    targetId: publisher.id,
    description: { type: "answer", sdp: "allowed" },
  });
  viewer.trigger(events.ice, {
    targetId: publisher.id,
    candidate: { candidate: "allowed" },
  });
  assert.deepEqual(
    io.targeted.slice(-3).map(({ targetId, event }) => ({ targetId, event })),
    [
      { targetId: viewer.id, event: events.offer },
      { targetId: publisher.id, event: events.answer },
      { targetId: publisher.id, event: events.ice },
    ],
  );
});

test("publisher disconnect removes the stream from every ready screen", () => {
  const { io, publisher, signalingState, viewer } = setup();
  viewer.trigger(events.viewerReady);
  publisher.trigger(events.publish);
  publisher.trigger("disconnect");
  assert.equal(signalingState.publishers.size, 0);
  assert.ok(
    io.targeted.some(
      ({ event, payload, targetId }) =>
        targetId === viewer.id &&
        event === events.publisherLeave &&
        payload.publisherId === publisher.id,
    ),
  );
});
