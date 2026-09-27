// 分析大类（茎秆 / 剑叶 两个页面）分组逻辑的回归测试。
// 关键点：后端 10 个分析类型必须被正确归入两个大类，且每个大类都能取到可选类型列表。
import assert from 'node:assert/strict';
import {
  DEFAULT_TASK_GROUP,
  TASK_GROUPS,
  getTaskGroup,
  groupKeyOfRecord,
  groupKeyOfTask,
  groupTasks,
} from '../src/utils/taskGroups.js';

// 与后端 app/core/tasks.py 的注册表保持一致（1 个茎秆 + 9 个剑叶）
const BACKEND_TASK_KEYS = [
  'stem',
  'leaf',
  'leaf_v11',
  'leaf_v11_head',
  'leaf_v11_p2_head',
  'leaf_our',
  'leaf_asf',
  'leaf_svbd',
  'leaf_sod',
  'leaf_subtle',
];

const TASK_KEYS = BACKEND_TASK_KEYS;

assert.equal(TASK_KEYS.length, 10);

// 1) 只有 stem 归入茎秆，其余全部归入剑叶
assert.equal(groupKeyOfTask('stem'), 'stem');
for (const key of TASK_KEYS.filter((k) => k !== 'stem')) {
  assert.equal(groupKeyOfTask(key), 'leaf', `${key} 应归入剑叶`);
}

// 2) 两个大类都有页面路径与文案
assert.equal(TASK_GROUPS.stem.route, '/stem');
assert.equal(TASK_GROUPS.leaf.route, '/leaf');
assert.ok(TASK_GROUPS.stem.label && TASK_GROUPS.leaf.label);
assert.equal(DEFAULT_TASK_GROUP, 'stem');

// 3) getTaskGroup 大小写/空白容错，未知返回 undefined
assert.equal(getTaskGroup('LEAF')?.key, 'leaf');
assert.equal(getTaskGroup(' stem ')?.key, 'stem');
assert.equal(getTaskGroup('nope'), undefined);
assert.equal(getTaskGroup(''), undefined);

// 4) 按大类拆分后端返回的类型列表，且保持后端顺序
const taskTypes = TASK_KEYS.map((key, i) => ({ key, name: `类型${i}`, model: `${key}.pt` }));
const stemTasks = groupTasks(taskTypes, 'stem');
const leafTasks = groupTasks(taskTypes, 'leaf');
assert.deepEqual(stemTasks.map((t) => t.key), ['stem']);
assert.equal(leafTasks.length, 9);
assert.deepEqual(leafTasks.map((t) => t.key), TASK_KEYS.filter((k) => k !== 'stem'));

// 5) 两个大类互斥且完整覆盖
assert.deepEqual(
  [...stemTasks, ...leafTasks].map((t) => t.key).sort(),
  [...TASK_KEYS].sort(),
);

// 6) 入参异常时不抛错（类型列表拉取失败会传空）
assert.deepEqual(groupTasks(null, 'stem'), []);
assert.deepEqual(groupTasks(undefined, 'leaf'), []);
assert.deepEqual(groupTasks([], 'leaf'), []);

// 7) 历史记录归组：优先采信后端返回的 group 字段
assert.equal(groupKeyOfRecord({ taskType: 'stem' }), 'stem');
assert.equal(groupKeyOfRecord({ taskType: 'leaf_our' }), 'leaf');
assert.equal(groupKeyOfRecord({ key: 'stem', group: 'stem' }), 'stem');
// 后端显式给出 group 时以它为准（例如 task_type 命名与大类不一致的情况）
assert.equal(groupKeyOfRecord({ taskType: 'leaf_our', group: 'stem' }), 'stem');
assert.equal(groupKeyOfRecord({ taskType: 'whatever', taskGroup: 'leaf' }), 'leaf');
// 老数据没有 group 时回退到 taskType 约定
assert.equal(groupKeyOfRecord({ taskType: 'leaf_v11_head' }), 'leaf');
assert.equal(groupKeyOfRecord(null), undefined);
assert.equal(groupKeyOfRecord({}), 'leaf');

// 8) 主页统计口径：按大类分组计数，两类之和等于总数
const history = [
  { taskType: 'stem' },
  { taskType: 'stem' },
  { taskType: 'leaf_our' },
  { taskType: 'leaf_asf' },
  { taskType: 'leaf', group: 'leaf' },
];
const counted = history.reduce((acc, record) => {
  const key = groupKeyOfRecord(record);
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});
assert.deepEqual(counted, { stem: 2, leaf: 3 });
assert.equal(counted.stem + counted.leaf, history.length);

console.log('task group regression tests passed');
