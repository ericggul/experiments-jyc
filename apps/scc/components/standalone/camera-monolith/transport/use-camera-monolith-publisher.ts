"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { cameraMonolithEvents } from "./protocol";
import { getIceServers } from "./webrtc";

export type CameraFacingMode = "user" | "environment";

function requestCamera(facingMode: CameraFacingMode) {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 640, max: 960 },
      height: { ideal: 480, max: 720 },
      frameRate: { ideal: 15, max: 24 },
    },
  });
}

export function useCameraMonolithPublisher(socket: Socket | null) {
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const candidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const [active, setActive] = useState(false);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>("user");
  const [error, setError] = useState<string | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  const closePeers = useCallback(() => {
    for (const peer of peersRef.current.values()) peer.close();
    peersRef.current.clear();
    candidatesRef.current.clear();
  }, []);

  const closeCapture = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setPreviewStream(null);
    setActive(false);
  }, []);

  const createOfferForViewer = useCallback(async (viewerId: string) => {
    const stream = streamRef.current;
    if (!stream || !socket?.connected) return;
    peersRef.current.get(viewerId)?.close();
    candidatesRef.current.delete(viewerId);
    try {
      const peer = new RTCPeerConnection({ iceServers: getIceServers() });
      peersRef.current.set(viewerId, peer);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit(cameraMonolithEvents.ice, {
            targetId: viewerId,
            candidate: event.candidate,
          });
        }
      };
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit(cameraMonolithEvents.offer, {
        targetId: viewerId,
        description: peer.localDescription,
      });
    } catch (cause) {
      peersRef.current.get(viewerId)?.close();
      peersRef.current.delete(viewerId);
      setError(cause instanceof Error ? cause.message : "카메라를 공유할 수 없습니다.");
    }
  }, [socket]);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    preview.srcObject = previewStream;
    preview.muted = true;
    if (previewStream) void preview.play().catch(() => undefined);
  }, [previewStream]);

  useEffect(() => {
    if (!socket) return;
    const activeSocket = socket;
    async function handleAnswer({ fromId, description }: { fromId: string; description: RTCSessionDescriptionInit }) {
      const peer = peersRef.current.get(fromId);
      if (!peer) return;
      try {
        await peer.setRemoteDescription(description);
        for (const candidate of candidatesRef.current.get(fromId) || []) {
          await peer.addIceCandidate(candidate);
        }
        candidatesRef.current.delete(fromId);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "카메라 연결에 실패했습니다.");
      }
    }
    async function handleIce({ fromId, candidate }: { fromId: string; candidate: RTCIceCandidateInit }) {
      const peer = peersRef.current.get(fromId);
      if (!peer || !candidate) return;
      try {
        if (peer.remoteDescription) await peer.addIceCandidate(candidate);
        else candidatesRef.current.set(fromId, [...(candidatesRef.current.get(fromId) || []), candidate]);
      } catch {
        // The peer may have closed while the candidate was in flight.
      }
    }
    function announceCamera() {
      if (streamRef.current) activeSocket.emit(cameraMonolithEvents.publish);
    }
    function handleViewerReady({ viewerId }: { viewerId: string }) {
      void createOfferForViewer(viewerId);
    }
    function handleViewerLeave({ viewerId }: { viewerId: string }) {
      peersRef.current.get(viewerId)?.close();
      peersRef.current.delete(viewerId);
      candidatesRef.current.delete(viewerId);
    }
    activeSocket.on(cameraMonolithEvents.viewerReady, handleViewerReady);
    activeSocket.on(cameraMonolithEvents.viewerLeave, handleViewerLeave);
    activeSocket.on(cameraMonolithEvents.answer, handleAnswer);
    activeSocket.on(cameraMonolithEvents.ice, handleIce);
    activeSocket.on("connect", announceCamera);
    activeSocket.on("disconnect", closePeers);
    return () => {
      activeSocket.emit(cameraMonolithEvents.unpublish);
      activeSocket.off(cameraMonolithEvents.viewerReady, handleViewerReady);
      activeSocket.off(cameraMonolithEvents.viewerLeave, handleViewerLeave);
      activeSocket.off(cameraMonolithEvents.answer, handleAnswer);
      activeSocket.off(cameraMonolithEvents.ice, handleIce);
      activeSocket.off("connect", announceCamera);
      activeSocket.off("disconnect", closePeers);
      closePeers();
    };
  }, [closePeers, createOfferForViewer, socket]);

  useEffect(() => () => {
    closePeers();
    closeCapture();
  }, [closeCapture, closePeers]);

  const start = useCallback(async () => {
    if (streamRef.current) return;
    if (!socket?.connected) {
      setError("릴레이 연결 후 카메라를 시작하세요.");
      return;
    }
    try {
      const stream = await requestCamera(facingMode);
      streamRef.current = stream;
      setPreviewStream(stream);
      setActive(true);
      setError(null);
      socket.emit(cameraMonolithEvents.publish);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "카메라 접근에 실패했습니다.");
    }
  }, [facingMode, socket]);

  const selectFacingMode = useCallback(async (nextFacingMode: CameraFacingMode) => {
    if (nextFacingMode === facingMode) return;
    const currentStream = streamRef.current;
    if (!currentStream) {
      setFacingMode(nextFacingMode);
      return;
    }
    try {
      const nextStream = await requestCamera(nextFacingMode);
      const nextTrack = nextStream.getVideoTracks()[0];
      if (!nextTrack) throw new Error("카메라 트랙을 찾을 수 없습니다.");
      for (const peer of peersRef.current.values()) {
        const sender = peer.getSenders().find((item) => item.track?.kind === "video");
        if (sender) await sender.replaceTrack(nextTrack);
      }
      streamRef.current = nextStream;
      setPreviewStream(nextStream);
      setFacingMode(nextFacingMode);
      setError(null);
      currentStream.getTracks().forEach((track) => track.stop());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "카메라 전환에 실패했습니다.");
    }
  }, [facingMode]);

  const stop = useCallback(() => {
    socket?.emit(cameraMonolithEvents.unpublish);
    closePeers();
    closeCapture();
  }, [closeCapture, closePeers, socket]);

  return { active, error, facingMode, previewRef, selectFacingMode, start, stop };
}
