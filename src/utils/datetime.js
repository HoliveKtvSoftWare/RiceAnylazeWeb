/** 时间与耗时相关的纯函数（主页 / 分析页共用，便于单测） */

/**
 * 解析后端返回的时间串。
 * 后端存的是不带时区的 UTC 时间（如 "2026-09-17T04:23:03"），
 * 直接 `new Date(str)` 在部分浏览器会按本地时区解释，导致显示时间偏差，
 * 因此这里显式补上 Z 当作 UTC 解析。
 */
export function parseServerDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  const isoPattern = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;
  let parsed = isoPattern.test(value) && !value.endsWith('Z') && !value.includes('+')
    ? new Date(value.replace(' ', 'T') + 'Z')
    : new Date(value);
  if (isNaN(parsed.getTime())) parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/** 格式化为本地时间串（与看板一致：zh-CN、24 小时制） */
export function formatDateTime(value) {
  const parsed = parseServerDate(value);
  if (!parsed) return '';
  return parsed.toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short', hour12: false });
}

/** 只取时间部分（列表里加上日期太挤） */
export function formatTimeOnly(value) {
  const parsed = parseServerDate(value);
  if (!parsed) return '';
  return parsed.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** 自然日（"YYYY-MM-DD" 或时间戳）到 "M/D" 的短标签，用于趋势图坐标 */
export function formatShortDate(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [, month, day] = value.split('-');
    return `${Number(month)}/${Number(day)}`;
  }
  const parsed = parseServerDate(value);
  if (!parsed) return '';
  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
}

/**
 * 推理耗时展示。
 * 后端给的是 finished_at - started_at 的秒数；老记录没有这两个字段时为 null。
 */
export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || !isFinite(seconds)) return '';
  const value = Number(seconds);
  if (value < 0) return '';
  if (value < 1) return '<1 秒';
  if (value < 60) return `${value < 10 ? value.toFixed(1) : Math.round(value)} 秒`;
  const minutes = Math.floor(value / 60);
  const rest = Math.round(value % 60);
  if (minutes < 60) return `${minutes} 分 ${rest} 秒`;
  const hours = Math.floor(minutes / 60);
  return `${hours} 小时 ${minutes % 60} 分`;
}

/** 一条记录的耗时（秒）；缺任一时间戳则返回 null */
export function recordDurationSeconds(record) {
  if (!record) return null;
  const start = parseServerDate(record.startedAt);
  const end = parseServerDate(record.finishedAt);
  if (!start || !end) return null;
  const seconds = (end.getTime() - start.getTime()) / 1000;
  return seconds >= 0 ? seconds : null;
}
