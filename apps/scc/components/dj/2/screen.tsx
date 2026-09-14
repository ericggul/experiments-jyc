"use client";

import { useState } from "react";
import styled from "styled-components";
import {
  activeDjTrack,
  getTrackChannels,
} from "@/components/dj/2/track";
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

const Picker = styled.section`
  display: grid;
  justify-items: center;
  gap: 40px;
  width: min(100%, 720px);
  text-align: center;
`;

const Prompt = styled.h1`
  margin: 0;
  font-size: 18px;
  font-weight: 400;
`;

const ChannelGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 20px;
  width: 100%;

  @media (max-width: 560px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const ChannelButton = styled.button<{ $selected: boolean }>`
  min-width: 48px;
  min-height: 48px;
  appearance: none;
  border: 0;
  padding: 8px;
  background: transparent;
  color: ${({ $selected }) => ($selected ? "#fff" : "#666")};
  font: inherit;
  font-size: 32px;
  cursor: pointer;

  text-decoration: ${({ $selected }) => ($selected ? "underline" : "none")};
  text-underline-offset: 6px;

  &:hover,
  &:focus-visible {
    color: #fff;
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 1px solid #fff;
  }
`;

const ErrorText = styled.p`
  max-width: 52ch;
  margin: 0;
  font-size: 14px;
`;

export default function DjTwoScreen() {
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const { connectionError, transport, clockOffsetMs } = useDjTwoSocket({
    role: "screen",
    channels: selectedChannels,
  });
  const { audioRef, primed, prime, audioError } = useTrackAudio({
    track: activeDjTrack,
    transport,
    clockOffsetMs,
    role: { kind: "screen", channels: selectedChannels },
  });
  const channels = getTrackChannels(activeDjTrack);

  async function toggleChannel(channel: string) {
    const isSelected = selectedChannels.includes(channel);
    if (!isSelected && !primed && !(await prime())) return;
    setSelectedChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel],
    );
  }

  return (
    <Page>
      <audio ref={audioRef} src={activeDjTrack.audioUrl} preload="auto" />
      <Picker>
        <Prompt>초성 선택</Prompt>
        <ChannelGrid>
          {channels.map((item) => {
            const selected = selectedChannels.includes(item);
            return (
              <ChannelButton
                key={item}
                $selected={selected}
                type="button"
                onClick={() => toggleChannel(item)}
                aria-label={`${item} ${selected ? "선택 해제" : "선택"}`}
                aria-pressed={selected}
              >
                {item}
              </ChannelButton>
            );
          })}
        </ChannelGrid>
        {(audioError || connectionError) && (
          <ErrorText role="alert">{audioError || connectionError}</ErrorText>
        )}
      </Picker>
    </Page>
  );
}
