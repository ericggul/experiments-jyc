import { FOOD_RESOLUTION } from "./parameters.ts";
import type { Random } from "./random.ts";

/** Food on a square grid covering [-1, 1]²; cells outside the dish hold none. */
export type Food = Readonly<{
  capacity: Float32Array;
  level: Float32Array;
  resolution: number;
}>;

export function createFood(random: Random, foodCapacity: number): Food {
  const resolution = FOOD_RESOLUTION;
  const capacity = new Float32Array(resolution * resolution);
  const level = new Float32Array(resolution * resolution);
  for (let row = 0; row < resolution; row += 1) {
    for (let column = 0; column < resolution; column += 1) {
      const x = ((column + 0.5) / resolution) * 2 - 1;
      const y = ((row + 0.5) / resolution) * 2 - 1;
      if (x * x + y * y >= 1) continue;
      const index = row * resolution + column;
      capacity[index] = foodCapacity;
      level[index] = foodCapacity * (0.9 + 0.1 * random());
    }
  }
  return { capacity, level, resolution };
}

export function foodIndex(food: Food, x: number, y: number) {
  const n = food.resolution;
  const column = Math.min(n - 1, Math.max(0, Math.floor(((x + 1) / 2) * n)));
  const row = Math.min(n - 1, Math.max(0, Math.floor(((y + 1) / 2) * n)));
  return row * n + column;
}

/** Bilinear food level at a world point. */
export function sampleFood(food: Food, x: number, y: number) {
  const n = food.resolution;
  const gx = Math.min(n - 1.001, Math.max(0, ((x + 1) / 2) * n - 0.5));
  const gy = Math.min(n - 1.001, Math.max(0, ((y + 1) / 2) * n - 0.5));
  const column = Math.floor(gx);
  const row = Math.floor(gy);
  const fx = gx - column;
  const fy = gy - row;
  const index = row * n + column;
  const top = food.level[index] * (1 - fx) + food.level[index + 1] * fx;
  const bottom = food.level[index + n] * (1 - fx) + food.level[index + n + 1] * fx;
  return top * (1 - fy) + bottom * fy;
}

export function regrowFood(food: Food, rate: number) {
  const { capacity, level } = food;
  for (let index = 0; index < level.length; index += 1) {
    level[index] += rate * (capacity[index] - level[index]);
  }
}
