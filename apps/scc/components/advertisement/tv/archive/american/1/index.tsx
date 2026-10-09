"use client";

import { Montserrat } from "next/font/google";
import { SceneMixer, TvStage, useSpotClock, type SceneFrame } from "../../stage";
import { SafetyBand } from "./graphics/supers";
import { FinaleScene, FirehouseScene, OpenScene, OutdoorsScene, ProductScene } from "./scenes";
import { OZEMPIC_SCENES, bandVisible, type OzempicScene } from "./timeline";

const montserrat = Montserrat({ weight: ["500", "600", "700", "900"], subsets: ["latin"] });

// Label-based safety lines that run in the band while the claims play.
const BAND: Record<"firehouse" | "outdoors", readonly string[]> = {
  firehouse: [
    "• Ozempic® is not for people with type 1 diabetes.",
    "• Do not share your Ozempic® pen with other people,",
    "   even if the needle has been changed.",
  ],
  outdoors: [
    "• Ozempic® is not a weight loss drug.",
    "• Ozempic® may cause thyroid tumors, including cancer.",
    "• Tell your provider about a lump or swelling in your neck.",
  ],
};

function renderScene({ id, local }: SceneFrame<OzempicScene>) {
  switch (id) {
    case "open":
      return <OpenScene t={local} />;
    case "product":
      return <ProductScene t={local} />;
    case "firehouse":
      return <FirehouseScene t={local} />;
    case "outdoors":
      return <OutdoorsScene t={local} />;
    case "finale":
      return <FinaleScene t={local} />;
  }
}

/** Ozempic® "Oh!" — five-scene clone of the 2018–2020 national spot. */
export default function AmericanTvOne() {
  const { frame, togglePause } = useSpotClock(OZEMPIC_SCENES);
  const { id } = frame.current;
  const lines = id === "outdoors" ? BAND.outdoors : BAND.firehouse;
  return (
    <TvStage
      className={montserrat.className}
      label="Ozempic Oh! TV commercial clone: firehouse and farm open, product card, A1C claim, weight and heart claims, triptych of Oh! and end card"
      onClick={togglePause}
    >
      <SceneMixer frame={frame} render={renderScene} />
      <SafetyBand lines={lines} opacity={bandVisible(id) ? 1 : 0} />
    </TvStage>
  );
}
