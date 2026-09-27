<template>
  <main class="home-area">
    <!-- 统计概览 -->
    <section class="stats-grid">
      <article class="card stat-card">
        <span class="stat-icon total"><ClipboardList :size="20" aria-hidden="true" /></span>
        <div class="stat-body">
          <span class="stat-label">全部分析记录</span>
          <strong class="stat-value">{{ stats.total }}</strong>
          <small class="stat-sub">进行中 {{ runningCount }} 条</small>
        </div>
      </article>
      <article class="card stat-card">
        <span class="stat-icon done"><CircleCheck :size="20" aria-hidden="true" /></span>
        <div class="stat-body">
          <span class="stat-label">已完成</span>
          <strong class="stat-value">{{ completedCount }}</strong>
          <small class="stat-sub">失败 {{ failedCount }} 条</small>
        </div>
      </article>
      <article class="card stat-card">
        <span class="stat-icon seven"><TrendingUp :size="20" aria-hidden="true" /></span>
        <div class="stat-body">
          <span class="stat-label">近 {{ windowDays }} 天新增</span>
          <strong class="stat-value">{{ windowTotal }}</strong>
          <small class="stat-sub">完成 {{ windowCompleted }} 条</small>
        </div>
      </article>
      <article class="card stat-card">
        <span class="stat-icon time"><Timer :size="20" aria-hidden="true" /></span>
        <div class="stat-body">
          <span class="stat-label">平均推理耗时</span>
          <strong class="stat-value small">{{ avgDuration }}</strong>
          <small class="stat-sub">{{ measuredCount > 0 ? `基于 ${measuredCount} 次` : '暂无可统计数据' }}</small>
        </div>
      </article>
    </section>

    <!-- 近 7 天完成趋势 -->
    <section class="card trend-card">
      <header class="card-head">
        <h3>近 {{ windowDays }} 天分析趋势</h3>
        <span class="card-head-note">
          <i class="legend-dot completed"></i>已完成
          <i class="legend-dot failed"></i>失败
        </span>
      </header>
      <div class="trend-chart" role="img" :aria-label="trendLabel">
        <div v-for="item in daily" :key="item.date" class="trend-col" :title="trendTitle(item)">
          <span class="trend-count" :class="{ zero: item.total === 0 }">{{ item.total }}</span>
          <div class="trend-stack">
            <span class="trend-bar failed" :style="{ height: `${barHeight(item.failed)}%` }"></span>
            <span class="trend-bar completed" :style="{ height: `${barHeight(item.completed)}%` }"></span>
          </div>
          <span class="trend-date">{{ formatShortDate(item.date) }}</span>
        </div>
      </div>
    </section>

    <!-- 快捷入口 -->
    <section class="quick-grid">
      <button
          v-for="entry in quickEntries"
          :key="entry.key"
          class="card quick-card"
          @click="goToGroup(entry.key)"
      >
        <span class="quick-icon" :class="entry.key">
          <component :is="entry.icon" :size="22" aria-hidden="true" />
        </span>
        <span class="quick-text">
          <strong>{{ entry.label }}</strong>
          <small>{{ entry.description }}</small>
        </span>
        <span class="quick-count">
          <strong>{{ entry.count }}</strong>
          <small>条记录</small>
        </span>
        <ChevronRight class="quick-arrow" :size="18" aria-hidden="true" />
      </button>
    </section>

    <!-- 近期分析记录 -->
    <section class="card recent-card">
      <header class="recent-head">
        <h3>近期分析记录</h3>
        <div class="recent-tools">
          <span v-if="isPolling" class="recent-live" role="status" aria-live="polite">
            <span class="live-dot"></span>有任务进行中，自动刷新
          </span>
          <select v-model="statusFilter" class="recent-filter" aria-label="按状态筛选">
            <option value="">全部状态</option>
            <option value="processing">处理中</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
          </select>
          <span class="recent-count" v-if="filteredRecords.length > 0">
            共 {{ filteredRecords.length }} 条
          </span>
        </div>
      </header>

      <ul v-if="visibleRecords.length > 0" class="recent-list">
        <li
            v-for="record in visibleRecords"
            :key="record.analysisId"
            class="recent-item"
            @click="openRecord(record)"
        >
          <span class="recent-status" :class="`status-${record.status}`" :title="translateStatus(record.status)"></span>
          <span class="recent-name" :title="record.originalFilename">{{ record.originalFilename }}</span>
          <span class="type-badge">{{ translateTaskType(record.taskType) }}</span>
          <span class="recent-group" :class="groupOf(record)">{{ groupLabelOf(record) }}</span>
          <span class="recent-duration" :title="durationTitle(record)">{{ durationOf(record) }}</span>
          <span class="recent-time">{{ formatDateTime(record.createdAt) }}</span>
          <ChevronRight class="recent-arrow" :size="16" aria-hidden="true" />
        </li>
      </ul>
      <p v-else-if="analysisStore.isLoading" class="recent-empty">正在加载分析记录...</p>
      <p v-else class="recent-empty">
        {{ hasFilter ? '没有符合筛选条件的记录。' : '暂无分析记录，先从上方进入茎秆或剑叶分析上传图片。' }}
      </p>

      <footer v-if="filteredRecords.length > visibleRecords.length" class="recent-foot">
        <router-link :to="TASK_GROUPS[firstRecordGroup].route">
          查看全部 {{ filteredRecords.length }} 条记录
        </router-link>
      </footer>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAnalysisStore } from '@/stores/analysis';
import { processingJobIds } from '@/utils/analysisStatus';
import { TASK_GROUPS, groupKeyOfRecord, groupTasks, getTaskGroup } from '@/utils/taskGroups';
import { formatDateTime, formatDuration, formatShortDate, recordDurationSeconds } from '@/utils/datetime';
import {
  ChevronRight, CircleCheck, ClipboardList, Leaf, Sprout, Timer, TrendingUp,
} from '@lucide/vue';

const analysisStore = useAnalysisStore();
const router = useRouter();

const statusFilter = ref('');
// 主页只展示最近若干条，其余交给对应的分析页
const RECENT_LIMIT = 10;
// 趋势窗口（与后端 /api/analysis/stats?days= 对应）
const STATS_DAYS = 7;

// 轮询回调可能在本页卸载后触发，用它避免更新已卸载组件的状态
let isActive = true;

const records = computed(() => analysisStore.historyList || []);
const serverStats = computed(() => analysisStore.stats || null);
const daily = computed(() => serverStats.value?.daily || []);
const windowDays = computed(() => serverStats.value?.windowDays || STATS_DAYS);
const measuredCount = computed(() => serverStats.value?.measuredCount || 0);

const filteredRecords = computed(() => (
  statusFilter.value
    ? records.value.filter((record) => record.status === statusFilter.value)
    : records.value
));
const visibleRecords = computed(() => filteredRecords.value.slice(0, RECENT_LIMIT));
const hasFilter = computed(() => Boolean(statusFilter.value));

// 计数优先用后端统计（未加载完时回退到本地历史，保证首屏不空白）
const stats = computed(() => ({
  total: serverStats.value?.total ?? records.value.length,
}));
const completedCount = computed(
  () => serverStats.value?.byStatus?.completed ?? records.value.filter((r) => r.status === 'completed').length,
);
const failedCount = computed(
  () => serverStats.value?.byStatus?.failed ?? records.value.filter((r) => r.status === 'failed').length,
);
const runningCount = computed(() => processingJobIds(records.value).length);
const windowTotal = computed(() => daily.value.reduce((sum, item) => sum + item.total, 0));
const windowCompleted = computed(() => daily.value.reduce((sum, item) => sum + item.completed, 0));
const avgDuration = computed(() => formatDuration(serverStats.value?.avgDurationSeconds) || '—');

const isPolling = computed(() => runningCount.value > 0 && analysisStore.isPolling());

// 趋势柱高度：以窗口内单日最大值为基准，最小给 4% 以便"有记录但很少"也看得见
const maxDaily = computed(() => Math.max(1, ...daily.value.map((item) => item.total)));
const barHeight = (value) => (value <= 0 ? 0 : Math.max(4, Math.round((value / maxDaily.value) * 100)));

const trendTitle = (item) => `${item.date}：完成 ${item.completed} 条，失败 ${item.failed} 条，共 ${item.total} 条`;
const trendLabel = computed(() => daily.value.map(trendTitle).join('；'));

// 交给"查看全部"跳转用的大类：优先跟随筛选后第一条记录
const firstRecordGroup = computed(() => groupKeyOfRecord(filteredRecords.value[0]) || 'stem');

const groupOf = (record) => groupKeyOfRecord(record) || 'stem';
const groupLabelOf = (record) => getTaskGroup(groupOf(record))?.noun || '';

const translateTaskType = (taskType) => {
  if (!taskType) return '未知';
  const matched = analysisStore.taskTypes.find((task) => task.key === taskType);
  return matched?.name || taskType;
};

const translateStatus = (status) => {
  const statusMap = {
    processing: '处理中', completed: '已完成', failed: '失败',
    queued: '排队中', pending: '待处理',
  };
  return statusMap[status] || status;
};

// 每条记录的耗时（老记录没有起止时间，显示占位而不是 0 秒）
const durationOf = (record) => formatDuration(recordDurationSeconds(record)) || '—';
const durationTitle = (record) => {
  const text = formatDuration(recordDurationSeconds(record));
  return text ? `推理耗时 ${text}` : '该记录没有推理耗时（早于本功能上线）';
};

const taskCountOf = (groupKey) => groupTasks(analysisStore.taskTypes, groupKey).length;
const recordCountOf = (groupKey) => (
  serverStats.value?.byGroup?.[groupKey]
  ?? records.value.filter((record) => groupKeyOfRecord(record) === groupKey).length
);

const quickEntries = computed(() => [
  {
    key: 'stem',
    label: TASK_GROUPS.stem.label,
    description: `${TASK_GROUPS.stem.description} · ${taskCountOf('stem')} 个模型`,
    icon: Sprout,
    count: recordCountOf('stem'),
  },
  {
    key: 'leaf',
    label: TASK_GROUPS.leaf.label,
    description: `${TASK_GROUPS.leaf.description} · ${taskCountOf('leaf')} 个模型`,
    icon: Leaf,
    count: recordCountOf('leaf'),
  },
]);

const goToGroup = (key) => {
  const group = getTaskGroup(key);
  if (group) router.push(group.route);
};

// 点开近期记录 -> 直接进入对应大类页面并选中该记录
const openRecord = (record) => {
  analysisStore.selectJobAction(record);
  router.push(TASK_GROUPS[groupOf(record)].route);
};

// 主页也跟踪未完成任务：定时器归 store 所有，与两个分析页共用同一份
const refreshHomeData = async () => {
  await analysisStore.fetchStatsAction(STATS_DAYS);
  if (isActive && processingJobIds(analysisStore.historyList).length > 0) {
    startPolling();
  } else {
    analysisStore.stopPolling();
  }
};

const startPolling = () => analysisStore.startPolling({
  // 主页看全量，避免"另一类的任务完成了但主页还显示进行中"
  group: '',
  onSettled: () => { analysisStore.fetchStatsAction(STATS_DAYS); },
});

onMounted(async () => {
  isActive = true;
  // 主页看全量记录，因此清掉分析页留下的分域与选中项
  analysisStore.selectJobAction(null);
  await analysisStore.fetchTaskTypes();
  await Promise.all([
    analysisStore.fetchHistoryAction('', ''),
    analysisStore.fetchStatsAction(STATS_DAYS),
  ]);
  if (processingJobIds(analysisStore.historyList).length > 0) startPolling();
});

onUnmounted(() => {
  isActive = false;
  // 不在离开主页时停掉轮询：定时器归 store，切到分析页后它仍会继续跟踪任务
});

// 供"刷新"语义使用：轮询结束后再次进入主页会重新取数
defineExpose({ refreshHomeData });
</script>

<style scoped>
.home-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1180px;
  margin: 0 auto;
}

/* 统计概览 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  transition: box-shadow 0.18s ease, transform 0.18s ease;
}

.stat-card:hover {
  box-shadow: var(--shadow);
  transform: translateY(-1px);
}

.stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.stat-icon.total {
  background: var(--color-primary-green-lightest);
  color: var(--color-primary-green-dark);
}

.stat-icon.done {
  background: #e8f6ec;
  color: #28a745;
}

.stat-icon.seven {
  background: #eef2ff;
  color: #4f46e5;
}

.stat-icon.time {
  background: #fff4e5;
  color: var(--color-warning);
}

.stat-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-label {
  font-size: 0.82em;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.stat-value {
  font-size: 1.45em;
  line-height: 1.2;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.stat-value.small {
  font-size: 1.15em;
}

.stat-sub {
  font-size: 0.76em;
  color: var(--color-text-faint);
}

/* 趋势 */
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.card-head h3 {
  margin: 0;
  font-size: 1.02em;
}

.card-head-note {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8em;
  color: var(--color-text-muted);
}

.legend-dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 2px;
  margin-left: 6px;
}

.legend-dot.completed {
  background: var(--color-primary-green);
}

.legend-dot.failed {
  background: var(--color-error);
}

.trend-card {
  padding: 16px 18px 12px;
}

.trend-chart {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(48px, 1fr));
  align-items: end;
  gap: 8px;
  margin-top: 14px;
  min-height: 148px;
}

.trend-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  height: 148px;
}

.trend-count {
  font-size: 0.8em;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.trend-count.zero {
  color: var(--color-text-faint);
}

.trend-stack {
  flex: 1;
  width: 100%;
  max-width: 34px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 2px;
  background: var(--color-surface-2);
  border-radius: var(--radius-xs);
  overflow: hidden;
}

.trend-bar {
  display: block;
  width: 100%;
  transition: height 0.25s ease;
}

.trend-bar.completed {
  background: var(--color-primary-green);
}

.trend-bar.failed {
  background: var(--color-error);
}

.trend-date {
  font-size: 0.74em;
  color: var(--color-text-muted);
  white-space: nowrap;
}

/* 快捷入口 */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.quick-card {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 15px 16px;
  text-align: left;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  font-size: 1em;
  transition: box-shadow 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
}

.quick-card:hover {
  border-color: var(--color-primary-green-light);
  box-shadow: var(--shadow);
  transform: translateY(-1px);
}

.quick-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.quick-icon.stem {
  background: #eaf2ff;
  color: #2f6fed;
}

.quick-icon.leaf {
  background: #fdeef4;
  color: #c2185b;
}

.quick-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.quick-text strong {
  font-size: 1em;
  color: var(--color-text);
}

.quick-text small {
  font-size: 0.82em;
  color: var(--color-text-muted);
}

.quick-count {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  padding-right: 4px;
}

.quick-count strong {
  font-size: 1.1em;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.quick-count small {
  font-size: 0.74em;
  color: var(--color-text-faint);
}

.quick-arrow {
  color: var(--color-text-faint);
  flex-shrink: 0;
}

/* 近期记录 */
.recent-card {
  padding: 16px 18px 10px;
}

.recent-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-border);
}

.recent-head h3 {
  margin: 0;
  font-size: 1.02em;
}

.recent-tools {
  display: flex;
  align-items: center;
  gap: 10px;
}

.recent-live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8em;
  color: var(--color-primary-green-dark);
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-primary-green);
  animation: live-pulse 1.6s ease-in-out infinite;
}

@keyframes live-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
}

.recent-filter {
  padding: 6px 10px;
  font-size: 0.88em;
}

.recent-count {
  font-size: 0.82em;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.recent-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  border-radius: var(--radius-xs);
  transition: background-color 0.16s ease;
}

.recent-item:last-child {
  border-bottom: none;
}

.recent-item:hover {
  background-color: var(--color-surface-2);
}

.recent-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.04);
}

.recent-status.status-processing { background-color: #ff9800; }
.recent-status.status-completed { background-color: #28a745; }
.recent-status.status-failed { background-color: var(--color-error); }
.recent-status.status-queued,
.recent-status.status-pending { background-color: var(--color-text-faint); }

.recent-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.94em;
}

.type-badge {
  flex-shrink: 0;
  font-size: 0.75em;
  line-height: 1.5;
  padding: 0 6px;
  border-radius: 10px;
  background-color: var(--color-primary-green-lightest, #e6f4ea);
  color: var(--color-primary-green-dark, #2e7d32);
  border: 1px solid rgba(46, 125, 50, 0.25);
  white-space: nowrap;
  min-width: 52px;
  text-align: center;
}

.recent-group {
  flex-shrink: 0;
  font-size: 0.76em;
  padding: 1px 8px;
  border-radius: var(--radius-pill);
  white-space: nowrap;
}

.recent-group.stem {
  background: #eaf2ff;
  color: #2f6fed;
}

.recent-group.leaf {
  background: #fdeef4;
  color: #c2185b;
}

.recent-duration {
  flex-shrink: 0;
  min-width: 62px;
  text-align: right;
  font-size: 0.8em;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.recent-time {
  flex-shrink: 0;
  min-width: 96px;
  text-align: right;
  font-size: 0.82em;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.recent-arrow {
  color: var(--color-text-faint);
  flex-shrink: 0;
}

.recent-empty {
  margin: 18px 0;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.92em;
}

.recent-foot {
  padding: 10px 0 4px;
  border-top: 1px solid var(--color-border);
  text-align: right;
  font-size: 0.88em;
}

/* 响应式：与看板一致的三档断点 */
@media (max-width: 1240px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .quick-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .recent-item {
    flex-wrap: wrap;
  }

  .recent-duration,
  .recent-time {
    min-width: 0;
    margin-left: auto;
  }
}
</style>
