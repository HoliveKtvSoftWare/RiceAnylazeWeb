// 时间/耗时工具（src/utils/datetime.js）的回归测试。
// 重点：后端返回的是**不带时区的 UTC 时间串**，必须按 UTC 解析、按本地展示；
// 老记录缺 startedAt/finishedAt 时应显示占位而不是 0 秒。
import assert from 'node:assert/strict';
import {
  formatDateTime,
  formatDuration,
  formatShortDate,
  parseServerDate,
  recordDurationSeconds,
} from '../src/utils/datetime.js';

// 1) 不带时区的时间串按 UTC 解释（与本地时区无关）
const utcNoZone = parseServerDate('2026-09-17T04:00:00');
assert.equal(utcNoZone.toISOString(), '2026-09-17T04:00:00.000Z');

// 2) 带 Z / 带偏移的时间串按原样解析
assert.equal(parseServerDate('2026-09-17T04:00:00Z').toISOString(), '2026-09-17T04:00:00.000Z');
assert.equal(parseServerDate('2026-09-17T12:00:00+08:00').toISOString(), '2026-09-17T04:00:00.000Z');

// 3) 空格分隔的时间串也要当作 UTC
assert.equal(parseServerDate('2026-09-17 04:00:00').toISOString(), '2026-09-17T04:00:00.000Z');

// 4) 非法输入返回 null，不抛错
assert.equal(parseServerDate(''), null);
assert.equal(parseServerDate(null), null);
assert.equal(parseServerDate('not a date'), null);
assert.equal(parseServerDate(undefined), null);

// 5) 耗时格式化
assert.equal(formatDuration(0.4), '<1 秒');
assert.equal(formatDuration(6), '6.0 秒');
assert.equal(formatDuration(11.04), '11 秒');
assert.equal(formatDuration(59.4), '59 秒');
assert.equal(formatDuration(60), '1 分 0 秒');
assert.equal(formatDuration(95), '1 分 35 秒');
assert.equal(formatDuration(3700), '1 小时 1 分');
// 缺失/异常输入给空串，由调用方决定显示 '—'
assert.equal(formatDuration(null), '');
assert.equal(formatDuration(undefined), '');
assert.equal(formatDuration(-3), '');
assert.equal(formatDuration(NaN), '');

// 6) 单条记录的耗时
assert.equal(recordDurationSeconds({ startedAt: '2026-09-17T04:00:00', finishedAt: '2026-09-17T04:00:08.500' }), 8.5);
assert.equal(recordDurationSeconds({ startedAt: '2026-09-17T04:00:00' }), null, '缺 finishedAt 应为 null');
assert.equal(recordDurationSeconds({ finishedAt: '2026-09-17T04:00:00' }), null, '缺 startedAt 应为 null');
assert.equal(recordDurationSeconds({ startedAt: null, finishedAt: null }), null);
assert.equal(recordDurationSeconds(null), null);
// 起止倒挂（时钟回拨）不能给出负耗时
assert.equal(
  recordDurationSeconds({ startedAt: '2026-09-17T04:00:10', finishedAt: '2026-09-17T04:00:00' }),
  null,
);

// 7) 趋势图短标签
assert.equal(formatShortDate('2026-09-07'), '9/7');
assert.equal(formatShortDate('2026-12-31'), '12/31');

// 8) 日期时间展示不为空（具体格式随本地时区，这里只验证可用性）
assert.ok(formatDateTime('2026-09-17T04:00:00').length > 0);
assert.equal(formatDateTime(null), '');

console.log('datetime regression tests passed');
