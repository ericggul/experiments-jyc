import assert from "node:assert/strict";
import test from "node:test";
import { signature, structuralCategories } from "./category.ts";

const node = (tagName, className = "", children = []) => {
  const element = { tagName, parentElement: null, children, getAttribute: (name) => (name === "class" ? className : null) };
  for (const child of children) child.parentElement = element;
  return element;
};

// The Rep class list: a time column and three unclassed lines per row.
const classRow = () => {
  const time = node("STRONG");
  const minutes = node("SPAN");
  const lines = [node("P"), node("P"), node("P")];
  return { time, minutes, lines, root: node("BUTTON", "classRow", [node("SPAN", "time", [time, minutes]), node("SPAN", "classInfo", lines)]) };
};

test("rows form one list, while same-tag lines inside each row keep separate roles", () => {
  const rows = [classRow(), classRow(), classRow()];
  const root = node("MAIN", "", [node("DIV", "classList", rows.map((row) => row.root))]);
  const anchors = rows.flatMap((row) => [row.time, row.minutes, ...row.lines]);
  const keys = structuralCategories(root, anchors);

  assert.equal(new Set(rows.map((row) => keys.get(row.time))).size, 1);
  for (const index of [0, 1, 2]) assert.equal(new Set(rows.map((row) => keys.get(row.lines[index]))).size, 1);
  assert.equal(new Set(anchors.map((anchor) => keys.get(anchor))).size, 5);
});

test("a single strip of days or chips merges into one category", () => {
  const days = [1, 2, 3, 4, 5, 6, 7].map(() => node("BUTTON", "", [node("SPAN"), node("B")]));
  const chips = [1, 2, 3].map(() => node("BUTTON"));
  const root = node("MAIN", "", [node("DIV", "week", days), node("DIV", "activities", chips)]);
  const keys = structuralCategories(root, [...days.flatMap((day) => [...day.children]), ...chips]);
  assert.equal(new Set(days.map((day) => keys.get(day.children[0]))).size, 1);
  assert.equal(new Set(days.map((day) => keys.get(day.children[1]))).size, 1);
  assert.equal(new Set(chips.map((chip) => keys.get(chip))).size, 1);
});

test("state classes after the first do not split a category", () => {
  assert.equal(signature(node("BUTTON", "day selected")), signature(node("BUTTON", "day")));
});

test("lists of varying length inside rows stay one category", () => {
  const rows = [3, 5, 2].map((count) => {
    const tags = Array.from({ length: count }, () => node("SPAN", "tag"));
    return { tags, root: node("ARTICLE", "card", [node("DIV", "tags", tags)]) };
  });
  const root = node("MAIN", "", rows.map((row) => row.root));
  const tags = rows.flatMap((row) => row.tags);
  const keys = structuralCategories(root, tags);
  assert.equal(new Set(tags.map((tag) => keys.get(tag))).size, 1);
});
