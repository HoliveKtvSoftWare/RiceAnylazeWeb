// 结构级回归测试：上传按钮的忙碌状态**不允许**直接依赖 store 的 isLoading。
//
// 为什么需要它：多文件上传时 store 每传完一个文件就会把 isLoading 翻转一轮，
// 按钮一旦绑到它就会闪。纯函数测试（uploadBusy.test.mjs）只能保证判定逻辑正确，
// 这里再校验组件真的用了那套逻辑、而不是又绑回 isLoading。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/components/AnalysisWorkspace.vue', import.meta.url),
  'utf8',
);

// 1) isUploadBusy 的定义里不能出现 analysisStore.isLoading
const busyDefinition = source.match(/const isUploadBusy = computed\(\(\) =>[\s\S]*?\}\)\);/);
assert.ok(busyDefinition, '未找到 isUploadBusy 的定义');
assert.ok(
  !busyDefinition[0].includes('analysisStore.isLoading'),
  'isUploadBusy 不能依赖 analysisStore.isLoading：多文件上传时它会反复翻转，按钮会闪',
);
assert.ok(
  busyDefinition[0].includes('uploadBusyState'),
  'isUploadBusy 应使用 utils/uploadBusy.js 的 uploadBusyState',
);

// 2) 模板里的上传按钮必须绑 isUploadBusy（而不是 isLoading / historyBusy）
const uploadButtons = source.match(/<button @click="handle(File|Folder)Upload"[\s\S]*?<\/button>/g) || [];
assert.equal(uploadButtons.length, 2, '应能找到"上传图片"与"上传文件夹"两个按钮');
for (const button of uploadButtons) {
  assert.ok(
    /:disabled="shouldDisableUploadButton\(\{[^}]*busy: isUploadBusy[^}]*\}\)"/.test(button),
    `上传按钮的 disabled 必须由 isUploadBusy 决定，实际为：\n${button}`,
  );
  assert.ok(!button.includes('analysisStore.isLoading'), '上传按钮不能直接引用 isLoading');
  assert.ok(button.includes("isUploadBusy ? '处理中...'"), '上传按钮文案应跟随 isUploadBusy');
}

// 3) 文件选择控件同样不能绑 isLoading
for (const marker of ['ref="fileInput"', 'ref="folderInput"']) {
  const line = source.split('\n').find((l) => l.includes(marker));
  assert.ok(line, `未找到 ${marker} 所在行`);
  assert.ok(
    line.includes(':disabled="isUploadBusy"'),
    `${marker} 的 disabled 应为 isUploadBusy，实际为：${line.trim()}`,
  );
}

// 4) 全局"正在上传或加载历史"提示不该在轮询期间每 2 秒闪一次：
//    它必须绑"首次加载"判定，而不是直接绑 isLoading。
const indicator = source.match(/<div\s+v-if="[^"]*"\s+class="loading-indicator"/);
assert.ok(indicator, '未找到 loading-indicator');
assert.ok(
  indicator[0].includes('isInitialHistoryLoading'),
  `loading-indicator 应绑 isInitialHistoryLoading（仅首次加载），实际为：${indicator[0].trim()}`,
);
assert.ok(
  !indicator[0].includes('analysisStore.isLoading'),
  'loading-indicator 不应直接绑 isLoading：轮询每 2 秒刷新一次，会让它一直闪',
);
assert.ok(
  source.includes('analysisStore.historyLoadedOnce'),
  'isInitialHistoryLoading 应依据 historyLoadedOnce 区分首次加载与后台刷新',
);

// 4a) 勾选框的渲染条件必须用 isSelectableJob（含失败记录），
//     不能写死 status === 'completed' —— 否则失败记录无法勾选/批量删除。
const checkboxConditions = source.match(/v-if="(isSelectableJob\([^"]*\)|job\.status === 'completed')"/g) || [];
assert.ok(checkboxConditions.length > 0, '未找到勾选框渲染条件');
const completedOnly = checkboxConditions.filter((c) => c.includes("status === 'completed'"));
assert.deepEqual(
  completedOnly,
  [],
  `勾选框不能用 status === 'completed' 限制（失败记录无法选中）：${completedOnly.join(', ')}`,
);

// 4b) 批量导出必须用"可导出集合"（排除失败记录），批量删除用全部勾选
const batchJsonHandler = source.match(/const batchExportJson = async \(\) => \{[\s\S]*?\n\};/);
assert.ok(batchJsonHandler, '未找到 batchExportJson');
assert.ok(
  batchJsonHandler[0].includes('exportableSelectedIds'),
  '批量导出 JSON 应只导出已完成记录（exportableSelectedIds）',
);
const batchDeleteHandler = source.match(/const handleBatchDelete = async \(\) => \{[\s\S]*?\n\};/);
assert.ok(batchDeleteHandler, '未找到 handleBatchDelete');
assert.ok(
  batchDeleteHandler[0].includes('selectedAnalysisIds'),
  '批量删除应作用于全部勾选项（含失败记录）',
);

// 4c) 删除 / 批量导出导出类按钮的 disabled **不得**绑 historyBusy（含 isLoading）。
//     轮询每 2 秒会把它置真一次，按钮就被反复禁用 —— 用户点了没反应，
//     真实反馈就是"失败状态的记录删不掉"。
const disabledBindings = source.match(/:disabled="[^"]*"/g) || [];
const badBindings = disabledBindings.filter((b) => b.includes('historyBusy'));
assert.deepEqual(
  badBindings,
  [],
  `不应有按钮把 disabled 绑到 historyBusy（会被轮询反复禁用）：${badBindings.join(', ')}`,
);

// 4c) 逐条删除按钮必须绑 actionBusy（只认用户自己的操作）
const deleteButtons = source.match(/@click\.stop="deleteJob\([\s\S]*?<\/button>/g) || [];
assert.ok(deleteButtons.length >= 2, `应找到至少两个删除按钮，实际 ${deleteButtons.length}`);
for (const button of deleteButtons) {
  assert.ok(
    button.includes(':disabled="actionBusy"'),
    `删除按钮的 disabled 应为 actionBusy，实际为：\n${button}`,
  );
}

// 4d) 批量删除按钮的文案只跟随 batchDeleteBusy，不跟随后台加载
const batchDeleteButton = source.match(/@click="handleBatchDelete"[\s\S]*?<\/button>/);
assert.ok(batchDeleteButton, '未找到批量删除按钮');
assert.ok(
  batchDeleteButton[0].includes('batchDeleteBusy ?'),
  '批量删除按钮文案应只跟随 batchDeleteBusy',
);

// 6) 两个筛选下拉（类型 / 状态）的宽度必须锁定，否则剑叶页的长模型名会把
//    <select> 撑宽，导致"茎秆页并排、剑叶页一上一下"的排布不一致。
const selectWidthRules = source.match(
  /\.section-title-group \.history-filter:first-of-type \.history-type-select \{[\s\S]*?\}/,
);
assert.ok(selectWidthRules, '未找到类型筛选下拉的宽度规则');
assert.ok(
  /width:\s*\d+px/.test(selectWidthRules[0]) && /min-width:\s*\d+px/.test(selectWidthRules[0]),
  `类型筛选下拉必须锁定宽度（否则会被长选项撑宽），实际为：${selectWidthRules[0]}`,
);
assert.ok(
  selectWidthRules[0].includes('ellipsis'),
  '类型筛选下拉应加省略号，长模型名不至于溢出',
);
const statusWidthRule = source.match(
  /\.section-title-group \.history-filter:last-of-type \.history-type-select \{[\s\S]*?\}/,
);
assert.ok(statusWidthRule, '未找到状态筛选下拉的宽度规则');
assert.ok(
  /width:\s*\d+px/.test(statusWidthRule[0]),
  `状态筛选下拉也必须锁定宽度，实际为：${statusWidthRule[0]}`,
);

// 7) 两个上传处理函数都必须用 try/finally 复位 isUploading，
//    否则中途抛错会让按钮永久卡在"处理中"
const handlers = ['handleFileUpload', 'handleFolderUpload'];
for (const name of handlers) {
  const body = source.match(new RegExp(`const ${name} = async \\(\\) => \\{[\\s\\S]*?\\n\\};`));
  assert.ok(body, `未找到 ${name}`);
  assert.ok(body[0].includes('isUploading.value = true'), `${name} 应在开始时置 isUploading`);
  assert.ok(body[0].includes('finally'), `${name} 必须用 try/finally 复位 isUploading`);
  assert.ok(
    /finally\s*\{[\s\S]*?isUploading\.value = false/.test(body[0]),
    `${name} 必须在 finally 中复位 isUploading`,
  );
}

console.log('upload flicker (component wiring) tests passed');
