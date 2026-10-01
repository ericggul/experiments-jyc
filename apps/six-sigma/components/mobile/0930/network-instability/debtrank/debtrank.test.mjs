import assert from "node:assert/strict";
import test from "node:test";
import { cascade, debtRanks } from "./debtrank.ts";
import { impacts, institutions } from "./network.ts";

test("each institution propagates once, so a two-cycle cannot double count", () => {
  const pair = [{ id: 0, value: 0.5, core: false }, { id: 1, value: 0.5, core: false }];
  const links = [{ id: "0>1", from: 0, to: 1, weight: 0.4 }, { id: "1>0", from: 1, to: 0, weight: 0.4 }];
  const { rounds, debtRank } = cascade(pair, links, 0);
  assert.equal(rounds.length, 3);
  assert.ok(Math.abs(debtRank - 0.2) < 1e-12);
});

test("the network has a core that is too central to fail and a periphery that is not", () => {
  const ranks = debtRanks(institutions, impacts);
  const core = institutions.filter((item) => item.core).map(({ id }) => ranks[id]);
  const periphery = institutions.filter((item) => !item.core).map(({ id }) => ranks[id]);
  assert.ok(Math.min(...core) > Math.max(...periphery) * 0.8);
  assert.ok(Math.max(...ranks) > 0.4);
  assert.ok(ranks.every((rank) => rank >= 0 && rank <= 1));
});
