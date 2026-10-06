import { FOOD_ROWS } from "./parameters.ts";
import type { Random } from "./random.ts";

/** Food on a grid covering the zone [-halfWidth, halfWidth] × [-1, 1]. */
export type Food = Readonly<{
  capacity: Float32Array;
  level: Float32Array;
  columns: number;
  rows: number;
  halfWidth: number;
}>;

export function createFood(random: Random, foodCapacity: number, halfWidth: number): Food {
  const rows = FOOD_ROWS;
  const columns = Math.max(1, Math.round(rows * halfWidth));
  const capacity = new Float32Array(columns * rows).fill(foodCapacity);
  const level = new Float32Array(columns * rows);
  for (let i = 0; i < level.length; i += 1) level[i] = foodCapacity * (0.9 + 0.1 * random());
  return { capacity, level, columns, rows, halfWidth };
}

export function foodColumn(food: Food, x: number) {
  return Math.min(food.columns - 1, Math.max(0, Math.floor(((x + food.halfWidth) / (2 * food.halfWidth)) * food.columns)));
}

export function foodRow(food: Food, y: number) {
  return Math.min(food.rows - 1, Math.max(0, Math.floor(((y + 1) / 2) * food.rows)));
}

export function foodIndex(food: Food, x: number, y: number) {
  return foodRow(food, y) * food.columns + foodColumn(food, x);
}

/** Bilinear food level at a zone point. */
export function sampleFood(food: Food, x: number, y: number) {
  const { columns, rows } = food;
  const gx = Math.min(columns - 1.001, Math.max(0, ((x + food.halfWidth) / (2 * food.halfWidth)) * columns - 0.5));
  const gy = Math.min(rows - 1.001, Math.max(0, ((y + 1) / 2) * rows - 0.5));
  const column = Math.floor(gx);
  const row = Math.floor(gy);
  const fx = gx - column;
  const fy = gy - row;
  const index = row * columns + column;
  const next = column + 1 < columns ? 1 : 0;
  const below = row + 1 < rows ? columns : 0;
  const top = food.level[index] * (1 - fx) + food.level[index + next] * fx;
  const bottom = food.level[index + below] * (1 - fx) + food.level[index + below + next] * fx;
  return top * (1 - fy) + bottom * fy;
}

export function regrowFood(food: Food, rate: number) {
  const { capacity, level } = food;
  for (let index = 0; index < level.length; index += 1) {
    level[index] += rate * (capacity[index] - level[index]);
  }
}
