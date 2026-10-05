"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  cableRoutes,
  layerDefinitions,
  newsChannels,
  pipelineRoutes,
  referencePoints,
  strikeRoutes,
  theaterPostures,
  webcamFeeds,
  worldBriefSignals,
  type LayerId,
  type NewsChannel,
  type SituationPoint,
} from "../model/operations-data";
import styles from "./operations-workbench.module.css";

type GeoGeometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
};

type GeoFeatureCollection = {
  features: { geometry: GeoGeometry | null }[];
};

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 1000;

function mapViewDimensions(zoom: number, aspect: number): [number, number] {
  const extent = MAP_WIDTH / zoom;
  return aspect >= 1
    ? [extent, extent / aspect]
    : [extent * aspect, extent];
}

function clampMapCenter(
  center: [number, number],
  viewWidth: number,
  viewHeight: number,
): [number, number] {
  return [
    Math.min(Math.max(center[0], viewWidth / 2), MAP_WIDTH - viewWidth / 2),
    Math.min(Math.max(center[1], viewHeight / 2), MAP_HEIGHT - viewHeight / 2),
  ];
}

function project(lon: number, lat: number): [number, number] {
  const clampedLat = Math.max(-84, Math.min(84, lat));
  const sin = Math.sin((clampedLat * Math.PI) / 180);
  const x = ((lon + 180) / 360) * MAP_WIDTH;
  const y =
    (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) *
    MAP_HEIGHT;
  return [x, y];
}

function ringPath(ring: number[][]) {
  return ring
    .map(([lon, lat], index) => {
      const [x, y] = project(lon, lat);
      return `${index ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function geometryPath(geometry: GeoGeometry) {
  if (geometry.type === "Polygon") {
    return (geometry.coordinates as number[][][])
      .map((ring) => `${ringPath(ring)} Z`)
      .join(" ");
  }
  return (geometry.coordinates as number[][][][])
    .flatMap((polygon) => polygon.map((ring) => `${ringPath(ring)} Z`))
    .join(" ");
}

function routePath(coordinates: number[][]) {
  return coordinates
    .map(([lon, lat], index) => {
      const [x, y] = project(lon, lat);
      return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function markerGlyph(layer: LayerId) {
  switch (layer) {
    case "strikes":
      return <path d="M0 -6 5 0 0 6 -5 0Z" />;
    case "bases":
      return <path d="M0 -5.5 5 4 -5 4Z" />;
    case "nuclear":
      return (
        <>
          <circle r="4.5" />
          <circle className={styles.markerCore} r="1.45" />
        </>
      );
    case "datacenters":
      return <rect x="-4" y="-4" width="8" height="8" />;
    case "spaceports":
      return <path d="M-4 5 0 -6 4 5 0 2Z" />;
    case "natural":
      return <path d="M0 -5.5 5 4.5 -5 4.5Z" />;
    case "conflicts":
      return <path d="M0 -5 5 0 0 5 -5 0Z" />;
    default:
      return <circle r={layer === "hotspots" ? 4.5 : 3.4} />;
  }
}

function embedUrl(videoId: string, autoplay = true) {
  const params = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    mute: "1",
    controls: "0",
    modestbranding: "1",
    playsinline: "1",
    rel: "0",
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

function LiveNewsMedia({ channel }: { channel: NewsChannel }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<"hls" | "youtube">(
    channel.hlsUrl ? "hls" : "youtube",
  );

  useEffect(() => {
    if (mode !== "hls" || !channel.hlsUrl) return;
    const video = videoRef.current;
    if (!video) return;
    const media = video;
    let active = true;
    let hls: import("hls.js").default | null = null;
    const fallback = () => {
      if (active) setMode("youtube");
    };
    const readyTimeout = window.setTimeout(fallback, 12000);
    const ready = () => window.clearTimeout(readyTimeout);
    media.addEventListener("playing", ready, { once: true });

    async function start() {
      if (media.canPlayType("application/vnd.apple.mpegurl")) {
        media.src = channel.hlsUrl!;
        await media.play().catch(fallback);
        return;
      }

      const { default: Hls } = await import("hls.js");
      if (!active || !Hls.isSupported()) {
        fallback();
        return;
      }
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) fallback();
      });
      hls.loadSource(channel.hlsUrl!);
      hls.attachMedia(media);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        void media.play().catch(fallback);
      });
    }

    void start().catch(fallback);
    return () => {
      active = false;
      window.clearTimeout(readyTimeout);
      media.removeEventListener("playing", ready);
      hls?.destroy();
      media.removeAttribute("src");
      media.load();
    };
  }, [channel.hlsUrl, mode]);

  if (mode === "youtube") {
    return (
      <>
        <iframe
          src={embedUrl(channel.videoId)}
          title={`${channel.label} live news`}
          allow="autoplay; encrypted-media; picture-in-picture"
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
        <span className={styles.streamTransport}>YOUTUBE FALLBACK</span>
      </>
    );
  }

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onError={() => setMode("youtube")}
      />
      <span className={styles.streamTransport}>DIRECT HLS</span>
    </>
  );
}

function PanelHeader({
  title,
  live,
  count,
  action,
}: {
  title: string;
  live?: boolean;
  count?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className={styles.panelHeader}>
      <div>
        <span className={styles.grip}>⠿</span>
        <h2>{title}</h2>
        {count ? <b>{count}</b> : null}
      </div>
      <div>
        {live ? <span className={styles.livePill}>LIVE</span> : null}
        {action}
        <button type="button" aria-label={`Expand ${title}`}>⛶</button>
      </div>
    </header>
  );
}

function SituationalMap({
  enabledLayers,
  mapMode,
  now,
  points,
  onSelect,
  selected,
  timeRange,
}: {
  enabledLayers: Set<LayerId>;
  mapMode: "2D" | "3D";
  now: number;
  points: SituationPoint[];
  onSelect: (point: SituationPoint) => void;
  selected: SituationPoint | null;
  timeRange: string;
}) {
  const [countryPaths, setCountryPaths] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([500, 445]);
  const [mapAspect, setMapAspect] = useState(3.4);
  const [dragging, setDragging] = useState(false);
  const mapShellRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerX: number;
    pointerY: number;
    center: [number, number];
  } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/data/worldmonitor-countries.geojson")
      .then((response) => response.json() as Promise<GeoFeatureCollection>)
      .then((data) => {
        if (!active) return;
        setCountryPaths(
          data.features
            .filter((feature) => feature.geometry)
            .map((feature) => geometryPath(feature.geometry!)),
        );
      })
      .catch(() => setCountryPaths([]));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const shell = mapShellRef.current;
    if (!shell) return;
    const updateAspect = () => {
      const { width, height } = shell.getBoundingClientRect();
      if (width > 0 && height > 0) {
        const nextAspect = Math.max(.45, Math.min(5.2, width / height));
        const [nextViewWidth, nextViewHeight] = mapViewDimensions(zoom, nextAspect);
        setMapAspect(nextAspect);
        setCenter((current) => clampMapCenter(current, nextViewWidth, nextViewHeight));
      }
    };
    updateAspect();
    const observer = new ResizeObserver(updateAspect);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [zoom]);

  const signals = useMemo(() => {
    const rangeHours = timeRange === "1H" ? 1
      : timeRange === "6H" ? 6
        : timeRange === "24H" ? 24
          : timeRange === "48H" ? 48
            : timeRange === "7D" ? 168
              : Number.POSITIVE_INFINITY;
    return referencePoints
      .filter((point) =>
        (point.layer === "hotspots" || point.layer === "conflicts" || point.layer === "strikes") &&
        enabledLayers.has(point.layer),
      )
      .flatMap((point, pointIndex) =>
        Array.from({ length: point.layer === "hotspots" ? 18 : 12 }, (_, index) => {
          const angle = ((index * 137.5 + pointIndex * 29) * Math.PI) / 180;
          const radius = .28 + ((index * 17 + pointIndex * 13) % 18) * .16;
          return {
            id: `${point.id}-signal-${index}`,
            lon: point.lon + Math.cos(angle) * radius,
            lat: point.lat + Math.sin(angle) * radius * .62,
            delay: `${((index + pointIndex) % 13) * -.17}s`,
            ageHours: index === 0 ? .25 : 1 + ((index * 13 + pointIndex * 19) % 168),
            size: 1.35 + ((index * 7 + pointIndex) % 4) * .42,
            tone: point.layer === "strikes"
              ? "alert"
              : index % 5 === 0
                ? "activity"
                : "intel",
          };
        }),
      )
      .filter((signal) => signal.ageHours <= rangeHours);
  }, [enabledLayers, timeRange]);

  const rangeHours = timeRange === "1H" ? 1
    : timeRange === "6H" ? 6
      : timeRange === "24H" ? 24
        : timeRange === "48H" ? 48
          : timeRange === "7D" ? 168
            : Number.POSITIVE_INFINITY;
  const cutoff = now - rangeHours * 60 * 60 * 1000;
  const visiblePoints = points.filter(
    (point) =>
      (enabledLayers.has(point.layer) ||
        point.layer === "earthquakes" ||
        point.layer === "natural") &&
      (!point.timestamp || point.timestamp >= cutoff),
  );
  const [viewWidth, viewHeight] = mapViewDimensions(zoom, mapAspect);
  const viewBox = `${center[0] - viewWidth / 2} ${center[1] - viewHeight / 2} ${viewWidth} ${viewHeight}`;

  function focus(lon: number, lat: number, nextZoom: number) {
    setCenter(project(lon, lat));
    setZoom(nextZoom);
  }

  function clampCenter(
    nextCenter: [number, number],
    nextViewWidth = viewWidth,
    nextViewHeight = viewHeight,
  ): [number, number] {
    return clampMapCenter(nextCenter, nextViewWidth, nextViewHeight);
  }

  return (
    <div ref={mapShellRef} className={`${styles.mapShell} ${mapMode === "3D" ? styles.globeMode : ""}`}>
      <div className={styles.mapQuickTools}>
        <button type="button" onClick={() => focus(51, 31, 2.4)}>⌖</button>
        <button type="button" onClick={() => focus(0, 20, 1)}>⌂</button>
      </div>
      <div className={styles.zoomControls}>
        <button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(4, value * 1.35))}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(1, value / 1.35))}>−</button>
      </div>
      <svg
        className={`${styles.worldMap} ${dragging ? styles.draggingMap : ""}`}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Global situation map with conflict, infrastructure, and natural-event layers"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current = {
            pointerX: event.clientX,
            pointerY: event.clientY,
            center,
          };
          setDragging(true);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!dragging || !drag) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const deltaX = ((event.clientX - drag.pointerX) / bounds.width) * viewWidth;
          const deltaY = ((event.clientY - drag.pointerY) / bounds.height) * viewHeight;
          setCenter(clampCenter([
            drag.center[0] - deltaX,
            drag.center[1] - deltaY,
          ]));
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId);
          dragRef.current = null;
          setDragging(false);
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          setDragging(false);
        }}
        onWheel={(event) => {
          event.preventDefault();
          const nextZoom = Math.min(4, Math.max(1, zoom * (event.deltaY < 0 ? 1.18 : .86)));
          const [nextViewWidth, nextViewHeight] = mapViewDimensions(nextZoom, mapAspect);
          setCenter((current) => clampCenter(current, nextViewWidth, nextViewHeight));
          setZoom(nextZoom);
        }}
      >
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} className={styles.mapOcean} />
        <g className={styles.graticule}>
          {[-120, -60, 0, 60, 120].map((lon) => {
            const [x] = project(lon, 0);
            return <line key={`lon-${lon}`} x1={x} x2={x} y1="0" y2={MAP_HEIGHT} />;
          })}
          {[-45, 0, 45].map((lat) => {
            const [, y] = project(0, lat);
            return <line key={`lat-${lat}`} x1="0" x2={MAP_WIDTH} y1={y} y2={y} />;
          })}
        </g>
        <g className={styles.countries}>
          {countryPaths.map((path, index) => <path key={`country-${index}`} d={path} />)}
        </g>

        {enabledLayers.has("strikes") ? (
          <g className={styles.strikeLines}>
            {strikeRoutes.map((route) => (
              <path key={route.id} d={routePath(route.coordinates.map((coordinate) => [...coordinate]))} />
            ))}
          </g>
        ) : null}

        {enabledLayers.has("conflicts") ? (
          <g className={styles.conflictZones}>
            {referencePoints.filter((point) => point.layer === "conflicts").map((point, index) => {
              const [x, y] = project(point.lon, point.lat);
              const rotation = (index * 29) % 110 - 55;
              return (
                <g key={`${point.id}-zone`} transform={`translate(${x} ${y}) rotate(${rotation})`}>
                  <ellipse rx="29" ry="15" />
                  <ellipse className={styles.zoneCore} cx="5" cy="-2" rx="17" ry="10" />
                  <ellipse className={styles.zoneEdge} cx="-10" cy="5" rx="13" ry="7" />
                </g>
              );
            })}
          </g>
        ) : null}

        {enabledLayers.has("cables") ? (
          <g className={styles.cableLines}>
            {cableRoutes.map((route) => <path key={route.id} d={routePath(route.coordinates)} />)}
          </g>
        ) : null}
        {enabledLayers.has("pipelines") ? (
          <g className={styles.pipelineLines}>
            {pipelineRoutes.map((route) => <path key={route.id} d={routePath(route.coordinates)} />)}
          </g>
        ) : null}

        {signals.length ? (
          <g className={styles.signalCloud}>
            {signals.map((signal) => {
              const [x, y] = project(signal.lon, signal.lat);
              return (
                <circle
                  key={signal.id}
                  className={styles[`signal_${signal.tone}`]}
                  cx={x}
                  cy={y}
                  r={signal.size}
                  style={{ animationDelay: signal.delay }}
                />
              );
            })}
          </g>
        ) : null}

        <g className={styles.mapPoints}>
          {visiblePoints.map((point) => {
            const [x, y] = project(point.lon, point.lat);
            return (
              <g
                key={point.id}
                className={`${styles.mapPoint} ${styles[`layer_${point.layer}`]} ${styles[`level_${point.level}`]} ${selected?.id === point.id ? styles.selectedPoint : ""}`}
                transform={`translate(${x} ${y})`}
                role="button"
                tabIndex={0}
                aria-label={`${point.name}, ${point.country}`}
                onClick={() => onSelect(point)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") onSelect(point);
                }}
              >
                {markerGlyph(point.layer)}
                {(point.layer === "strikes" || point.level === "high") ? <circle className={styles.pointPulse} r="8" /> : null}
              </g>
            );
          })}
        </g>

        <g className={styles.countryLabels}>
          {[
            ["UNITED STATES", -101, 39], ["MEXICO", -102, 23], ["VENEZUELA", -66, 7],
            ["BRAZIL", -52, -11], ["FRANCE", 2, 46], ["ALGERIA", 2, 28],
            ["RUSSIA", 84, 61], ["KAZAKHSTAN", 67, 48], ["IRAN", 54, 32],
            ["SAUDI ARABIA", 45, 24], ["INDIA", 79, 22], ["CHINA", 104, 35],
            ["INDONESIA", 117, -3], ["AUSTRALIA", 134, -25],
          ].map(([name, lon, lat]) => {
            const [x, y] = project(Number(lon), Number(lat));
            return <text key={String(name)} x={x} y={y}>{name}</text>;
          })}
        </g>
        <g className={styles.oceanLabels}>
          {[
            ["NORTH PACIFIC", -155, 17], ["ATLANTIC OCEAN", -31, 8],
            ["INDIAN OCEAN", 78, -22], ["SOUTH PACIFIC", -132, -30],
          ].map(([name, lon, lat]) => {
            const [x, y] = project(Number(lon), Number(lat));
            return <text key={String(name)} x={x} y={y}>{name}</text>;
          })}
        </g>
        <g className={styles.cityLabels}>
          {[
            ["New York", -74, 40.7], ["Los Angeles", -118.2, 34], ["Mexico City", -99.1, 19.4],
            ["London", -.1, 51.5], ["Moscow", 37.6, 55.8], ["Tehran", 51.4, 35.7],
            ["Cairo", 31.2, 30], ["Mumbai", 72.9, 19], ["Beijing", 116.4, 39.9],
            ["Shanghai", 121.5, 31.2], ["Manila", 121, 14.6], ["Singapore", 103.8, 1.35],
            ["Bogotá", -74.1, 4.7], ["Rio de Janeiro", -43.2, -22.9],
          ].map(([name, lon, lat]) => {
            const [x, y] = project(Number(lon), Number(lat));
            return <text key={String(name)} x={x} y={y}>{name}</text>;
          })}
        </g>
      </svg>

      {selected ? (
        <div className={styles.mapPopup}>
          <span>{selected.layer.toUpperCase()} · {selected.level.toUpperCase()}</span>
          <strong>{selected.name}</strong>
          <p>{selected.detail}</p>
          <small>{selected.lat.toFixed(2)}, {selected.lon.toFixed(2)} · {selected.country}</small>
        </div>
      ) : null}

      <div className={styles.mapLegend}>
        <span>Legend</span>
        <b><i className={styles.legendHigh} /> High alert</b>
        <b><i className={styles.legendElevated} /> Elevated</b>
        <b><i className={styles.legendMonitoring} /> Monitoring</b>
        <b>▲ Base</b><b>● Nuclear</b><b>□ Datacenter</b><b>✦ Aircraft</b>
      </div>
    </div>
  );
}

export default function OperationsWorkbench() {
  const [utc, setUtc] = useState("");
  const [now, setNow] = useState(0);
  const [timeRange, setTimeRange] = useState("7D");
  const [mapMode, setMapMode] = useState<"2D" | "3D">("2D");
  const [selected, setSelected] = useState<SituationPoint | null>(referencePoints[0]);
  const [activeNews, setActiveNews] = useState<NewsChannel>(
    newsChannels.find((channel) => channel.id === "aljazeera")!,
  );
  const [newsPlaying, setNewsPlaying] = useState(true);
  const [webcamRegion, setWebcamRegion] = useState("all");
  const [webcamPage, setWebcamPage] = useState(0);
  const [enabledLayers, setEnabledLayers] = useState<Set<LayerId>>(
    () => new Set(layerDefinitions.filter((layer) => layer.defaultEnabled).map((layer) => layer.id)),
  );
  const [dynamicPoints, setDynamicPoints] = useState<SituationPoint[]>([]);
  const [feedStatus, setFeedStatus] = useState("FETCHING");

  useEffect(() => {
    const update = () => {
      const nextNow = Date.now();
      setNow(nextNow);
      setUtc(new Date(nextNow).toUTCString().replace("GMT", "UTC").toUpperCase());
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadPublicFeeds() {
      const next: SituationPoint[] = [];
      try {
        const quakeResponse = await fetch(
          "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
          { signal: controller.signal },
        );
        const quakeData = await quakeResponse.json() as {
          features: {
            id: string;
            properties: { mag: number | null; place: string; time: number };
            geometry: { coordinates: [number, number, number] };
          }[];
        };
        quakeData.features
          .filter((feature) => (feature.properties.mag ?? 0) >= 2.5)
          .slice(0, 45)
          .forEach((feature) => {
            const [lon, lat, depth] = feature.geometry.coordinates;
            next.push({
              id: `usgs-${feature.id}`,
              layer: "earthquakes",
              name: `M${(feature.properties.mag ?? 0).toFixed(1)} earthquake`,
              country: feature.properties.place,
              lat,
              lon,
              level: (feature.properties.mag ?? 0) >= 5 ? "elevated" : "monitoring",
              detail: `USGS all-day feed · depth ${depth.toFixed(0)} km`,
              timestamp: feature.properties.time,
            });
          });
      } catch {
        // The static reference layers remain available if the public feed is unreachable.
      }

      try {
        const eventResponse = await fetch(
          "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=60",
          { signal: controller.signal },
        );
        const eventData = await eventResponse.json() as {
          events: {
            id: string;
            title: string;
            categories: { title: string }[];
            geometry: { coordinates: [number, number]; date?: string }[];
          }[];
        };
        eventData.events.slice(0, 35).forEach((event) => {
          const latest = event.geometry.at(-1);
          if (!latest) return;
          next.push({
            id: `eonet-${event.id}`,
            layer: "natural",
            name: event.title,
            country: event.categories[0]?.title ?? "Natural event",
            lat: latest.coordinates[1],
            lon: latest.coordinates[0],
            level: "monitoring",
            detail: "NASA EONET open-event feed",
            timestamp: latest.date ? Date.parse(latest.date) : undefined,
          });
        });
      } catch {
        // Keep partial USGS results if EONET is unavailable.
      }

      if (!controller.signal.aborted) {
        setDynamicPoints(next);
        setFeedStatus(next.length ? `${next.length} EVENTS` : "STATIC FALLBACK");
      }
    }
    void loadPublicFeeds();
    return () => controller.abort();
  }, []);

  const points = useMemo(() => [...referencePoints, ...dynamicPoints], [dynamicPoints]);
  const alertCount = points.filter(
    (point) => point.level === "high" || point.level === "elevated",
  ).length;
  const highRiskShare = Math.round(
    (points.filter((point) => point.level === "high").length / Math.max(points.length, 1)) * 100,
  );
  const filteredWebcams = webcamFeeds.filter(
    (feed) => webcamRegion === "all" || feed.region === webcamRegion,
  );
  const webcamPageCount = Math.max(1, Math.ceil(filteredWebcams.length / 4));
  const normalizedWebcamPage = webcamPage % webcamPageCount;
  const pageWebcams = filteredWebcams.slice(
    normalizedWebcamPage * 4,
    normalizedWebcamPage * 4 + 4,
  );
  const activeWebcams = [
    ...pageWebcams,
    ...webcamFeeds.filter((feed) => !pageWebcams.includes(feed)),
  ].slice(0, 4);

  function toggleLayer(layerId: LayerId) {
    setEnabledLayers((current) => {
      const next = new Set(current);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  }

  return (
    <main className={styles.monitor}>
      <nav className={styles.appBar} aria-label="Global monitor navigation">
        <div className={styles.brand}><span>◈</span> WORLD</div>
        <button type="button" className={styles.navIcon}>▣</button>
        <button type="button" className={styles.navIcon}>▤</button>
        <strong>MONITOR</strong>
        <small>v2.5.25</small>
        <span className={styles.handle}>@eliehabib</span>
        <span className={styles.github}>●</span>
        <span className={styles.liveState}><i /> LIVE</span>
        <button type="button" className={styles.scopeButton}>Global⌄</button>
        <span className={styles.defcon}>◈ DEFCON 5 <small>{highRiskShare}%</small></span>
        <span className={styles.alertCount}>◆ {alertCount}</span>
        <span className={styles.silicon}>⌄ • Silicon</span>
        <button type="button" className={styles.utility}>⌘ Search</button>
        <button type="button" className={styles.utility}>Link</button>
        <button type="button" className={styles.utility}>☼</button>
        <button type="button" className={styles.utility}>▣</button>
        <button type="button" className={styles.utility}>⚙</button>
      </nav>

      <header className={styles.situationBar}>
        <div className={styles.situationTitle}>
          <strong>GLOBAL SITUATION</strong>
          <span>{feedStatus}</span>
        </div>
        <time>{utc}</time>
        <div className={styles.situationActions}>
          {(["2D", "3D"] as const).map((mode) => (
            <button
              type="button"
              key={mode}
              className={mapMode === mode ? styles.activeSituationMode : ""}
              onClick={() => setMapMode(mode)}
            >
              {mode}
            </button>
          ))}
          <button type="button" aria-label="Fit map">⌗</button>
          <button type="button" aria-label="Map settings">⚙</button>
        </div>
      </header>

      <section className={styles.mapSection}>
        <aside className={styles.layerPanel}>
          <div className={styles.timeRange}>
            {["1H", "6H", "24H", "48H", "7D", "ALL"].map((range) => (
              <button
                type="button"
                key={range}
                className={range === timeRange ? styles.activeRange : ""}
                onClick={() => setTimeRange(range)}
              >
                {range}
              </button>
            ))}
          </div>
          <div className={styles.layerTitle}><span>LAYERS</span><b>{enabledLayers.size}</b><button type="button">⌄</button></div>
          <div className={styles.layerList}>
            {layerDefinitions.map((layer) => (
              <label key={layer.id} className={enabledLayers.has(layer.id) ? styles.layerEnabled : ""}>
                <input
                  type="checkbox"
                  checked={enabledLayers.has(layer.id)}
                  onChange={() => toggleLayer(layer.id)}
                />
                <span>{layer.glyph}</span>
                <b>{layer.label}</b>
                {layer.dynamic ? <small>API</small> : null}
              </label>
            ))}
          </div>
          <footer><i /> Elie Habib · Someone°</footer>
        </aside>
        <SituationalMap
          enabledLayers={enabledLayers}
          mapMode={mapMode}
          now={now}
          points={points}
          onSelect={setSelected}
          selected={selected}
          timeRange={timeRange}
        />
      </section>

      <section className={styles.bottomGrid}>
        <article className={styles.newsPanel}>
          <PanelHeader
            title="LIVE NEWS"
            live={newsPlaying}
            action={
              <button type="button" onClick={() => setNewsPlaying((value) => !value)}>
                {newsPlaying ? "Ⅱ" : "▶"}
              </button>
            }
          />
          <div className={styles.mediaTabs}>
            {newsChannels.map((channel) => (
              <button
                type="button"
                key={channel.id}
                className={channel.id === activeNews.id ? styles.activeMediaTab : ""}
                onClick={() => {
                  setActiveNews(channel);
                  setNewsPlaying(true);
                }}
              >
                {channel.label}
              </button>
            ))}
            <button type="button">⚙</button>
          </div>
          <div className={styles.newsPlayer}>
            {newsPlaying ? (
              <LiveNewsMedia key={activeNews.id} channel={activeNews} />
            ) : (
              <button type="button" className={styles.pausedMedia} onClick={() => setNewsPlaying(true)}>
                <span>▶</span> Resume {activeNews.label}
              </button>
            )}
            <span className={styles.videoNetwork}>{activeNews.label.toUpperCase()} · LIVE</span>
          </div>
        </article>

        <article className={styles.webcamPanel}>
          <PanelHeader title="LIVE WEBCAMS" live count={`${webcamFeeds.length}`} />
          <div className={styles.webcamToolbar}>
            <div>
              {[
                ["all", "ALL"], ["mideast", "MIDEAST"], ["europe", "EUROPE"],
                ["americas", "AMERICAS"], ["asia", "ASIA"], ["space", "SPACE"],
              ].map(([region, label]) => (
                <button
                  type="button"
                  key={region}
                  className={webcamRegion === region ? styles.activeWebcamTab : ""}
                  onClick={() => {
                    setWebcamRegion(region);
                    setWebcamPage(0);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="Next webcam page"
              onClick={() => setWebcamPage((page) => (page + 1) % webcamPageCount)}
            >
              {normalizedWebcamPage + 1}/{webcamPageCount} ›
            </button>
          </div>
          <div className={styles.webcamGrid}>
            {activeWebcams.map((feed) => (
              <div key={feed.id}>
                <iframe
                  src={embedUrl(feed.videoId)}
                  title={`${feed.city} live webcam`}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  loading="eager"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
                <span><i /> {feed.city.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </article>

        <aside className={styles.insightsPanel}>
          <PanelHeader title="AI INSIGHTS" count="SOURCED" />
          <section className={styles.worldBrief}>
            <header><span>◆ WORLD BRIEF</span><b>23 JUL</b></header>
            <p>
              U.S.–Iran escalation and Red Sea disruption are increasing pressure
              on Gulf shipping and energy prices. Diplomatic talks in Manila
              simultaneously cover the Middle East, Ukraine, and a new South
              China Sea clash.
            </p>
            <footer>AP · Reuters · Al Jazeera · 23 Jul 2026</footer>
            <div className={styles.briefLedger}>
              {worldBriefSignals.map((signal) => (
                <article key={signal.id}>
                  <span>{signal.source}</span>
                  <b>{signal.region}</b>
                  <p>{signal.text}</p>
                </article>
              ))}
            </div>
          </section>
          <PanelHeader title="AI STRATEGIC POSTURE" count="3 THEATERS" />
          <div className={styles.postureList}>
            {theaterPostures.map((posture) => (
              <article key={posture.id}>
                <header><strong>{posture.name}</strong><b>{posture.level}</b></header>
                <dl>
                  <div><dt>AIR</dt><dd>✈ {posture.aircraft}</dd></div>
                  <div><dt>SEA</dt><dd>▲ {posture.vessels}</dd></div>
                </dl>
                <footer><span>↗ {posture.trend}</span><em>OSINT snapshot</em></footer>
              </article>
            ))}
          </div>
          <section className={styles.sourceHealth}>
            <span><i /> PUBLIC FEEDS</span>
            <b>{dynamicPoints.length} dynamic events</b>
          </section>
        </aside>
      </section>
    </main>
  );
}
