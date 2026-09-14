import { calendarExperiment } from "./calendar/index.mjs";
import { cameraMonolithExperiment } from "./camera-monolith/index.mjs";
import { djExperiment } from "./dj/index.mjs";
import { djTwoExperiment } from "./dj/2/index.mjs";
import { djThreeExperiment } from "./dj/3/index.mjs";
import { fingerSkatingExperiment } from "./finger-skating/index.mjs";
import { fingerSkatingFieldOneExperiment } from "./finger-skating/field/index.mjs";
import { networkSystemCompetitiveFirmsExperiment } from "./network-system/competitive-firms/index.mjs";
import { networkSystemCycleExperiment } from "./network-system/cycle/index.mjs";
import { networkSystemDefaultExperiment } from "./network-system/default/index.mjs";
import { networkSystemMacroEconomyExperiment } from "./network-system/macro-economy/index.mjs";
import { networkSystemPopulationExperiment } from "./network-system/population/index.mjs";
import { stockExperiment } from "./stock/index.mjs";

export const sccExperiments = Object.freeze([
  cameraMonolithExperiment,
  fingerSkatingExperiment,
  fingerSkatingFieldOneExperiment,
  djExperiment,
  djTwoExperiment,
  djThreeExperiment,
  calendarExperiment,
  stockExperiment,
  networkSystemMacroEconomyExperiment,
  networkSystemCycleExperiment,
  networkSystemDefaultExperiment,
  networkSystemPopulationExperiment,
  networkSystemCompetitiveFirmsExperiment,
]);
