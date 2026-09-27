/**
 * 界面"忙碌"状态的纯函数推导。
 *
 * 背景（真实 bug）：多文件上传时 store 的 `isLoading` 会**每传完一个文件就 true→false
 * 翻转一轮**（上传 + 刷新历史各一次）。如果按钮直接绑 `isLoading`，5 张图就会翻转十几次，
 * 按钮在"处理中"和"可用"之间反复切换 —— 用户看到的就是"按钮在闪"。
 *
 * 因此上传批次期间需要一个**独立且全程保持**的标志（`isUploading`），
 * 上传/选择类控件只认它，不再认 `isLoading`。
 */

/** 上传与文件选择控件的忙碌状态：整批上传期间保持为 true */
export function uploadBusyState({ isUploading = false, uploadProgressActive = false } = {}) {
  return Boolean(isUploading || uploadProgressActive);
}

/**
 * 历史面板（批量导出/删除、逐条删除）的忙碌状态。
 * 上传批次期间也保持忙碌，否则批量操作按钮会跟着 `isLoading` 一起闪。
 */
export function historyBusyState({
  isLoading = false,
  isUploading = false,
  uploadProgressActive = false,
} = {}) {
  return Boolean(isLoading || isUploading || uploadProgressActive);
}

/**
 * 按钮"该不该禁用"的判定：**只认用户自己发起的操作**，不认后台刷新。
 *
 * 背景（真实 bug）：删除按钮原来绑 `historyBusy`（含 `isLoading`）。而 `isLoading` 会被
 * 两件事反复置真：多文件上传时每传完一张，以及**轮询每 2 秒刷新一次历史**。
 * 结果按钮每隔两秒就被禁用一小会儿 —— 用户点了没反应，看起来就是"删不掉"；
 * 按钮文字也跟着 `处理中...`/正常文案来回切换，也就是"闪烁"。
 *
 * 因此这里只统计**用户操作**（删除、导出）期间的忙碌：
 * 后台刷新不发这些请求，不该影响按钮可用性。
 */
export function actionBusyState({ pendingActions = 0 } = {}) {
  return Number(pendingActions) > 0;
}

/**
 * 批量操作按钮的文案：只表示**当前操作**在进行中。
 * 与禁用状态分开：禁用可以由"上传中"等其它原因造成，但文案不该跟着变，
 * 否则同一个按钮在轮询期间会反复切换文字（另一种"闪"）。
 */
export function actionLabelText({ busy = false, idleText = '', busyText = '处理中...' } = {}) {
  return busy ? busyText : idleText;
}

/**
 * 历史记录能否勾选。
 *
 * 以前只有 `completed` 才渲染勾选框，于是**分析失败的记录既看不到勾选框也选不中**，
 * 对它完全用不了批量操作 —— 而失败记录最需要的恰恰是删掉重传（用户反馈过）。
 * 排队中/处理中的记录不给勾选框，避免删除正在执行的任务造成状态混乱。
 */
export function isSelectableRecord(record) {
  if (!record || !record.analysisId) return false;
  return record.status !== 'processing' && record.status !== 'queued';
}

/** 当前可勾选的记录 ID（用于"全选"，口径与列表里的勾选框一致） */
export function selectableRecordIds(records) {
  if (!Array.isArray(records)) return [];
  return records.filter(isSelectableRecord).map((record) => record.analysisId);
}

/**
 * 勾选集合里**可以导出**的部分：导出只对已完成的结果有意义。
 * 失败记录允许勾选用于删除，但不应进入导出集合。
 */
export function exportableRecordIds(selectedIds, records) {
  if (!Array.isArray(selectedIds)) return [];
  const byId = new Map((records || []).map((record) => [String(record.analysisId), record]));
  return selectedIds.filter((id) => byId.get(String(id))?.status === 'completed');
}

/** 全选/半选状态：基于可勾选集合计算 */
export function selectionState(selectedIds, selectableIds) {
  const selected = Array.isArray(selectedIds) ? selectedIds : [];
  const selectable = Array.isArray(selectableIds) ? selectableIds : [];
  const hit = selectable.filter((id) => selected.includes(id)).length;
  return {
    allSelected: selectable.length > 0 && hit === selectable.length,
    indeterminate: hit > 0 && hit < selectable.length,
  };
}

/**
 * 多文件上传是否应该禁用按钮：只要有文件在传、或仍待上传，就不允许再次提交。
 * 抽出来是因为"闪烁"的另一种成因是禁用了又立刻启用（可点击 → 不可点击 → 可点击）。
 */
export function shouldDisableUploadButton({ fileCount = 0, busy = false } = {}) {
  return Boolean(busy) || fileCount <= 0;
}

/**
 * 单次上传的累积进度（0~100）。
 * 逐文件上传时进度按 (已完成文件数 + 当前文件比例) / 总文件数 折算，
 * 保证进度条只单调递增、不会因为每个文件各自 0→100 而反复回跳（回跳也是"闪"的一种）。
 */
export function uploadProgressPercent({ index = 0, total = 1, currentRatio = 0 } = {}) {
  if (!total || total <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, Number(currentRatio) || 0));
  const percent = ((index + ratio) / total) * 100;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

/**
 * 一批上传结束后是否清空待上传列表（只有全部成功才清空，失败的文件留给用户重试）。
 */
export function shouldClearPendingFiles({ uploaded = 0, total = 0 } = {}) {
  return total > 0 && uploaded === total;
}
