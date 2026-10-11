import assert from 'node:assert/strict';
import test from 'node:test';
import { clock, compact, highlight, resumeAt, views } from './format.ts';
import { accumulateSeek, dragProgress, headerOffset, pagerOffset, pagerStep, scrubTime, seekSide, seekTarget, settleHeader, snapMini } from './gesture.ts';
import { pushRecent, suggestions, toggle, upNext } from './feed.ts';

test('counts and clocks read like the app', () => {
  assert.equal(compact(999), '999');
  assert.equal(compact(1240), '1.2K');
  assert.equal(compact(48000), '48K');
  assert.equal(compact(1240000), '1.2M');
  assert.equal(compact(11000000), '11M');
  assert.equal(views(1), '1 view');
  assert.equal(clock(48), '0:48');
  assert.equal(clock(203), '3:23');
  assert.equal(clock(3725), '1:02:05');
  assert.equal(clock(Number.NaN), '0:00');
  assert.equal(resumeAt(30, 60), 30);
  assert.equal(resumeAt(58.5, 60), 0);
  assert.deepEqual(highlight('Aurora over', 'aur').map(part => part.text), ['Aur', 'ora over']);
});

test('miniplayer drag snaps by distance and flick', () => {
  assert.equal(dragProgress(0, 150, 600), 0.25);
  assert.equal(dragProgress(1, -900, 600), 0);
  assert.equal(snapMini(0.3, 0), 0);
  assert.equal(snapMini(0.6, 0), 1);
  assert.equal(snapMini(0.2, 0.003), 1);
  assert.equal(snapMini(0.9, -0.003), 0);
});

test('shorts pager moves one item and rubber-bands at the ends', () => {
  assert.equal(pagerStep(0, 5, -200, 800, 0), 1);
  assert.equal(pagerStep(0, 5, -50, 800, 0), 0);
  assert.equal(pagerStep(2, 5, -30, 800, -0.9), 3);
  assert.equal(pagerStep(0, 5, 300, 800, 0), 0);
  assert.equal(pagerStep(4, 5, -300, 800, 0), 4);
  assert.equal(Math.round(pagerOffset(0, 5, 100)), 28);
  assert.equal(pagerOffset(2, 5, 100), 100);
});

test('header hides on scroll down and returns on scroll up', () => {
  assert.equal(headerOffset(0, 100, 140, 96), 40);
  assert.equal(headerOffset(40, 140, 400, 96), 96);
  assert.equal(headerOffset(96, 400, 370, 96), 66);
  assert.equal(headerOffset(66, 30, 0, 96), 0);
  assert.equal(settleHeader(60, 96, 500), 96);
  assert.equal(settleHeader(30, 96, 500), 0);
});

test('double-tap seek accumulates and clamps', () => {
  assert.equal(seekSide(10, 390), 'back');
  assert.equal(seekSide(195, 390), null);
  assert.equal(seekSide(380, 390), 'forward');
  assert.equal(seekTarget(5, 60, 'back'), 0);
  assert.equal(seekTarget(55, 60, 'forward'), 60);
  const first = accumulateSeek(null, 'forward', 1000);
  const second = accumulateSeek(first, 'forward', 1300);
  assert.equal(second.amount, 20);
  assert.equal(accumulateSeek(second, 'back', 1400).amount, 10);
  assert.equal(scrubTime(150, 50, 200, 60), 30);
});

test('lists keep recency and up next prefers the channel', () => {
  assert.deepEqual(pushRecent(['a', 'b', 'c'], 'c'), ['c', 'a', 'b']);
  assert.deepEqual(toggle(['a'], 'a'), []);
  const base = { seconds: 1, viewCount: 1, age: '', days: 1, likeCount: 1, commentCount: 1, description: '', tags: [], src: '', poster: '', title: '' };
  const list = [
    { ...base, id: 'x', channelId: 'c1', topics: ['a'] },
    { ...base, id: 'y', channelId: 'c2', topics: ['b'] },
    { ...base, id: 'z', channelId: 'c2', topics: ['a'] },
    { ...base, id: 'w', channelId: 'c1', topics: ['b'] },
  ];
  assert.deepEqual(upNext(list, list[0]).map(item => item.id), ['w', 'z', 'y']);
  assert.deepEqual(suggestions('aur', ['Aurora timelapse', 'northern aurora', 'cats']), ['aurora timelapse', 'northern aurora']);
});
