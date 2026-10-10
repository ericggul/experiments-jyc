"use client";

import { useEffect, useState } from "react";
import { clonePages, images, videoById, type ClonePage } from "../model/catalogue";
import Ad from "./ad";
import Article from "./article";
import Community from "./community";
import Google from "./google";
import ImageFile from "./image";
import Jobs from "./jobs";
import Listicle from "./listicle";
import Slack from "./slack";
import Stock from "./stock";
import VideoFile from "./video";
import YouTube from "./youtube";

// The page a cloned window shows. Which service, for which keyword, which
// video or image, and whether sound is allowed all come from the query.

export type WindowParams = { page: ClonePage; keyword: string; seed: number; video?: string; image?: number; sound: boolean; zoom: number };

function readParams(): WindowParams | null {
  const query = new URLSearchParams(window.location.search);
  const page = query.get("page") ?? "";
  const keyword = (query.get("k") ?? "").trim();
  const seed = Number(query.get("s") ?? 1);
  const video = query.get("v") ?? undefined;
  const image = query.has("img") ? Number(query.get("img")) : undefined;
  if (!(clonePages as readonly string[]).includes(page) || !keyword || keyword.length > 40 || !Number.isInteger(seed)) return null;
  if (video && !videoById(video)) return null;
  if (image !== undefined && !(Number.isInteger(image) && image >= 0 && image < images.length)) return null;
  const zoom = Number(query.get("z") ?? 1);
  if (!(zoom >= 0.3 && zoom <= 1)) return null;
  return { page: page as ClonePage, keyword, seed, video, image, sound: query.get("sound") === "1", zoom };
}

const components = { slack: Slack, article: Article, google: Google, youtube: YouTube, ad: Ad, listicle: Listicle, jobs: Jobs, stock: Stock, community: Community, image: ImageFile, video: VideoFile } as const;

export default function HypeWindow() {
  const [params] = useState(readParams);
  useEffect(() => {
    if (!params) document.title = "​";
    // A narrow window shows the page zoomed out, as a small browser would not.
    document.documentElement.style.zoom = params && params.zoom < 1 && params.page !== "image" && params.page !== "video" ? String(params.zoom) : "";
  }, [params]);
  if (!params) return null;
  const Page = components[params.page];
  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lato:wght@400;700;900&family=Roboto:wght@400;500;700&family=Noto+Sans+KR:wght@400;500;700&display=swap" />
      <Page {...params} />
    </>
  );
}
