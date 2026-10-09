import { Camera, easeInOutCubic, easeOutCubic, ramp } from "../../stage";
import { EndCard, ProductCard } from "./graphics/cards";
import { BRAND_ORANGE } from "./graphics/logo";
import { ClaimPill, OhBurst } from "./graphics/supers";
import { ConservatoryPlate, FarmPlate, FirehousePlate, ScaleInsert } from "./plates/locations";
import { PortraitAt } from "./plates/people";
import { BEATS } from "./timeline";

// The five scenes of the "Oh!" spot. Each takes its local time in seconds.

/** 1 · Open: firefighter at the truck, farmer in the field; who it is for. */
export function OpenScene({ t }: { t: number }) {
  const B = BEATS.open;
  const farm = t >= B.farm;
  const local = farm ? t - B.farm : t;
  return (
    <>
      <Camera t={local} duration={3} from={{ scale: 1.0, x: 0, y: 0 }} to={{ scale: 1.05, x: farm ? -20 : 20, y: 0 }}>
        {farm ? <FarmPlate /> : <FirehousePlate />}
        <PortraitAt left={farm ? 700 : 160} cast={farm ? "farmer" : "firefighter"} width={farm ? 760 : 860} />
      </Camera>
      <ClaimPill t={t} start={B.pill[0]} end={B.pill[1]} left={150} top={760}>
        For adults with type 2 diabetes
      </ClaimPill>
    </>
  );
}

/** 2 · Product card: the wordmark builds, the generic name and the pen. */
export function ProductScene({ t }: { t: number }) {
  return <ProductCard t={t} {...BEATS.product} />;
}

/** 3 · Firehouse community day: A1C claim, then the firefighter's "Oh!". */
export function FirehouseScene({ t }: { t: number }) {
  const B = BEATS.firehouse;
  const close = t >= B.close;
  return (
    <>
      {close ? (
        <Camera t={t - B.close} duration={3.1} from={{ scale: 1.0, x: 0, y: 0 }} to={{ scale: 1.06, x: -10, y: 0 }}>
          <FirehousePlate />
          <PortraitAt left={840} cast="firefighter" mouth={t > B.oh + 0.1 ? "oh" : "smile"} width={1000} />
        </Camera>
      ) : (
        <Camera t={t} duration={B.close} from={{ scale: 1.0, x: 0, y: 0 }} to={{ scale: 1.08, x: 0, y: 10 }}>
          <FirehousePlate wide />
          <PortraitAt left={1180} cast="firefighter" width={560} />
        </Camera>
      )}
      <ClaimPill t={t} start={B.pill[0]} end={B.pill[1]} icon="drop" left={150} top={690}>
        Reached an A1C
        <br />
        of less than 7
      </ClaimPill>
      <OhBurst t={t} start={B.oh} icon="drop" left={930} top={650} />
    </>
  );
}

/** 4 · Outdoors: scale insert and the farmer; the conservatory and the heart claim. */
export function OutdoorsScene({ t }: { t: number }) {
  const B = BEATS.outdoors;
  if (t < B.scale[1]) {
    return (
      <Camera t={t} duration={B.scale[1]} from={{ scale: 1.08, x: 0, y: 0 }} to={{ scale: 1.0, x: 0, y: 0 }}>
        <ScaleInsert needle={easeInOutCubic(ramp(t, 0.2, 1.3))} />
      </Camera>
    );
  }
  if (t < B.garden) {
    const local = t - B.farmer;
    return (
      <>
        <Camera t={local} duration={B.garden - B.farmer} from={{ scale: 1.0, x: 0, y: 0 }} to={{ scale: 1.06, x: 0, y: 0 }}>
          <FarmPlate near />
          <PortraitAt left={820} cast="farmer" mouth={t > B.oh + 0.1 ? "oh" : "smile"} width={1000} />
        </Camera>
        <ClaimPill t={t} start={B.farmer + 0.2} end={B.garden} icon="scale" left={150} top={690}>
          In a study, adults lost on
          <br />
          average up to 12 pounds
        </ClaimPill>
        <OhBurst t={t} start={B.oh} icon="scale" left={910} top={650} />
      </>
    );
  }
  const local = t - B.garden;
  return (
    <>
      <Camera t={local} duration={5} from={{ scale: 1.0, x: 0, y: 0 }} to={{ scale: 1.06, x: 20, y: 0 }}>
        <ConservatoryPlate />
        <PortraitAt left={90} cast="visitor" mouth={t > B.heartOh + 0.1 ? "oh" : "smile"} width={1000} />
      </Camera>
      <ClaimPill t={t} start={B.heart} end={10} icon="heart" left={860} top={640} width={900}>
        In adults also with known heart disease, lowers the risk of major cardiovascular events such as stroke, heart attack, or death
      </ClaimPill>
      <OhBurst t={t} start={B.heartOh} icon="heart" left={170} top={650} />
    </>
  );
}

/** 5 · Triptych of the three "Oh!"s, swept by the white arc into the end card. */
export function FinaleScene({ t }: { t: number }) {
  const B = BEATS.finale;
  if (t >= B.card) return <EndCard t={t - B.card} />;
  const sweep = easeInOutCubic(ramp(t, B.sweep[0], B.sweep[1]));
  const drift = easeOutCubic(ramp(t, 0, 3));
  return (
    <>
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${-drift * 20}px)` }}>
        <FirehousePlate />
        <PortraitAt left={-130} cast="firefighter" width={860} />
      </div>
      <div style={{ position: "absolute", inset: 0, clipPath: "inset(0 0 0 66%)" }}>
        <ConservatoryPlate />
        <PortraitAt left={1170} cast="visitor" width={860} />
      </div>
      <div style={{ position: "absolute", inset: 0, clipPath: "ellipse(23% 78% at 50% 50%)" }}>
        <FarmPlate near />
        <PortraitAt left={530} cast="farmer" width={860} />
      </div>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        <ellipse cx={960} cy={540} rx={1920 * 0.23} ry={1080 * 0.78} fill="none" stroke={BRAND_ORANGE} strokeWidth={9} />
      </svg>
      {B.ohs.map((start, i) => (
        <OhBurst key={start} t={t} start={start} icon={(["drop", "scale", "heart"] as const)[i]} left={150 + i * 640} top={760} size={130} />
      ))}
      {sweep > 0 ? (
        <div
          style={{
            position: "absolute",
            top: -600,
            bottom: -600,
            right: 0,
            width: 2400,
            borderRadius: "50%",
            background: "#f3f1ee",
            boxShadow: `-10px 0 0 6px ${BRAND_ORANGE}`,
            transform: `translateX(${(1 - sweep) * 2400}px)`,
          }}
        />
      ) : null}
    </>
  );
}
