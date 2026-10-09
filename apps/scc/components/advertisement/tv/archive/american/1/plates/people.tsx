import { memo } from "react";

// Daylight medium close-ups for the three "Oh!" characters. Illustrated, not
// likenesses: the firefighter, the farmer and the conservatory visitor.
export type Cast = "firefighter" | "farmer" | "visitor";

type Spec = {
  skin: string;
  shade: string;
  hair: string;
  top: string;
  topShade: string;
  collar: string;
};

const CAST: Record<Cast, Spec> = {
  firefighter: { skin: "#d9a98a", shade: "#b98468", hair: "#8d8a86", top: "#1d2433", topShade: "#121722", collar: "#1d2433" },
  farmer: { skin: "#dca487", shade: "#bb8064", hair: "#e9e6e0", top: "#a07a4f", topShade: "#7f5f3c", collar: "#6b7f99" },
  visitor: { skin: "#e3b39a", shade: "#c48f75", hair: "#2a1d18", top: "#a9bdd6", topShade: "#8aa0bd", collar: "#a9bdd6" },
};

export const Portrait = memo(function Portrait({ cast, mouth = "smile", width }: { cast: Cast; mouth?: "smile" | "oh"; width: number }) {
  const c = CAST[cast];
  const gradient = `oz-${cast}-skin`;
  return (
    <svg width={width} height={width * (760 / 600)} viewBox="0 0 600 760">
      <defs>
        <radialGradient id={gradient} cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor={c.skin} />
          <stop offset="1" stopColor={c.shade} />
        </radialGradient>
      </defs>
      {cast === "visitor" ? (
        <path d="M150 260 Q140 90 300 80 Q462 90 452 270 L470 560 L380 560 L370 300 L230 300 L220 560 L130 560 Z" fill={c.hair} />
      ) : null}
      {/* shoulders */}
      <path d="M40 760 C40 600 110 540 230 520 L370 520 C490 540 560 600 560 760 Z" fill={c.top} />
      <path d="M40 760 C40 640 80 580 150 552 L170 760 Z M560 760 C560 640 520 580 450 552 L430 760 Z" fill={c.topShade} />
      {cast === "firefighter" ? (
        <>
          <path d="M240 520 L300 610 L360 520 L330 520 L300 560 L270 520 Z" fill="#0d1119" />
          <path d="M432 600 l46 10 l-6 64 l-40 10 l-36 -18 l6 -58 Z" fill="#a7472e" />
          <path d="M440 616 l26 6 l-4 38 l-24 6 l-20 -10 l4 -34 Z" fill="#e0b13c" />
        </>
      ) : null}
      {cast === "farmer" ? (
        <>
          <path d="M226 520 L300 640 L374 520 Z" fill={c.collar} />
          <path d="M240 520 L300 610 L360 520" stroke="#e8e5df" strokeWidth={10} fill="none" />
          <path d="M150 560 l40 120 M450 560 l-40 120" stroke={c.topShade} strokeWidth={10} />
          <circle cx={198} cy={650} r={7} fill="#5a4229" />
          <circle cx={402} cy={650} r={7} fill="#5a4229" />
        </>
      ) : null}
      {cast === "visitor" ? <path d="M240 520 Q300 600 360 520" stroke={c.topShade} strokeWidth={10} fill="none" /> : null}
      {/* neck and head */}
      <path d="M248 420 L248 530 Q300 560 352 530 L352 420 Z" fill={c.shade} />
      <ellipse cx={192} cy={300} rx={20} ry={36} fill={c.shade} />
      <ellipse cx={408} cy={300} rx={20} ry={36} fill={c.shade} />
      <path d="M196 250 Q196 120 300 118 Q404 120 404 250 L400 340 Q392 440 300 462 Q208 440 200 340 Z" fill={`url(#${gradient})`} />
      {/* hair */}
      {cast === "firefighter" ? <path d="M194 260 Q186 110 300 104 Q414 110 406 260 Q398 180 300 168 Q206 180 194 260 Z" fill={c.hair} /> : null}
      {cast === "visitor" ? <path d="M196 270 Q192 108 300 104 Q410 108 404 240 Q350 150 250 186 Q216 210 196 270 Z" fill={c.hair} /> : null}
      {cast === "farmer" ? (
        <>
          <path d="M200 380 Q210 470 300 474 Q390 470 400 380 Q370 430 300 432 Q230 430 200 380 Z" fill={c.hair} />
          <path d="M182 210 Q190 96 300 92 Q410 96 418 210 Z" fill="#ece9e2" />
          <path d="M168 214 Q300 180 432 214 Q440 236 420 240 Q300 214 180 240 Q160 236 168 214 Z" fill="#8f949a" />
        </>
      ) : null}
      {/* face */}
      <path d="M232 262 q22 -12 44 0 M324 262 q22 -12 44 0" stroke="#3a2a22" strokeWidth={7} fill="none" strokeLinecap="round" />
      <ellipse cx={254} cy={292} rx={12} ry={mouth === "oh" ? 11 : 8} fill="#2b2420" />
      <ellipse cx={346} cy={292} rx={12} ry={mouth === "oh" ? 11 : 8} fill="#2b2420" />
      <circle cx={258} cy={289} r={3} fill="#fff" opacity={0.8} />
      <circle cx={350} cy={289} r={3} fill="#fff" opacity={0.8} />
      <path d="M300 300 Q290 350 300 362 Q312 364 318 356" stroke={c.shade} strokeWidth={6} fill="none" strokeLinecap="round" />
      {mouth === "oh" ? (
        <>
          <ellipse cx={300} cy={404} rx={34} ry={30} fill="#5b2420" />
          <path d="M272 394 q28 -10 56 0 l-4 8 q-24 -8 -48 0 Z" fill="#fff" />
        </>
      ) : (
        <>
          <path d="M252 392 Q300 438 348 392 Q300 412 252 392 Z" fill="#6a2a24" />
          <path d="M258 394 Q300 410 342 394 L338 402 Q300 414 262 402 Z" fill="#fff" />
        </>
      )}
      <ellipse cx={236} cy={350} rx={22} ry={12} fill="#e88a7a" opacity={0.22} />
      <ellipse cx={364} cy={350} rx={22} ry={12} fill="#e88a7a" opacity={0.22} />
    </svg>
  );
});

/** A portrait standing in frame: its bust runs off the bottom edge like a medium shot. */
export function PortraitAt({ cast, width, left, mouth, bottom = 1120 }: { cast: Cast; width: number; left: number; mouth?: "smile" | "oh"; bottom?: number }) {
  return (
    <div style={{ position: "absolute", left, top: bottom - width * (760 / 600) }}>
      <Portrait cast={cast} width={width} mouth={mouth} />
    </div>
  );
}
