<template>
  <div v-if="visible" class="confirm-overlay" @click.self="emit('cancel')">
    <div class="confirm-box" role="dialog" aria-modal="true">
      <h4 class="confirm-title">{{ title }}</h4>
      <p class="confirm-message">{{ message }}</p>
      <div class="confirm-actions">
        <button class="confirm-cancel" @click="emit('cancel')">取消</button>
        <button class="confirm-ok" :class="{ danger }" @click="emit('confirm')">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 应用内的确认框。
 *
 * 为什么不用 window.confirm：浏览器会在用户勾选"阻止此页面创建更多对话框"后
 * 静默屏蔽原生对话框，此时 confirm() 直接返回 false —— 表现就是"点了删除没反应"，
 * 而且没有任何提示。删除这种不可撤销的操作必须给出确定的反馈，所以自己做。
 */
defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '确认操作' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: '确定' },
  danger: { type: Boolean, default: false },
});

const emit = defineEmits(['confirm', 'cancel']);
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
}

.confirm-box {
  width: min(420px, calc(100vw - 40px));
  padding: 22px 24px 18px;
  border-radius: var(--radius-lg, 12px);
  background: #fff;
  box-shadow: var(--shadow-md, 0 8px 28px rgba(0, 0, 0, 0.18));
  animation: confirmIn 0.16s ease-out;
}

@keyframes confirmIn {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.confirm-title {
  margin: 0 0 10px;
  font-size: 1.05em;
  font-weight: 700;
  color: var(--color-text-primary, #222);
}

.confirm-message {
  margin: 0 0 20px;
  font-size: 0.92em;
  line-height: 1.6;
  color: var(--color-text-secondary, #555);
  word-break: break-all;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.confirm-cancel,
.confirm-ok {
  padding: 8px 18px;
  border-radius: var(--radius-md, 8px);
  font-size: 0.9em;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all var(--transition-fast, 0.15s);
}

.confirm-cancel {
  background: #fff;
  border-color: var(--color-border, #ddd);
  color: var(--color-text-secondary, #555);
}

.confirm-cancel:hover {
  background: #f5f5f5;
}

.confirm-ok {
  background: var(--color-primary-green, #4caf50);
  color: #fff;
}

.confirm-ok.danger {
  background: var(--color-error, #e53935);
}

.confirm-ok:hover {
  filter: brightness(1.06);
}
</style>
