import type { PaperFigures, PaperPage } from "../paper";
import { figures as figureComponents } from "./figures";
import data from "./pages.json";

// 2026학년도 대학수학능력시험 수학 영역 홀수형, pages 1–20 (공통 1–8, 확률과 통계
// 9–12, 미적분 13–16, 기하 17–20), extracted from the KICE PDF of 2025-11-13.
export const pages = data as PaperPage[];
export const figures: PaperFigures = figureComponents;
