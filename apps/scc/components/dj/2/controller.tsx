"use client";

import styled from "styled-components";
import { activeDjTrack } from "@/components/dj/2/track";
import { useDjTwoSocket } from "@/components/dj/2/use-dj-2-socket";
import { useTrackAudio } from "@/components/dj/2/use-track-audio";

const Page = styled.main`
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 24px;
  background: #000;
  color: #fff;
  font-family: Arial, "Apple SD Gothic Neo", sans-serif;
`;

const Controls = styled.section`
  display: grid;
  justify-items: center;
  gap: 24px;
  text-align: center;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 18px;
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
  gap: 32px;
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
  const safe = Math.max(0, Math.min(seconds, activeDjTrack.duration));
  const minutes = Math.floor(safe / 60);
  const remainder = Math.floor(safe % 60);
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export default function DjTwoController() {
  const {
    connected,
    connectionError,
    transport,
    clockOffsetMs,
    sendCommand,
  } = useDjTwoSocket({ role: "controller" });
  const { audioRef, primed, prime, audioError, currentTime } = useTrackAudio({
    track: activeDjTrack,
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
      trackId: activeDjTrack.id,
    });
  }

  async function restart() {
    if (!primed && !(await prime())) return;
    sendCommand({ action: "restart", trackId: activeDjTrack.id });
  }

  return (
    <Page>
      <audio ref={audioRef} src={activeDjTrack.audioUrl} preload="auto" />
      <Controls>
        <Title>{activeDjTrack.title}</Title>
        <Time>{formatTime(currentTime)}</Time>
        <Actions>
          <Button disabled={!connected} onClick={togglePlayback} type="button">
            {isPlaying ? "멈춤" : "재생"}
          </Button>
          <Button disabled={!connected} onClick={restart} type="button">
            처음부터
          </Button>
        </Actions>
        {(audioError || connectionError) && (
          <ErrorText role="alert">{audioError || connectionError}</ErrorText>
        )}
      </Controls>
    </Page>
  );
}
