// "按钮闪烁"回归测试（src/utils/uploadBusy.js）。
//
// 场景：同时上传 5 张图时，store 的 isLoading 会随每个文件上传 + 刷新历史
// 反复 true→false（5 张图约 10~15 次翻转）。若按钮直接绑 isLoading，
// 就会在"处理中/可用"之间不断切换 —— 这就是用户看到的闪烁。
import assert from 'node:assert/strict';
import {
  actionBusyState,
  actionLabelText,
  exportableRecordIds,
  historyBusyState,
  isSelectableRecord,
  selectableRecordIds,
  selectionState,
  shouldClearPendingFiles,
  shouldDisableUploadButton,
  uploadBusyState,
  uploadProgressPercent,
} from '../src/utils/uploadBusy.js';

// 1) 上传批次期间，即使 isLoading 来回翻转，上传控件必须**始终**忙碌
const simulatedIsLoadingFlips = [true, false, true, false, true, false, true, false];
for (const isLoading of simulatedIsLoadingFlips) {
  assert.equal(
    uploadBusyState({ isUploading: true, uploadProgressActive: false }),
    true,
    `isLoading=${isLoading} 时上传按钮不能被重新启用`,
  );
}
// 上传结束后恢复可用
assert.equal(uploadBusyState({ isUploading: false, uploadProgressActive: false }), false);
// 进度条显示期间也算忙碌
assert.equal(uploadBusyState({ isUploading: false, uploadProgressActive: true }), true);

// 2) 历史面板：isLoading 翻转时也不能闪（上传期间恒为忙碌）
for (const isLoading of simulatedIsLoadingFlips) {
  assert.equal(
    historyBusyState({ isLoading, isUploading: true }),
    true,
    '上传期间批量按钮不能随 isLoading 反复启用/禁用',
  );
}
// 没有上传时，历史面板照旧跟随 isLoading
assert.equal(historyBusyState({ isLoading: true }), true);
assert.equal(historyBusyState({ isLoading: false }), false);

// 3) 按钮可用性：没有待上传文件时禁用；忙碌时禁用；否则可用
assert.equal(shouldDisableUploadButton({ fileCount: 5, busy: false }), false);
assert.equal(shouldDisableUploadButton({ fileCount: 5, busy: true }), true);
assert.equal(shouldDisableUploadButton({ fileCount: 0, busy: false }), true);
assert.equal(shouldDisableUploadButton({}), true);

// 4) 整批进度单调递增（每个文件各自 0→100 时不能让总进度回跳）
const percents = [];
for (let index = 0; index < 5; index += 1) {
  for (const ratio of [0, 0.25, 0.5, 0.75, 1]) {
    percents.push(uploadProgressPercent({ index, total: 5, currentRatio: ratio }));
  }
}
for (let i = 1; i < percents.length; i += 1) {
  assert.ok(percents[i] >= percents[i - 1], `进度不能回跳: ${percents[i - 1]} -> ${percents[i]}`);
}
assert.equal(percents[0], 0);
assert.equal(percents[percents.length - 1], 100);

// 5) 进度边界：比例超范围、总数为 0 都不产生非法值
assert.equal(uploadProgressPercent({ index: 0, total: 0, currentRatio: 0.5 }), 0);
assert.equal(uploadProgressPercent({ index: 0, total: 1, currentRatio: 5 }), 100);
assert.equal(uploadProgressPercent({ index: 0, total: 1, currentRatio: -1 }), 0);
assert.equal(uploadProgressPercent({}), 0);

// 6) 只有全部成功才清空待上传列表（失败的文件留给用户重试）
assert.equal(shouldClearPendingFiles({ uploaded: 5, total: 5 }), true);
assert.equal(shouldClearPendingFiles({ uploaded: 4, total: 5 }), false);
assert.equal(shouldClearPendingFiles({ uploaded: 0, total: 0 }), false);

// 7) 删除/导出按钮的可用性只认"用户自己的操作"，不认后台刷新。
//    背景：轮询每 2 秒把 isLoading 置真一次，若按钮绑它就会被反复禁用，
//    用户点了没反应（表现为"失败记录删不掉"）。
assert.equal(actionBusyState({ pendingActions: 0 }), false, '没有用户操作时按钮必须可用');
assert.equal(actionBusyState({ pendingActions: 1 }), true, '用户操作进行中才禁用');
assert.equal(actionBusyState({ pendingActions: 3 }), true);
assert.equal(actionBusyState({}), false);
assert.equal(actionBusyState(), false);

// 关键回归：无论后台处于什么加载/上传状态，只要用户没发起操作，按钮就可用
for (const isLoading of [true, false]) {
  for (const isUploading of [true, false]) {
    assert.equal(
      actionBusyState({ pendingActions: 0, isLoading, isUploading }),
      false,
      '后台刷新/上传不得影响删除导出类按钮的可用性',
    );
  }
}

// 8) 按钮文案只跟随"当前操作"，不跟随后台加载（否则文字会来回跳）
assert.equal(actionLabelText({ busy: true, idleText: '批量删除' }), '处理中...');
assert.equal(actionLabelText({ busy: true, idleText: '批量删除', busyText: '删除中...' }), '删除中...');
assert.equal(actionLabelText({ busy: false, idleText: '批量删除', busyText: '删除中...' }), '批量删除');
assert.equal(actionLabelText({}), '');

// 9) 勾选规则：**失败的记录必须可以勾选**（用户反馈"失败记录无法选中"）。
//    失败记录最需要的操作就是删掉重传，所以它必须在可勾选集合里。
assert.equal(isSelectableRecord({ analysisId: 'f1', status: 'failed' }), true, '失败记录必须可勾选');
assert.equal(isSelectableRecord({ analysisId: 'c1', status: 'completed' }), true);
// 仍在跑的不给勾（避免删掉正在执行的任务）
assert.equal(isSelectableRecord({ analysisId: 'p1', status: 'processing' }), false);
assert.equal(isSelectableRecord({ analysisId: 'q1', status: 'queued' }), false);
// 脏数据不抛错
assert.equal(isSelectableRecord(null), false);
assert.equal(isSelectableRecord({}), false);
assert.equal(isSelectableRecord({ status: 'failed' }), false, '缺 analysisId 时不可选');

const mixedRecords = [
  { analysisId: 'c1', status: 'completed' },
  { analysisId: 'f1', status: 'failed' },
  { analysisId: 'p1', status: 'processing' },
  { analysisId: 'q1', status: 'queued' },
  { analysisId: 'f2', status: 'failed' },
];
assert.deepEqual(selectableRecordIds(mixedRecords), ['c1', 'f1', 'f2'], '可勾选 = 完成 + 失败');
assert.deepEqual(selectableRecordIds(null), []);
assert.deepEqual(selectableRecordIds([]), []);

// 10) 导出集合只含已完成：失败记录能勾选（用于删除），但不应被导出
const allIds = selectableRecordIds(mixedRecords);
assert.deepEqual(
  exportableRecordIds(allIds, mixedRecords),
  ['c1'],
  '导出只应包含 completed，失败记录即使勾选也不导出',
);
assert.deepEqual(exportableRecordIds(['f1'], mixedRecords), [], '只勾选失败记录时没有可导出项');
assert.deepEqual(exportableRecordIds(null, mixedRecords), []);
assert.deepEqual(exportableRecordIds(allIds, null), []);

// 11) 全选/半选基于可勾选集合（含失败）
assert.deepEqual(
  selectionState([], ['c1', 'f1']),
  { allSelected: false, indeterminate: false },
);
assert.deepEqual(
  selectionState(['c1'], ['c1', 'f1']),
  { allSelected: false, indeterminate: true },
);
assert.deepEqual(
  selectionState(['c1', 'f1'], ['c1', 'f1']),
  { allSelected: true, indeterminate: false },
);
assert.deepEqual(
  selectionState([], []),
  { allSelected: false, indeterminate: false },
  '没有可勾选项时不应显示"已全选"',
);
// 只勾了不可选项（跑动中）时不算半选
assert.deepEqual(
  selectionState(['p1'], ['c1', 'f1']),
  { allSelected: false, indeterminate: false },
);

console.log('upload busy-state regression tests passed');
