"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import {
  englishChannels,
  type TimedWord,
} from "@/components/dj/3/model/track";
import { useDistributedVideo } from "@/components/dj/3/media/use-distributed-video";
import { activeTrack } from "@/components/dj/3/tracks";
import { useDjThreeSocket } from "@/components/dj/3/transport/use-dj-three-socket";

const Page = styled.main`
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: clamp(20px, 5vw, 64px);
  background: #000;
  color: #fff;
  font-family: Arial, Helvetica, sans-serif;
`;

const ChannelGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(44px, 1fr));
  gap: clamp(12px, 2.5vh, 28px) clamp(10px, 2.2vw, 30px);
  width: min(100%, 760px);

  @media (max-width: 560px) {
    grid-template-columns: repeat(5, minmax(42px, 1fr));
    gap: 12px 8px;
  }
`;

const ChannelButton = styled.button<{ $selected: boolean }>`
  min-width: 44px;
  min-height: 52px;
  appearance: none;
  border: 0;
  padding: 6px;
  background: transparent;
  color: ${({ $selected }) => ($selected ? "#fff" : "#666")};
  font: inherit;
  font-size: clamp(28px, 5vw, 52px);
  font-weight: 400;
  line-height: 1;
  text-transform: lowercase;
  cursor: pointer;
  text-decoration: ${({ $selected }) => ($selected ? "underline" : "none")};
  text-underline-offset: 0.18em;
  text-decoration-thickness: 1px;

  &:hover,
  &:focus-visible {
    color: #fff;
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 1px solid #fff;
    outline-offset: 3px;
  }
`;

const VideoOverlay = styled.video`
  position: fixed;
  z-index: 2;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  background: #000;
  opacity: 0;
  will-change: opacity;
  pointer-events: none;
`;

const WordOverlay = styled.p`
  position: fixed;
  z-index: 3;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 24px;
  color: #fff;
  font-size: clamp(56px, 14vw, 180px);
  font-weight: 700;
  line-height: 0.9;
  letter-spacing: -0.055em;
  overflow-wrap: anywhere;
  text-align: center;
  text-shadow: 0 1px 3px #000;
  opacity: 0;
  will-change: opacity;
  pointer-events: none;
`;

const SelectedLetter = styled.span`
  display: inline-block;
  padding: 0.02em 0.08em 0.06em;
  background: #fff;
  color: #000;
  text-shadow: none;
`;

const ErrorText = styled.p`
  position: fixed;
  inset-inline: 24px;
  bottom: 24px;
  z-index: 3;
  margin: 0;
  color: #fff;
  font-size: 14px;
  text-align: center;
`;

export default function DjThreeScreen() {
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const wordOverlayRef = useRef<HTMLParagraphElement | null>(null);
  const selectedLetterRef = useRef<HTMLSpanElement | null>(null);
  const remainderRef = useRef<HTMLSpanElement | null>(null);
  const { connectionError, transport, clockOffsetMs } = useDjThreeSocket({
    role: "screen",
    channels: selectedChannels,
  });
  const selectedSet = useMemo(
    () => new Set(selectedChannels),
    [selectedChannels],
  );
  const handleVisualFrame = useCallback(
    ({ word, opacity }: { word: TimedWord | null; opacity: number }) => {
      const overlay = wordOverlayRef.current;
      const selectedLetter = selectedLetterRef.current;
      const remainder = remainderRef.current;
      if (!overlay || !selectedLetter || !remainder) return;

      overlay.style.opacity = String(opacity);
      if (word && overlay.dataset.wordId !== word.id) {
        overlay.dataset.wordId = word.id;
        selectedLetter.textContent = word.text.slice(0, 1);
        remainder.textContent = word.text.slice(1);
      } else if (!word) {
        delete overlay.dataset.wordId;
      }
    },
    [],
  );
  const { videoRef, primed, prime, mediaError } = useDistributedVideo({
    track: activeTrack,
    transport,
    clockOffsetMs,
    role: { kind: "screen", channels: selectedChannels },
    onVisualFrame: handleVisualFrame,
  });

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
      <ChannelGrid aria-label="Select letter channels">
        {englishChannels.map((channel) => {
          const selected = selectedSet.has(channel);
          return (
            <ChannelButton
              key={channel}
              $selected={selected}
              type="button"
              onClick={() => toggleChannel(channel)}
              aria-label={`${channel}, ${selected ? "selected" : "not selected"}`}
              aria-pressed={selected}
            >
              {channel}
            </ChannelButton>
          );
        })}
      </ChannelGrid>
      <VideoOverlay
        ref={videoRef}
        src={activeTrack.mediaUrl}
        preload="auto"
        playsInline
        aria-hidden="true"
      />
      <WordOverlay ref={wordOverlayRef} aria-hidden="true">
        <SelectedLetter ref={selectedLetterRef} />
        <span ref={remainderRef} />
      </WordOverlay>
      {(mediaError || connectionError) && (
        <ErrorText role="alert">{mediaError || connectionError}</ErrorText>
      )}
    </Page>
  );
}
