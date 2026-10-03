import type { AppId } from "../model/catalogue";
import alarm from "./alarm";
import audio from "./audio";
import baby from "./baby";
import bank from "./bank";
import calendar from "./calendar";
import courier from "./courier";
import drift from "./drift";
import foodDelivery from "./food-delivery";
import grocery from "./grocery";
import home from "./home";
import lock from "./lock";
import mail from "./mail";
import meeting from "./meeting";
import messages from "./messages";
import navigation from "./navigation";
import news from "./news";
import photoFeed from "./photo-feed";
import reservation from "./reservation";
import rideHail from "./ride-hail";
import run from "./run";
import school from "./school";
import screenTime from "./screen-time";
import shopping from "./shopping";
import shortVideo from "./short-video";
import socialManager from "./social-manager";
import systemSheet from "./system-sheet";
import teamChat from "./team-chat";
import transit from "./transit";
import wallet from "./wallet";
import weather from "./weather";
import type { CloneDefinition } from "./types";

/** Built clones. Apps missing here render the neutral launch surface. */
export const registry: Partial<Record<AppId, CloneDefinition>> = {
  alarm,
  audio,
  baby,
  bank,
  calendar,
  courier,
  drift,
  "food-delivery": foodDelivery,
  grocery,
  home,
  lock,
  mail,
  meeting,
  messages,
  navigation,
  news,
  "photo-feed": photoFeed,
  reservation,
  "ride-hail": rideHail,
  run,
  school,
  "screen-time": screenTime,
  shopping,
  "short-video": shortVideo,
  "social-manager": socialManager,
  "system-sheet": systemSheet,
  "team-chat": teamChat,
  transit,
  wallet,
  weather,
};
