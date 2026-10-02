"use client";

import { useEffect, useRef, useState } from "react";
import { applyContactChanges, createNetwork, isLinked, lifeOf, pruneFaded, type ContactEvent, type NetworkNode, type Point } from "./model/network";
import { buildPose, createPerson, toWorld, updatePerson, type Frame, type Person, type Point as BodyPoint } from "./model/rig";
import styles from "./screen.module.css";

const maximumPixelRatio = 1.5;
const pulseDuration = 1600;
// Cross-session reach as a share of the screen's shorter side.
const reachShare = 0.3;
const lifetime = 5000;
// Edges are batched into this many opacity steps so fading costs a few strokes, not one per edge.
const opacitySteps = 24;
// /2's full-body state is five contacts, so a person is carried by its session's newest five nodes.
const personAnchors = 5;
// Stick-figure head radius in rest-body units; strokes are shared by every person, so their width is fixed.
const headRadius = 24;
const stickWidth = 2.5;
const bodiedNetworkOpacity = 0.2;

export default function MobileFingerNetworkThree() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const [hasNodes, setHasNodes] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const showPeopleRef = useRef(showPeople);

  useEffect(() => {
    showPeopleRef.current = showPeople;
  }, [showPeople]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!context) return;

    const network = createNetwork();
    const useTouchEvents = "ontouchstart" in window;
    // Pointer identifiers are kept negative so they never share a slot with touch identifiers.
    const pointerIdentifier = (event: PointerEvent) => -1 - event.pointerId;
    const heldPointers = new Set<number>();
    let width = 1;
    let height = 1;
    let frame: number | null = null;
    let previousTime = 0;
    const nodeSteps = Array.from({ length: opacitySteps + 1 }, () => [] as NetworkNode[]);
    const personSteps = Array.from({ length: opacitySteps + 1 }, () => [] as { frame: Frame; pose: ReturnType<typeof buildPose> }[]);
    const persons = new Map<number, Person>();
    const bodied = new Set<number>();

    const paint = (time: number) => {
      frame = null;
      context.fillStyle = "#000";
      context.fillRect(0, 0, width, height);

      pruneFaded(network, time, lifetime);
      const nodes = network.nodes;
      const lives = nodes.map((node) => lifeOf(node, time, lifetime));

      // With people on, one person per session, drawn over the network and as faded as the session's most alive node.
      if (!showPeopleRef.current) persons.clear();
      const elapsedSeconds = previousTime ? Math.min(0.05, (time - previousTime) / 1000) : 1 / 60;
      previousTime = time;
      const sessions = new Map<number, { nodes: NetworkNode[]; life: number }>();
      if (showPeopleRef.current) nodes.forEach((node, index) => {
        const session = sessions.get(node.session) ?? { nodes: [], life: 0 };
        session.nodes.push(node);
        session.life = Math.max(session.life, lives[index]!);
        sessions.set(node.session, session);
      });
      for (const id of persons.keys()) if (!sessions.has(id)) persons.delete(id);
      for (const people of personSteps) people.length = 0;
      bodied.clear();
      for (const [id, session] of sessions) {
        const person = persons.get(id) ?? createPerson();
        persons.set(id, person);
        const anchors = new Map(session.nodes.slice(-personAnchors).map((node) => [node.id, node] as const));
        const figure = updatePerson(person, anchors, elapsedSeconds).figure;
        const step = Math.round(session.life * opacitySteps);
        if (!figure) continue;
        bodied.add(id);
        if (step > 0) personSteps[step]!.push({ frame: figure.frame, pose: buildPose(figure.endpoints) });
      }
      // A session that has raised a person recedes to a faint network, so the person reads first.
      const weights = nodes.map((node, index) => lives[index]! * (bodied.has(node.session) ? bodiedNetworkOpacity : 1));
      const reach = Math.min(width, height) * reachShare;
      // An edge is as visible as its weaker end.
      const steps = Array.from({ length: opacitySteps + 1 }, () => [] as number[]);
      for (let first = 0; first < nodes.length; first += 1) {
        for (let second = first + 1; second < nodes.length; second += 1) {
          if (!isLinked(nodes[first]!, nodes[second]!, reach)) continue;
          const step = Math.round(Math.min(weights[first]!, weights[second]!) * opacitySteps);
          if (step > 0) steps[step]!.push(first, second);
        }
      }
      context.lineWidth = 1;
      steps.forEach((pairs, step) => {
        if (pairs.length === 0) return;
        context.strokeStyle = `rgba(255, 255, 255, ${(0.85 * step) / opacitySteps})`;
        context.beginPath();
        for (let index = 0; index < pairs.length; index += 2) {
          context.moveTo(nodes[pairs[index]!]!.x, nodes[pairs[index]!]!.y);
          context.lineTo(nodes[pairs[index + 1]!]!.x, nodes[pairs[index + 1]!]!.y);
        }
        context.stroke();
      });

      const phase = (time % pulseDuration) / pulseDuration;
      const pulse = 9 + phase * 26;
      for (const faint of [false, true]) {
        context.strokeStyle = `rgba(255, 255, 255, ${0.55 * (1 - phase) * (faint ? bodiedNetworkOpacity : 1)})`;
        context.beginPath();
        for (const point of network.held.values()) {
          if (bodied.has(point.session) !== faint) continue;
          context.moveTo(point.x + pulse, point.y);
          context.arc(point.x, point.y, pulse, 0, Math.PI * 2);
        }
        context.stroke();
      }
      // Node rings and dots are batched by the same opacity steps as edges.
      for (const members of nodeSteps) members.length = 0;
      weights.forEach((weight, index) => {
        const step = Math.round(weight * opacitySteps);
        if (step > 0) nodeSteps[step]!.push(nodes[index]!);
      });
      context.fillStyle = "#fff";
      nodeSteps.forEach((members, step) => {
        if (members.length === 0) return;
        context.globalAlpha = step / opacitySteps;
        context.strokeStyle = "rgba(255, 255, 255, 0.72)";
        context.beginPath();
        for (const point of members) {
          context.moveTo(point.x + 8, point.y);
          context.arc(point.x, point.y, 8, 0, Math.PI * 2);
        }
        context.stroke();
        context.beginPath();
        for (const point of members) {
          context.moveTo(point.x + 3, point.y);
          context.arc(point.x, point.y, 3, 0, Math.PI * 2);
        }
        context.fill();
      });
      context.globalAlpha = 1;

      // Stick figures sharing an opacity step are one path and one stroke, however many people there are.
      context.lineWidth = stickWidth;
      context.lineCap = "round";
      context.lineJoin = "round";
      personSteps.forEach((people, step) => {
        if (people.length === 0) return;
        context.strokeStyle = `rgba(255, 255, 255, ${step / opacitySteps})`;
        context.beginPath();
        for (const { frame: body, pose } of people) {
          const at = (point: BodyPoint) => toWorld(body, point);
          const head = at(pose.head);
          const neck = at(pose.neck);
          const radius = headRadius * pose.scale * body.scale;
          const reach = Math.hypot(neck.x - head.x, neck.y - head.y) || 1;
          const shoulders = at({ x: (pose.leftShoulder.x + pose.rightShoulder.x) / 2, y: pose.leftShoulder.y });
          const pelvis = at(pose.pelvis);
          context.moveTo(head.x + radius, head.y);
          context.arc(head.x, head.y, radius, 0, Math.PI * 2);
          context.moveTo(head.x + ((neck.x - head.x) * radius) / reach, head.y + ((neck.y - head.y) * radius) / reach);
          context.lineTo(pelvis.x, pelvis.y);
          for (const [elbow, hand] of [[pose.leftElbow, pose.leftHand], [pose.rightElbow, pose.rightHand]] as const) {
            context.moveTo(shoulders.x, shoulders.y);
            const bend = at(elbow);
            const end = at(hand);
            context.lineTo(bend.x, bend.y);
            context.lineTo(end.x, end.y);
          }
          for (const [knee, foot] of [[pose.leftKnee, pose.leftFoot], [pose.rightKnee, pose.rightFoot]] as const) {
            context.moveTo(pelvis.x, pelvis.y);
            const bend = at(knee);
            const end = at(foot);
            context.lineTo(bend.x, bend.y);
            context.lineTo(end.x, end.y);
          }
        }
        context.stroke();
      });
      context.lineCap = "butt";
      context.lineJoin = "miter";

      if (nodes.length > 0) frame = window.requestAnimationFrame(paint);
      else {
        previousTime = 0;
        setHasNodes(false);
      }
    };

    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(paint);
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, maximumPixelRatio);
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      schedule();
    };

    const position = (clientX: number, clientY: number, bounds: DOMRect): Point => ({
      x: Math.max(0, Math.min(width, clientX - bounds.left)),
      y: Math.max(0, Math.min(height, clientY - bounds.top)),
    });

    const apply = (type: ContactEvent, changes: { identifier: number; x: number; y: number }[]) => {
      applyContactChanges(network, type, changes, performance.now());
      if (network.nodes.length > 0) setHasNodes(true);
      schedule();
    };

    // Touches on the option controls stay native so their taps still click; every other touch is a node.
    const onControls = (touch: Touch) => touch.target instanceof Node && (controlsRef.current?.contains(touch.target) ?? false);
    const syncTouches = (event: TouchEvent) => {
      const touches = Array.from(event.changedTouches).filter((touch) => !onControls(touch));
      if (touches.length === 0) return;
      event.preventDefault();
      const bounds = canvas.getBoundingClientRect();
      apply(
        event.type as ContactEvent,
        touches.map((touch) => ({ identifier: touch.identifier, ...position(touch.clientX, touch.clientY, bounds) })),
      );
    };

    const onDown = (event: PointerEvent) => {
      if (useTouchEvents && event.pointerType === "touch") return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      heldPointers.add(event.pointerId);
      apply("touchstart", [{ identifier: pointerIdentifier(event), ...position(event.clientX, event.clientY, canvas.getBoundingClientRect()) }]);
    };

    const onMove = (event: PointerEvent) => {
      if (!heldPointers.has(event.pointerId)) return;
      apply("touchmove", [{ identifier: pointerIdentifier(event), ...position(event.clientX, event.clientY, canvas.getBoundingClientRect()) }]);
    };

    const onEnd = (event: PointerEvent) => {
      if (!heldPointers.delete(event.pointerId)) return;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      apply("touchend", [{ identifier: pointerIdentifier(event), x: 0, y: 0 }]);
    };

    const preventGesture = (event: Event) => event.preventDefault();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener("touchstart", syncTouches, { passive: false, capture: true });
    document.addEventListener("touchmove", syncTouches, { passive: false, capture: true });
    document.addEventListener("touchend", syncTouches, { passive: false, capture: true });
    document.addEventListener("touchcancel", syncTouches, { passive: false, capture: true });
    document.addEventListener("gesturestart", preventGesture, { passive: false, capture: true });
    document.addEventListener("gesturechange", preventGesture, { passive: false, capture: true });
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onEnd);
    canvas.addEventListener("pointercancel", onEnd);
    canvas.addEventListener("lostpointercapture", onEnd);
    resize();

    return () => {
      observer.disconnect();
      document.removeEventListener("touchstart", syncTouches, true);
      document.removeEventListener("touchmove", syncTouches, true);
      document.removeEventListener("touchend", syncTouches, true);
      document.removeEventListener("touchcancel", syncTouches, true);
      document.removeEventListener("gesturestart", preventGesture, true);
      document.removeEventListener("gesturechange", preventGesture, true);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onEnd);
      canvas.removeEventListener("pointercancel", onEnd);
      canvas.removeEventListener("lostpointercapture", onEnd);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <main className={styles.field}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="Every touch session leaves fading nodes, joined to all nodes of the same session and to nearby nodes of earlier sessions; optionally each session carries a stick figure" role="img" />
      {!hasNodes && <p className={styles.instruction}>화면을 여러 손가락으로 터치하세요</p>}
      <div ref={controlsRef} className={styles.controls}>
        {optionsOpen && (
          <button type="button" id="finger-network-options" className={styles.control} aria-pressed={showPeople} onClick={() => setShowPeople((value) => !value)}>
            사람 {showPeople ? "켜짐" : "꺼짐"}
          </button>
        )}
        <button type="button" className={styles.control} aria-expanded={optionsOpen} aria-controls="finger-network-options" onClick={() => setOptionsOpen((value) => !value)}>
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
    </main>
  );
}
