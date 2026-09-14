"use client";

import styled from "styled-components";
import { useDistributedVideo } from "@/components/dj/3/media/use-distributed-video";
import { activeTrack } from "@/components/dj/3/tracks";
import { useDjThreeSocket } from "@/components/dj/3/transport/use-dj-three-socket";

const Page = styled.main`
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 24px;
  background: #000;
  color: #fff;
  font-family: Arial, Helvetica, sans-serif;
`;

const Controls = styled.section`
  display: grid;
  justify-items: center;
  gap: 28px;
  text-align: center;
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(22px, 4vw, 38px);
  font-weight: 400;
`;

const Time = styled.p`
  margin: 0;
  font-size: 18px;
  font-variant-numeric: tabular-nums;
`;

const Actions = styled.div`
  display: flex;
  justify-content: center;
  gap: 36px;
`;

const Button = styled.button`
  appearance: none;
  border: 0;
  padding: 8px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 18px;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-underline-offset: 5px;
  }

  &:focus-visible {
    outline: 1px solid #fff;
    outline-offset: 3px;
  }

  &:disabled {
    color: #555;
    cursor: default;
    text-decoration: none;
  }
`;

const ErrorText = styled.p`
  max-width: 52ch;
  margin: 0;
  font-size: 14px;
`;

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.min(seconds, activeTrack.duration));
  const minutes = Math.floor(safe / 60);
  const remainder = Math.floor(safe % 60);
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export default function DjThreeController() {
  const {
    connected,
    connectionError,
    transport,
    clockOffsetMs,
    sendCommand,
  } = useDjThreeSocket({ role: "controller" });
  const { videoRef, primed, prime, mediaError, currentTime } =
    useDistributedVideo({
      track: activeTrack,
      transport,
      clockOffsetMs,
      role: { kind: "controller" },
    });
  const isPlaying = transport?.status === "playing";

  async function togglePlayback() {
    if (!primed && !(await prime())) return;
    sendCommand({
      action: isPlaying ? "pause" : "play",
      position: transport?.position ?? 0,
      trackId: activeTrack.id,
    });
  }

  async function restart() {
    if (!primed && !(await prime())) return;
    sendCommand({ action: "restart", trackId: activeTrack.id });
  }

  return (
    <Page>
      <video
        ref={videoRef}
        src={activeTrack.mediaUrl}
        preload="auto"
        playsInline
        hidden
      />
      <Controls>
        <Title>{activeTrack.title}</Title>
        <Time>{formatTime(currentTime)}</Time>
        <Actions>
          <Button disabled={!connected} onClick={togglePlayback} type="button">
            {isPlaying ? "pause" : "play"}
          </Button>
          <Button disabled={!connected} onClick={restart} type="button">
            restart
          </Button>
        </Actions>
        {(mediaError || connectionError) && (
          <ErrorText role="alert">{mediaError || connectionError}</ErrorText>
        )}
      </Controls>
    </Page>
  );
}
