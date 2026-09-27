/**
 * 分析大类（页面）定义。
 *
 * 后端 `app/core/tasks.py` 注册了 10 个分析类型：1 个茎秆（`stem`）+ 9 个剑叶
 * （`leaf` / `leaf_v11` / `leaf_our` / 各对比方法 …）。前端把它们归为两个大类，
 * 对应两个页面：`/stem`（茎秆分析）与 `/leaf`（剑叶分析）。
 *
 * 这里只负责"哪个 key 属于哪个大类"以及页面文案；每个大类内部可选的分析类型
 * 列表始终以 `GET /api/analysis/tasks` 的返回为准（见 groupTasks），
 * 因此后端新增权重时前端无需改动。
 */

export const TASK_GROUPS = {
  stem: {
    key: 'stem',
    label: '茎秆分析',
    noun: '茎秆',
    route: '/stem',
    // 后端类型列表拉取失败时的兜底类型
    defaultTaskKey: 'stem',
    description: '茎秆横切面切片：茎秆/空腔轮廓与大、小维管束',
  },
  leaf: {
    key: 'leaf',
    label: '剑叶分析',
    noun: '剑叶',
    route: '/leaf',
    // 剑叶有多个候选权重，默认用后端列表里的第一项（当前是 v11-p2 exp59）
    defaultTaskKey: 'leaf',
    description: '剑叶切片：主脉/空腔/侧脉区域与维管束',
  },
};

export const DEFAULT_TASK_GROUP = 'stem';

/** 按大类 key 取定义；未知 key 返回 undefined */
export function getTaskGroup(key) {
  if (!key) return undefined;
  return TASK_GROUPS[String(key).trim().toLowerCase()];
}

/** 某个任务属于哪个大类；优先用后端返回的 group，缺失时回退到 key 约定 */
export function groupKeyOfTask(taskType) {
  const key = String(taskType || '').trim().toLowerCase();
  if (key === 'stem') return 'stem';
  return 'leaf';
}

/**
 * 判断一条历史记录 / 任务定义属于哪个大类。
 * 后端的 `/api/analysis/tasks` 与 `/api/analysis/history` 都会带 group，
 * 优先采信它；老数据或老接口没有该字段时回退到 taskType 约定。
 */
export function groupKeyOfRecord(record) {
  if (!record) return undefined;
  const declared = getTaskGroup(record.group || record.taskGroup);
  if (declared) return declared.key;
  return groupKeyOfTask(record.taskType || record.key);
}

/** 把后端返回的类型列表按大类过滤（顺序保持后端顺序） */
export function groupTasks(taskTypes, groupKey) {
  if (!Array.isArray(taskTypes)) return [];
  return taskTypes.filter((task) => groupKeyOfTask(task?.key) === groupKey);
}
