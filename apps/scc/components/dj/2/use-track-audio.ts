"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DjTwoTransport } from "@/components/dj/2/use-dj-2-socket";
import { findWordAt, type DjTrack, type TimedWord } from "@/components/dj/2/track";

type AudioRole =
  | { kind: "controller" }
  | { kind: "screen"; channels: readonly string[] };

function expectedPosition(
  transport: DjTwoTransport,
  clockOffsetMs: number,
  now = Date.now(),
) {
  if (transport.status !== "playing" || transport.startedAt === null) {
    return transport.position;
  }

  const serverNow = now + clockOffsetMs;
  const elapsed = Math.max(0, serverNow - transport.startedAt) / 1000;
  return transport.position + elapsed;
}

export function useTrackAudio({
  track,
  transport,
  clockOffsetMs,
  role,
}: {
  track: DjTrack;
  transport: DjTwoTransport | null;
  clockOffsetMs: number;
  role: AudioRole;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const startTimeoutRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastUiUpdateRef = useRef(0);
  const [primed, setPrimed] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeWord, setActiveWord] = useState<TimedWord | null>(null);
  const roleKind = role.kind;
  const roleChannelsKey =
    role.kind === "screen" ? role.channels.join("\u0000") : "";

  const cancelGainSchedule = useCallback(() => {
    const context = contextRef.current;
    const gain = gainRef.current;
    if (!context || !gain) return;
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setValueAtTime(0, context.currentTime);
  }, []);

  const scheduleGain = useCallback(
    (fromPosition: number) => {
      const context = contextRef.current;
      const gain = gainRef.current;
      if (!context || !gain) return;

      const base = context.currentTime;
      const controller = roleKind === "controller";
      const selectedChannels = new Set(
        roleChannelsKey ? roleChannelsKey.split("\u0000") : [],
      );
      gain.gain.cancelScheduledValues(base);
      gain.gain.setValueAtTime(controller ? 1 : 0, base);

      for (const word of track.words) {
        if (word.end <= fromPosition) continue;
        const audible = controller || selectedChannels.has(word.channel);
        const before = controller ? 1 : 0;
        const during = audible ? (controller ? 0 : 1) : before;
        const startAt = base + Math.max(0, word.start - fromPosition);
        const endAt = base + Math.max(0, word.end - fromPosition);

        gain.gain.setValueAtTime(during, startAt);
        gain.gain.setValueAtTime(before, endAt);
      }
    },
    [roleChannelsKey, roleKind, track.words],
  );

  const prime = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return false;

    try {
      if (!contextRef.current) {
        const context = new AudioContext({ latencyHint: "interactive" });
        const source = context.createMediaElementSource(audio);
        const gain = context.createGain();
        gain.gain.value = 0;
        source.connect(gain).connect(context.destination);
        contextRef.current = context;
        sourceRef.current = source;
        gainRef.current = gain;
      }

      await contextRef.current.resume();
      audio.currentTime = 0;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      setPrimed(true);
      setAudioError(null);
      return true;
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : "audio unavailable");
      return false;
    }
  }, []);

  useEffect(() => {
    if (!primed || !transport) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (transport.trackId && transport.trackId !== track.id) {
      audio.pause();
      cancelGainSchedule();
      return;
    }

    if (startTimeoutRef.current !== null) {
      window.clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }

    if (transport.status !== "playing" || transport.startedAt === null) {
      audio.pause();
      audio.playbackRate = 1;
      audio.currentTime = Math.min(transport.position, track.duration);
      cancelGainSchedule();
      setCurrentTime(audio.currentTime);
      setActiveWord(findWordAt(track, audio.currentTime));
      return;
    }

    const localStartAt = transport.startedAt - clockOffsetMs;
    const delay = Math.max(0, localStartAt - Date.now());
    startTimeoutRef.current = window.setTimeout(() => {
      const position = Math.min(
        expectedPosition(transport, clockOffsetMs),
        track.duration,
      );
      audio.currentTime = position;
      audio.playbackRate = 1;
      scheduleGain(position);
      void audio.play().catch((error: unknown) => {
        setAudioError(error instanceof Error ? error.message : "playback blocked");
      });
    }, delay);

    return () => {
      if (startTimeoutRef.current !== null) {
        window.clearTimeout(startTimeoutRef.current);
      }
    };
  }, [
    cancelGainSchedule,
    clockOffsetMs,
    primed,
    scheduleGain,
    track,
    transport,
  ]);

  useEffect(() => {
    if (!primed) return;

    const update = (now: number) => {
      const audio = audioRef.current;
      if (audio && transport?.status === "playing" && !audio.paused) {
        const expected = expectedPosition(transport, clockOffsetMs);
        const drift = expected - audio.currentTime;

        if (Math.abs(drift) > 0.18) {
          audio.currentTime = Math.min(expected, track.duration);
          scheduleGain(audio.currentTime);
        } else {
          audio.playbackRate = Math.min(Math.max(1 + drift * 0.04, 0.985), 1.015);
        }

        if (now - lastUiUpdateRef.current > 60) {
          lastUiUpdateRef.current = now;
          setCurrentTime(audio.currentTime);
          setActiveWord(findWordAt(track, audio.currentTime));
        }
      }
      frameRef.current = window.requestAnimationFrame(update);
    };

    frameRef.current = window.requestAnimationFrame(update);
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [clockOffsetMs, primed, scheduleGain, track, transport]);

  useEffect(
    () => () => {
      cancelGainSchedule();
      void contextRef.current?.close();
    },
    [cancelGainSchedule],
  );

  return {
    audioRef,
    primed,
    prime,
    audioError:
      transport?.trackId && transport.trackId !== track.id
        ? `track unavailable: ${transport.trackId}`
        : audioError,
    currentTime,
    activeWord,
  };
}
