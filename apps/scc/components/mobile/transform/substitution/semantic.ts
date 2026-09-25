export type CommandGroup = "consumption" | "discipline" | "attention";

export const commandGroups: { id: CommandGroup; label: string; words: readonly string[] }[] = [
  {
    id: "consumption",
    label: "소비",
    words: ["DESIRE", "SEARCH", "FILTER", "COMPARE", "SELECT", "CUSTOMIZE", "ACCUMULATE", "PRICE", "BUY", "CONSUME", "RESERVE", "PAY", "EXCHANGE"],
  },
  {
    id: "discipline",
    label: "규율",
    words: ["OBEY", "CONFORM", "PLAN", "SCHEDULE", "OPTIMIZE", "TRACK", "VERIFY", "COMPLETE", "REPORT", "PERFORM", "COMPLY", "REPEAT"],
  },
  {
    id: "attention",
    label: "주의",
    words: ["WATCH", "SCROLL", "FOLLOW", "LIKE", "SAVE", "REPOST", "REPLY", "SHARE", "POST", "STAY", "RETURN", "AMPLIFY"],
  },
];

type Action = "media" | "title" | "copy" | "search" | "filter" | "select" | "save" | "like" |
  "reply" | "share" | "repost" | "follow" | "post" | "buy" | "book" | "pay" | "price" |
  "plan" | "complete" | "track" | "message" | "profile" | "home" | "scroll" | "back";

const commands: Record<CommandGroup, Record<Action, string>> = {
  consumption: {
    media: "DESIRE", title: "DESIRE", copy: "COMPARE", search: "SEARCH", filter: "FILTER",
    select: "SELECT", save: "ACCUMULATE", like: "DESIRE", reply: "EXCHANGE", share: "EXCHANGE",
    repost: "EXCHANGE", follow: "ACCUMULATE", post: "EXCHANGE", buy: "BUY", book: "RESERVE",
    pay: "PAY", price: "PRICE", plan: "SELECT", complete: "PAY", track: "COMPARE",
    message: "EXCHANGE", profile: "COMPARE", home: "DESIRE", scroll: "SEARCH", back: "SELECT",
  },
  discipline: {
    media: "CONFORM", title: "OBEY", copy: "VERIFY", search: "TRACK", filter: "OPTIMIZE",
    select: "COMPLY", save: "REPEAT", like: "CONFORM", reply: "REPORT", share: "PERFORM",
    repost: "REPEAT", follow: "CONFORM", post: "PERFORM", buy: "OBEY", book: "SCHEDULE",
    pay: "COMPLY", price: "VERIFY", plan: "PLAN", complete: "COMPLETE", track: "TRACK",
    message: "REPORT", profile: "PERFORM", home: "REPEAT", scroll: "REPEAT", back: "COMPLY",
  },
  attention: {
    media: "WATCH", title: "STAY", copy: "WATCH", search: "SCROLL", filter: "SCROLL",
    select: "WATCH", save: "SAVE", like: "LIKE", reply: "REPLY", share: "SHARE",
    repost: "REPOST", follow: "FOLLOW", post: "POST", buy: "STAY", book: "RETURN",
    pay: "STAY", price: "WATCH", plan: "RETURN", complete: "POST", track: "FOLLOW",
    message: "REPLY", profile: "FOLLOW", home: "RETURN", scroll: "SCROLL", back: "RETURN",
  },
};

// The prominent media in each clone has a different invitation. Keep these
// interpretations beside the vocabulary so an experiment can be retuned here.
const cloneMediaCommands: Record<string, Record<CommandGroup, string>> = {
  "1": { consumption: "DESIRE", discipline: "CONFORM", attention: "WATCH" },
  "2": { consumption: "CONSUME", discipline: "COMPLY", attention: "WATCH" },
  "3": { consumption: "RESERVE", discipline: "SCHEDULE", attention: "STAY" },
  "4": { consumption: "ACCUMULATE", discipline: "PLAN", attention: "RETURN" },
  "5": { consumption: "PRICE", discipline: "VERIFY", attention: "WATCH" },
  "6": { consumption: "DESIRE", discipline: "CONFORM", attention: "WATCH" },
  "7": { consumption: "CONSUME", discipline: "COMPLY", attention: "WATCH" },
  "8": { consumption: "RESERVE", discipline: "SCHEDULE", attention: "RETURN" },
  "9": { consumption: "RESERVE", discipline: "OPTIMIZE", attention: "RETURN" },
  "10": { consumption: "PRICE", discipline: "VERIFY", attention: "WATCH" },
  "11": { consumption: "DESIRE", discipline: "PERFORM", attention: "WATCH" },
  "12": { consumption: "DESIRE", discipline: "REPEAT", attention: "WATCH" },
  "13": { consumption: "EXCHANGE", discipline: "REPORT", attention: "SCROLL" },
};

function actionFor(element: Element): Action | null {
  const tag = element.tagName.toLowerCase();
  if (tag === "img" || tag === "video" || tag === "canvas" || tag === "iframe") return "media";
  if (/^h[1-6]$/.test(tag) || element.getAttribute("role") === "heading") return "title";
  if (/^(p|blockquote|figcaption|span|strong|small|time|dt|dd|div)$/.test(tag)) return "copy";
  if (!/^(button|a|input|textarea|select|label|summary)$/.test(tag) && !element.getAttribute("role")) return null;

  const text = [
    element.getAttribute("aria-label"), element.getAttribute("title"),
    element.getAttribute("placeholder"), element.textContent?.slice(0, 120),
  ].filter(Boolean).join(" ").toLowerCase();

  if (/unlike|like|좋아요|하트/.test(text)) return "like";
  if (/comment|reply|respond|댓글|답글|대댓글/.test(text)) return "reply";
  if (/repost|retweet|리포스트|재게시/.test(text)) return "repost";
  if (/share|send|공유|보내기/.test(text)) return "share";
  if (/save|saved|bookmark|favorite|favourite|찜|저장|담은/.test(text)) return "save";
  if (/follow|팔로우|구독/.test(text)) return "follow";
  if (/search|find|검색|찾기|찾아/.test(text)) return "search";
  if (/filter|sort|category|필터|정렬|카테고리|분류/.test(text)) return "filter";
  if (/checkout|결제|지불|계산/.test(text)) return "pay";
  if (/buy|purchase|add to bag|add to cart|order|장바구니|주문|구매|담기/.test(text)) return "buy";
  if (/book|reserve|ticket|예약|예매|좌석/.test(text)) return "book";
  if (/price|offer|bid|가격|제안|흥정/.test(text)) return "price";
  if (/complete|done|finish|완료|끝내/.test(text)) return "complete";
  if (/plan|schedule|calendar|date|일정|날짜|시간/.test(text)) return "plan";
  if (/track|progress|analytics|진행|기록|추적/.test(text)) return "track";
  if (/message|chat|inbox|메시지|채팅|받은 소식/.test(text)) return "message";
  if (/profile|account|my page|프로필|마이페이지|내 여행|내 업무/.test(text)) return "profile";
  if (/home|홈|둘러보기|피드|for you/.test(text)) return "home";
  if (/reels|video|watch|play|next|scroll|다음|재생|영상/.test(text)) return "scroll";
  if (/^open .*post|^view .*post|대표 메뉴|상품 이미지|이미지 보기/.test(text)) return "media";
  if (/back|close|cancel|뒤로|닫기|취소/.test(text)) return "back";
  if (/post|publish|upload|create|compose|글쓰기|작성|등록|올리기|새 업무/.test(text)) return "post";
  if (tag === "input" || tag === "textarea" || tag === "select") return "select";
  if (element.querySelector("img, video")) return "media";
  return text.trim() ? "select" : null;
}

export function commandFor(element: Element, clone: string, group: CommandGroup): string | null {
  const action = actionFor(element);
  if (!action) return null;
  if (action === "media") return cloneMediaCommands[clone]?.[group] || commands[group].media;
  return commands[group][action];
}
