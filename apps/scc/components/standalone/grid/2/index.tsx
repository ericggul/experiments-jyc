"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LevaPanel, useControls, useCreateStore } from "leva";
import { bastilleDayImages } from "@/components/standalone/bastille-day/1/images";
import goodFrenchSources from "@/components/standalone/bastille-day/2/good-sources.json";
import darkFrenchSources from "@/components/standalone/bastille-day/2/dark-sources.json";
import catSources from "@/components/ui/dashboard/stock/4/model/cat-sources.json";
import kissSources from "@/components/ui/dashboard/stock/4/model/kiss-sources.json";
import politicianSources from "./politician-sources.json";
import styles from "../screen/grid.module.css";

const COLUMN_COUNT = 16;
const ROW_COUNT = 5;
const CELL_COUNT = COLUMN_COUNT * ROW_COUNT;
const INITIAL_POOL_SIZE = 8;

const frenchSources = [
  ...bastilleDayImages,
  ...goodFrenchSources,
  ...darkFrenchSources,
];
const imageSets = {
  all: [...catSources, ...kissSources, ...frenchSources, ...politicianSources],
  cat: catSources,
  kiss: kissSources,
  french: frenchSources,
  politicians: politicianSources,
} as const;

type CellPlayback = {
  sourceIndex: number;
  nextChangeAt: number;
};

type ImageSet = keyof typeof imageSets;

function randomOtherIndex(current: number, count: number) {
  if (count < 2) return 0;
  const candidate = Math.floor(Math.random() * (count - 1));
  return candidate >= current ? candidate + 1 : candidate;
}

function randomInterval(speed: number, diversity: number) {
  const factor = 1 + (Math.random() * 2 - 1) * diversity;
  return 1000 / Math.max(0.1, speed * Math.max(0.05, factor));
}

export default function GridTwo() {
  const controlStore = useCreateStore();
  const speedRef = useRef(24);
  const diversityRef = useRef(0.72);
  const imageRefs = useRef<Array<HTMLImageElement | null>>([]);
  const playbackRef = useRef<CellPlayback[]>([]);
  const availableSourcesRef = useRef<string[]>([]);
  const [imageSet, setImageSet] = useState<ImageSet>("cat");
  const [loadedSources, setLoadedSources] = useState<string[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);
  useControls(
    () => ({
      album: {
        value: "cat" as ImageSet,
        options: {
          ALL: "all",
          CAT: "cat",
          KISS: "kiss",
          FRENCH: "french",
          POLITICIANS: "politicians",
        },
        onChange: (value: ImageSet) => {
          availableSourcesRef.current = [];
          setLoadedSources([]);
          setImageSet(value);
        },
      },
      speed: {
        value: 24,
        min: 1,
        max: 60,
        step: 1,
        onChange: (value: number) => {
          speedRef.current = value;
        },
      },
      "speed diversity": {
        value: 0.72,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: (value: number) => {
          diversityRef.current = value;
        },
      },
    }),
    { store: controlStore },
  );

  useEffect(() => {
    let cancelled = false;
    const decodedSources: string[] = [];
    const activeSources = imageSets[imageSet];
    availableSourcesRef.current = [];

    const preloadSequentially = async () => {
      for (const source of activeSources) {
        if (cancelled) return;
        const image = new Image();
        const didLoad = await new Promise<boolean>((resolve) => {
          image.onload = async () => {
            try {
              await image.decode();
              resolve(true);
            } catch {
              resolve(false);
            }
          };
          image.onerror = () => resolve(false);
          image.src = source.imageUrl;
        });

        if (!cancelled && didLoad) {
          decodedSources.push(source.imageUrl);
          availableSourcesRef.current = decodedSources;
          if (decodedSources.length === INITIAL_POOL_SIZE) {
            setLoadedSources([...decodedSources]);
          }
        }
      }

      if (!cancelled && decodedSources.length < INITIAL_POOL_SIZE) {
        setLoadedSources([...decodedSources]);
      }
    };

    void preloadSequentially();
    return () => {
      cancelled = true;
    };
  }, [imageSet]);

  useEffect(() => {
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const updatePreference = () => setReduceMotion(motionPreference.matches);
    updatePreference();
    motionPreference.addEventListener("change", updatePreference);
    return () =>
      motionPreference.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (reduceMotion || loadedSources.length === 0) return;
    let animationFrame = 0;
    const now = performance.now();
    const initialSources = availableSourcesRef.current;

    playbackRef.current = Array.from({ length: CELL_COUNT }, (_, index) => ({
      sourceIndex: index % initialSources.length,
      nextChangeAt:
        now +
        Math.random() *
          randomInterval(speedRef.current, diversityRef.current),
    }));

    const animate = (frameTime: number) => {
      for (let index = 0; index < playbackRef.current.length; index += 1) {
        const playback = playbackRef.current[index];
        if (frameTime < playback.nextChangeAt) continue;

        const availableSources = availableSourcesRef.current;
        if (availableSources.length === 0) continue;

        playback.sourceIndex = randomOtherIndex(
          playback.sourceIndex,
          availableSources.length,
        );
        playback.nextChangeAt =
          frameTime +
          randomInterval(speedRef.current, diversityRef.current);

        const image = imageRefs.current[index];
        if (image) image.src = availableSources[playback.sourceIndex];
      }
      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [loadedSources, reduceMotion]);

  const gridStyle = {
    "--columns": COLUMN_COUNT,
    "--rows": ROW_COUNT,
    "--grid-ratio": (COLUMN_COUNT * 9) / (ROW_COUNT * 16),
    "--cell-gap": "0px",
    "--field-background": "#000000",
  } as CSSProperties;

  return (
    <main className={styles.page} style={gridStyle}>
      <div className={styles.grid}>
        {Array.from({ length: CELL_COUNT }, (_, index) => (
          <div className={styles.cell} key={`grid-2-cell-${index + 1}`}>
            {loadedSources.length > 0 ? (
                // The stock/4 source ledger supplies ordinary local images.
                // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={(image) => {
                  imageRefs.current[index] = image;
                }}
                className={styles.media}
                src={loadedSources[index % loadedSources.length]}
                alt=""
                draggable={false}
              />
            ) : null}
          </div>
        ))}
      </div>
      <aside className={styles.parameterPanel} aria-label="Grid parameters">
        <LevaPanel
          collapsed
          flat
          hideCopyButton
          store={controlStore}
          titleBar={{ title: "grid/2" }}
        />
      </aside>
    </main>
  );
}
