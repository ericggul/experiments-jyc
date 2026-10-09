import { SvgFilters, blur } from "../../../stage/svg-filters";
import { memo } from "react";

// Indoor plates: the reading room with a chest film, and the presenter.
export const ClinicPlate = memo(function ClinicPlate() {
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      <SvgFilters />
      <defs>
        <linearGradient id="lina-clinic-wall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5d5546" />
          <stop offset="0.55" stopColor="#8a8070" />
          <stop offset="1" stopColor="#6b6253" />
        </linearGradient>
        <radialGradient id="lina-lung" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#f7efe2" />
          <stop offset="1" stopColor="#a69a88" />
        </radialGradient>
      </defs>
      <rect width={1920} height={1080} fill="url(#lina-clinic-wall)" />
      {/* blinds */}
      <g opacity={0.8}>
        <rect x={0} y={0} width={720} height={520} fill="#d9d2c3" />
        {Array.from({ length: 26 }, (_, i) => (
          <rect key={i} x={0} y={i * 20} width={720} height={9} fill="#9f9786" />
        ))}
      </g>
      <rect x={720} y={240} width={860} height={300} fill="#cfc7b6" opacity={0.65} />
      {/* desk */}
      <path d="M0 760 L1920 700 L1920 1080 L0 1080 Z" fill="#d8d2c6" />
      <path d="M0 760 L1920 700" stroke="#f2ede3" strokeWidth={6} />
      {/* patient */}
      <g filter={blur(0.6)}>
        <path d="M900 760 C900 610 950 540 1100 540 C1250 540 1300 610 1300 760 Z" fill="#e3d2b8" />
        <rect x={1078} y={470} width={44} height={60} fill="#cc9c80" />
        <ellipse cx={1100} cy={420} rx={74} ry={88} fill="#d3a487" />
        <path d="M1020 470 Q1000 300 1100 300 Q1205 300 1182 470 L1166 470 Q1170 380 1100 360 Q1036 380 1036 470 Z" fill="#1d1612" />
        <path d="M940 690 h120 v40 h-120 Z" fill="#d3a487" />
      </g>
      {/* film viewer on the desk */}
      <g>
        <path d="M1500 300 L1840 230 L1840 800 L1500 760 Z" fill="#eef1f2" />
        <path d="M1520 320 L1820 258 L1820 772 L1520 742 Z" fill="#1d2731" />
        <g transform="translate(1530 330) scale(0.62 0.8)">
          <ellipse cx={170} cy={260} rx={110} ry={210} fill="url(#lina-lung)" opacity={0.55} />
          <ellipse cx={330} cy={260} rx={110} ry={210} fill="url(#lina-lung)" opacity={0.55} />
          <line x1={250} y1={40} x2={250} y2={520} stroke="#f2eadc" strokeWidth={14} opacity={0.7} />
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d={`M250 ${90 + i * 48} Q130 ${70 + i * 48} 70 ${130 + i * 48} M250 ${90 + i * 48} Q370 ${70 + i * 48} 430 ${130 + i * 48}`} stroke="#efe5d4" strokeWidth={6} fill="none" opacity={0.6} />
          ))}
          <circle cx={200} cy={300} r={22} fill="#ff6a5a" opacity={0.55} />
        </g>
        <path d="M1640 790 L1700 790 L1720 840 L1620 840 Z" fill="#e5e8ea" />
      </g>
      {/* doctor, out of focus in the foreground */}
      <g filter={blur(9)}>
        <path d="M-80 1080 C-60 760 60 600 260 580 C460 600 620 760 700 1080 Z" fill="#eef0ee" />
        <ellipse cx={250} cy={380} rx={120} ry={150} fill="#c99577" />
        <path d="M130 360 Q130 200 250 200 Q380 200 375 360 Q340 280 250 280 Q170 280 130 360 Z" fill="#161210" />
        <path d="M560 860 C640 840 760 840 860 880 L860 930 C760 900 660 900 560 920 Z" fill="#eef0ee" />
      </g>
    </svg>
  );
});

/** Presenter in a grey blazer, standing three-quarter to camera. */
export const Presenter = memo(function Presenter({ gesture = 0 }: { gesture?: number }) {
  // 0: forearm down; 1: forearm raised beside the face.
  const forearm = 10 + gesture * 165;
  return (
    <svg width={520} height={900} viewBox="0 0 520 900">
      <defs>
        <linearGradient id="lina-blazer" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8d8f8c" />
          <stop offset="0.5" stopColor="#a6a8a4" />
          <stop offset="1" stopColor="#7c7e7b" />
        </linearGradient>
      </defs>
      <path d="M170 600 L160 900 L240 900 L258 640 L276 900 L356 900 L346 600 Z" fill="#2a2b2f" />
      <path d="M120 260 Q130 200 200 186 L320 186 Q392 200 400 260 L420 620 L100 620 Z" fill="url(#lina-blazer)" />
      <path d="M214 186 L306 186 L290 600 L230 600 Z" fill="#f2f1ee" />
      <path d="M214 186 L250 330 L200 440 L170 230 Z M306 186 L270 330 L320 440 L350 230 Z" fill="#9a9c98" />
      {/* right arm: upper arm hangs, forearm lifts to a raised index finger */}
      <path d="M372 236 L410 248 L428 420 L392 428 Z" fill="url(#lina-blazer)" />
      <g transform={`rotate(${forearm} 410 420)`}>
        <path d="M392 412 L428 412 L432 590 L398 594 Z" fill="#9a9c98" />
        <circle cx={415} cy={604} r={22} fill="#c99577" />
        <rect x={409} y={604} width={12} height={40} rx={6} fill="#c99577" />
      </g>
      <path d="M128 250 L96 480 L138 486 L156 270 Z" fill="url(#lina-blazer)" />
      <circle cx={116} cy={496} r={21} fill="#c99577" />
      <rect x={238} y={136} width={44} height={56} fill="#c08d70" />
      <ellipse cx={260} cy={100} rx={56} ry={68} fill="#cc9878" />
      <path d="M200 96 Q196 22 262 24 Q326 24 320 96 Q306 54 262 52 Q218 54 200 96 Z" fill="#17120f" />
      <path d="M232 104 h14 M274 104 h14" stroke="#2a201b" strokeWidth={4} strokeLinecap="round" opacity={0.7} />
      <path d="M246 140 q14 8 28 0" stroke="#8a5a48" strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.7} />
    </svg>
  );
});
