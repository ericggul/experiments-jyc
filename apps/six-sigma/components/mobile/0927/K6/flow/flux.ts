import { travelingEdge, type LineStyle } from "../edges/geometry.ts";
import type { Edge, Vertex, ConnectionWeights } from "../model/types";
export type Packet = {
  id: number;
  edgeId: string;
  from: Vertex;
  to: Vertex;
  start: number;
  length: number;
  duration: number;
  geometry: ReturnType<typeof travelingEdge>;
};

export const MAX_PACKETS = 48;
export const INITIAL_REST = 0.6;
export const BASE_RATE = 2.5;

export function createFlux(edges: readonly Edge[], seed: number, compact = false, lineStyle: LineStyle = "straight") {
  let randomState = seed >>> 0 || 1;
  const random = () => {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return ((randomState >>> 0) + 0.5) / 4294967296;
  };
  const speed = compact ? 72 : 104;
  const trailLength = compact ? 10 : 20;
  const nodeRadius = compact ? 1.8 : 2.5;
  let packets: Packet[] = [];
  let nextId = 0;
  let previousTime = 0;
  let motionTime = 0;
  let remainingHazard = -Math.log(random());
  let cachedWeights: ConnectionWeights | null = null;
  let weightedEdges: Edge[] = [];
  let cumulativeWeights: number[] = [];
  let totalWeight = 0;

  const clampWeight = (value: number) => Number.isFinite(value) ? Math.min(3, Math.max(0, value)) : 0;
  const normalizeWeights = (weights?: ConnectionWeights): ConnectionWeights => ({
    within: clampWeight(weights?.within ?? 1),
    between: clampWeight(weights?.between ?? 1),
  });

  function cacheDistribution(weights?: ConnectionWeights) {
    const next = normalizeWeights(weights);
    if (cachedWeights?.within === next.within && cachedWeights.between === next.between) return;
    cachedWeights = next;
    weightedEdges = [];
    cumulativeWeights = [];
    totalWeight = 0;
    for (const edge of edges) {
      // Basic K6 edges predate the scoped graph modes, so they remain in the
      // between group unless the caller explicitly classifies them.
      const weight = edge.scope === "within" ? next.within : next.between;
      if (weight <= 0) continue;
      totalWeight += weight;
      weightedEdges.push(edge);
      cumulativeWeights.push(totalWeight);
    }
  }

  function selectEdge() {
    if (totalWeight <= 0) return undefined;
    const target = random() * totalWeight;
    let low = 0;
    let high = cumulativeWeights.length - 1;
    while (low < high) {
      const middle = low + Math.floor((high - low) / 2);
      if (target < cumulativeWeights[middle]!) high = middle;
      else low = middle + 1;
    }
    return weightedEdges[low];
  }

  function advance(now: number, requestedRate: number, weights?: ConnectionWeights) {
    cacheDistribution(weights);
    const rate = Math.min(8, Math.max(0.5, requestedRate));
    // Keep active positions continuous when rate changes. Emissions scale
    // directly with rate; travel speed scales by its square root, so both
    // throughput and visible density increase instead of cancelling out.
    const speedMultiplier = Math.sqrt(rate / BASE_RATE);
    let remaining = Math.max(0, now - Math.max(previousTime, INITIAL_REST));
    previousTime = now;
    // Bound catch-up work after an unusually long scheduling gap.
    remaining = Math.min(remaining, 0.25);
    let attempts = 0;
    while (remainingHazard <= remaining * rate && attempts < 96) {
      const untilEvent = remainingHazard / rate;
      motionTime += untilEvent * speedMultiplier;
      remaining -= untilEvent;
      packets = packets.filter((packet) => motionTime < packet.start + packet.duration);
      const edge = selectEdge();
      const reverse = lineStyle !== "cubic-directional" && random() < 0.5;
      // Independent events may share an edge. The previous one-per-edge
      // gate silently discarded more events as the requested rate rose.
      if (edge && packets.length < MAX_PACKETS) {
        const from = reverse ? edge.to : edge.from;
        const to = reverse ? edge.from : edge.to;
        const geometry = travelingEdge(edge, lineStyle, reverse);
        const length = geometry.length;
        packets.push({
          id: nextId++, edgeId: edge.id, from, to, length, geometry,
          start: motionTime,
          duration: (length + trailLength) / speed + 0.16,
        });
      }
      remainingHazard = -Math.log(random());
      attempts++;
    }
    motionTime += remaining * speedMultiplier;
    remainingHazard = Math.max(Number.EPSILON, remainingHazard - remaining * rate);
    packets = packets.filter((packet) => motionTime < packet.start + packet.duration);
    return packets;
  }

  function sample(packet: Packet) {
    const age = Math.max(0, motionTime - packet.start);
    const distance = age * speed;
    const head = Math.min(packet.length, distance);
    const tail = Math.min(packet.length, Math.max(0, distance - trailLength));
    const arrival = Math.max(0, age - packet.length / speed);
    const receipt = Math.sin(Math.PI * Math.min(1, arrival / (trailLength / speed + 0.16)));
    return {
      head: packet.geometry.pointAt(head), tail: packet.geometry.pointAt(tail),
      trailPath: packet.geometry.segment(tail, head), to: packet.to,
      visible: head - tail > 0.05,
      receiptRadius: nodeRadius + 0.7 * receipt,
      receiving: receipt > 0.001,
      receiptOpacity: receipt * 0.65,
    };
  }

  return { advance, sample };
}
