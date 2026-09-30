/**
 * Offline receiver (?feed=sim). Synthesises the traffic a ground station near the
 * receiver position would hear — overflights at cruise level, arrivals descending on
 * a three-degree path into nearby airports and departures climbing out — and emits
 * each aircraft's messages at its own irregular interval, like the live receiver.
 * The status row names the source "sim" so nothing implies a live feed.
 */

import { LATLONMULT } from "../config";
import type { ReceiverMessage } from "../model/aircraft";
import type { Receiver, ReceiverState } from "./types";

const RADIUS_KM = 170;
const POPULATION = 38;
const STEP_MS = 200;
const TURN_RATE = 3;
const DEG = Math.PI / 180;
const AIRLINES = ["KAL", "AAR", "JNA", "TWB", "JJA", "ABL", "ASV", "EOK", "CPA", "ANA", "JAL", "CES", "CSN", "SIA", "UAL", "DLH", "AFR", "BAW", "FDX", "UPS"];

type Point = { lat: number; lon: number };

type SimulatedAircraft = {
  addr: string;
  flight: string;
  lat: number;
  lon: number;
  altitude: number;
  cruise: number;
  speed: number;
  track: number;
  verticalRate: number;
  mode: "overflight" | "arrival" | "departure";
  destination: Point;
  nextMessage: number;
  messages: number;
  done: boolean;
};

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SimulatedReceiver implements Receiver {
  readonly state: ReceiverState = { connected: true, source: "sim" };
  private readonly random = mulberry32(1090);
  private readonly center: Point;
  private aircraft: SimulatedAircraft[] = [];
  private clock: number | null = null;
  private startedAt: number | null = null;
  private populated = false;
  private active = true;

  constructor(lat: number, lon: number, private readonly airports: () => Point[]) {
    this.center = { lat, lon };
  }

  setArea() {
    // The simulated station stays at the receiver position, as a real antenna would.
  }

  setActive(active: boolean) {
    this.active = active;
  }

  dispose() {
    this.aircraft = [];
  }

  private offset(from: Point, bearing: number, km: number): Point {
    const lat = from.lat + (km * Math.cos(bearing * DEG)) / LATLONMULT;
    return { lat, lon: from.lon + (km * Math.sin(bearing * DEG)) / (LATLONMULT * Math.cos(((lat + from.lat) / 2) * DEG)) };
  }

  private geometry(from: Point, to: Point) {
    const east = (to.lon - from.lon) * LATLONMULT * Math.cos(((to.lat + from.lat) / 2) * DEG);
    const north = (to.lat - from.lat) * LATLONMULT;
    return { distance: Math.hypot(east, north), bearing: ((Math.atan2(east, north) / DEG) + 360) % 360 };
  }

  private nearbyAirports() {
    return this.airports().filter((airport) => this.geometry(this.center, airport).distance < RADIUS_KM * 0.8);
  }

  private spawn(now: number, initial: boolean) {
    const r = this.random;
    const airports = this.nearbyAirports();
    const roll = r();
    const mode: SimulatedAircraft["mode"] = !airports.length || roll < 0.4 ? "overflight" : roll < 0.7 ? "arrival" : "departure";
    const airport = airports[Math.floor(r() * airports.length)];
    const edgeBearing = r() * 360;
    const edge = this.offset(this.center, edgeBearing, RADIUS_KM * (initial ? 0.3 + 0.7 * r() : 1));
    const farEdge = this.offset(this.center, edgeBearing + 180 + (r() - 0.5) * 80, RADIUS_KM * 1.2);

    let start: Point = edge;
    let destination: Point = farEdge;
    let altitude = 28000 + Math.round(r() * 11) * 1000;
    let speed = 430 + r() * 60;
    let cruise = altitude;

    if (mode === "arrival" && airport) {
      destination = airport;
      const distance = this.geometry(edge, airport).distance;
      altitude = Math.min(16000, Math.round(distance * 172));
      speed = 250;
    } else if (mode === "departure" && airport) {
      start = initial ? this.offset(airport, r() * 360, r() * 60) : airport;
      destination = this.offset(this.center, r() * 360, RADIUS_KM * 1.2);
      cruise = 24000 + Math.round(r() * 13) * 1000;
      altitude = initial ? Math.min(cruise, this.geometry(airport, start).distance * 400) : 0;
      speed = altitude > 10000 ? 300 : 160;
    }

    this.aircraft.push({
      addr: Math.floor(r() * 0xffffff).toString(16).padStart(6, "0"),
      flight: `${AIRLINES[Math.floor(r() * AIRLINES.length)]}${1 + Math.floor(r() * (r() < 0.5 ? 999 : 9999))}`,
      ...start,
      altitude,
      cruise,
      speed,
      track: this.geometry(start, destination).bearing,
      verticalRate: 0,
      mode,
      destination,
      nextMessage: now + r() * 1500,
      messages: Math.floor(r() * 4000),
      done: false,
    });
  }

  private advance(craft: SimulatedAircraft, dt: number) {
    const { distance, bearing } = this.geometry(craft, craft.destination);
    let turn = ((bearing - craft.track + 540) % 360) - 180;
    turn = Math.max(-TURN_RATE * dt, Math.min(TURN_RATE * dt, turn));
    craft.track = (craft.track + turn + 360) % 360;

    const previousAltitude = craft.altitude;
    if (craft.mode === "arrival") {
      craft.altitude = Math.max(0, Math.min(craft.altitude, distance * 172));
      craft.speed += ((craft.altitude > 10000 ? 250 : 140 + craft.altitude / 100) - craft.speed) * 0.05 * dt;
      if (distance < 0.8) craft.done = true;
    } else if (craft.mode === "departure") {
      craft.altitude = Math.min(craft.cruise, craft.altitude + (2600 / 60) * dt);
      craft.speed += ((craft.altitude < 10000 ? 250 : 440) - craft.speed) * 0.03 * dt;
    }
    craft.verticalRate = Math.round(((craft.altitude - previousAltitude) / dt) * 60);

    const next = this.offset(craft, craft.track, (craft.speed * 1.852 * dt) / 3600);
    craft.lat = next.lat;
    craft.lon = next.lon;
    if (craft.mode !== "arrival" && this.geometry(this.center, craft).distance > RADIUS_KM * 1.15) craft.done = true;
  }

  drain(now: number, out: ReceiverMessage[]) {
    if (!this.active) return;
    this.startedAt ??= now;
    if (!this.populated) {
      // Wait briefly for airport names so the first traffic can include arrivals.
      if (!this.airports().length && now - this.startedAt < 3000) return;
      this.populated = true;
      for (let i = 0; i < POPULATION; i++) this.spawn(now, true);
    }
    if (this.clock === null || now - this.clock > 5000) this.clock = now;

    while (this.clock + STEP_MS <= now) {
      this.clock += STEP_MS;
      const time = this.clock;
      for (const craft of this.aircraft) {
        this.advance(craft, STEP_MS / 1000);
        while (!craft.done && craft.nextMessage <= time) {
          craft.messages += 3 + Math.floor(this.random() * 6);
          const distance = this.geometry(this.center, craft).distance;
          out.push({
            addr: craft.addr,
            time: craft.nextMessage,
            flight: craft.flight,
            altitude: Math.round(craft.altitude / 25) * 25,
            speed: Math.round(craft.speed),
            track: craft.track,
            verticalRate: craft.verticalRate,
            lat: craft.lat,
            lon: craft.lon,
            messages: craft.messages,
            signal: Math.min(1, 10 ** ((-4 - 26 * (distance / RADIUS_KM) - this.random() * 4) / 20)),
          });
          craft.nextMessage += 350 + this.random() * 1100;
        }
      }
      this.aircraft = this.aircraft.filter((craft) => !craft.done);
      if (this.aircraft.length < POPULATION && this.random() < 0.02) this.spawn(time, false);
    }
  }
}
