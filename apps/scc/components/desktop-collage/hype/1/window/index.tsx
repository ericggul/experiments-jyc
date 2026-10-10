"use client";

import { useEffect, useState } from "react";
import { clonePages, videoById, type ClonePage } from "../model/catalogue";
import Ad from "./ad";
import Article from "./article";
import Google from "./google";
import Slack from "./slack";
import YouTube from "./youtube";

// The page a cloned window shows. Which service, for which keyword, which
// video and whether sound is allowed all come from the query.

export type WindowParams = { page: ClonePage; keyword: string; seed: number; video?: string; sound: boolean; zoom: number };

function readParams(): WindowParams | null {
  const query = new URLSearchParams(window.location.search);
  const page = query.get("page") ?? "";
  const keyword = (query.get("k") ?? "").trim();
  const seed = Number(query.get("s") ?? 1);
  const video = query.get("v") ?? undefined;
  if (!(clonePages as readonly string[]).includes(page) || !keyword || keyword.length > 40 || !Number.isInteger(seed)) return null;
  if (video && !videoById(video)) return null;
  const zoom = Number(query.get("z") ?? 1);
  if (!(zoom >= 0.3 && zoom <= 1)) return null;
  return { page: page as ClonePage, keyword, seed, video, sound: query.get("sound") === "1", zoom };
}

export default function HypeWindow() {
  const [params] = useState(readParams);
  useEffect(() => {
    if (!params) document.title = "\u200b";
    // A narrow window shows the page zoomed out, as a small browser would not.
    document.documentElement.style.zoom = params && params.zoom < 1 ? String(params.zoom) : "";
  }, [params]);
  if (!params) return null;
  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lato:wght@400;700;900&family=Roboto:wght@400;500;700&display=swap" />
      {params.page === "slack" ? <Slack {...params} /> : params.page === "article" ? <Article {...params} /> : params.page === "google" ? <Google {...params} /> : params.page === "youtube" ? <YouTube {...params} /> : <Ad {...params} />}
    </>
  );
}
