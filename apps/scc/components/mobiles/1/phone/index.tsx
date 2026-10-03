import { memo } from "react";
import { HomeIndicator, LaunchScreen, Notification, StatusBar, ios } from "../ios";
import { registry } from "../apps/registry";
import { batteryCurve, type BatteryCurve } from "../model/battery";
import { restingScene } from "../model/rest";
import { bannerPush, isAsleep, sceneAt, unseenPushes } from "../model/sample";
import { simToMs, timeConfig, weekdayOf } from "../model/time";
import type { DayPlan, Owner, Push, Scene } from "../model/types";
import { BannerPresence, Stage, type TransitionSettings } from "./stage";

const SYSTEM_APPS = new Set(["lock", "alarm"]);

export const defaultTransition: TransitionSettings = {
  style: "zoom",
  ms: simToMs(timeConfig.transitionMinutes, timeConfig.minutesPerSecond),
  holdMs: simToMs(timeConfig.holdMinutes, timeConfig.minutesPerSecond),
  scale: 0.86,
};

/** One scene with its own status bar and home indicator, so they move with it. */
const SceneLayer = memo(function SceneLayer({ scene, minute, day, owner, pushes, battery }: {
  scene: Scene;
  minute: number;
  day: number;
  owner: Owner;
  pushes: readonly Push[];
  battery: BatteryCurve;
}) {
  if (scene.app === "off") return null;
  const clone = registry[scene.app];
  const tone = clone?.tone?.(scene.view) ?? "dark";
  // Always-on and StandBy draw their own dimmed time; no status bar or home indicator.
  const resting = scene.app === "lock" && (scene.view === "always-on" || scene.view === "standby");
  const index = Math.min(1439, Math.max(0, Math.floor(minute)));
  const Screen = clone?.Screen;
  return (
    <>
      {Screen ? (
        <Screen
          view={scene.view}
          seed={scene.seed}
          elapsed={Math.max(0, Math.floor(minute - scene.start))}
          duration={scene.end - scene.start}
          clock={minute}
          day={day}
          weekday={weekdayOf(day)}
          owner={owner}
          pushes={pushes}
        />
      ) : (
        <LaunchScreen app={scene.app} />
      )}
      {!resting && <StatusBar clock={minute} battery={battery.level[index]} charging={battery.charging[index] === 1} tone={tone} />}
      {!resting && <HomeIndicator tone={tone} />}
    </>
  );
});

/** Resolves what one person's phone shows at `minute` and draws it at 390 × 844. */
export const PhoneView = memo(function PhoneView({ owner, plan, minute, scale = 1, transition = defaultTransition }: {
  owner: Owner;
  plan: DayPlan;
  /** Whole simulated minute of the day. */
  minute: number;
  scale?: number;
  transition?: TransitionSettings;
}) {
  let scene = sceneAt(plan.scenes, minute);
  const pending = unseenPushes(plan, minute);
  const banner = scene.app === "off" || SYSTEM_APPS.has(scene.app) ? null : bannerPush(plan, minute);
  // A notification brightens a resting screen into its lock screen for a moment;
  // Sleep Focus keeps it dark for everything but the baby monitor.
  const lights = pending.length > 0 && minute - pending[0].at < timeConfig.wakeLightMinutes && (pending[0].app === "baby" || !isAsleep(plan, minute));
  if (scene.app === "off" && lights) {
    scene = { ...scene, id: `${scene.id}:lit:${pending[0].id}`, app: "lock", view: "lock", start: pending[0].at };
  }
  // Nobody is holding the phone: always-on by day, a sleep surface by night.
  scene = restingScene(owner, plan, scene, minute);
  const battery = batteryCurve(plan, owner);

  return (
    <div className={ios.phone} style={scale === 1 ? undefined : { transform: `scale(${scale})` }}>
      <div className={ios.glass}>
        <Stage
          scene={scene}
          transition={transition}
          render={(shown, frozen) => (
            <SceneLayer
              scene={shown}
              // The outgoing screen holds its last frame while it animates away.
              minute={frozen ? Math.max(shown.start, Math.min(minute, shown.end - 1)) : minute}
              day={plan.day}
              owner={owner}
              pushes={pending}
              battery={battery}
            />
          )}
        />
        <BannerPresence push={banner} transition={transition} render={(push) => <Notification push={push} clock={minute} />} />
      </div>
    </div>
  );
});
