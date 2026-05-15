<template>
  <div class="job-status">
    <h3>分析任务状态</h3>
    <div v-if="jobs.length === 0" class="no-jobs">
      暂无分析任务
    </div>
    <div v-else>
      <div v-for="job in jobs" :key="job.id" class="job-item">
        <span class="job-name">{{ job.filename }}</span>
        <span class="job-status" :class="job.status">{{ job.status }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'JobStatus',
  props: {
    jobs: {
      type: Array,
      default: () => []
    }
  }
}
</script>

<style scoped>
.job-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
}

.job-status.pending {
  color: #f39c12;
}

.job-status.completed {
  color: #27ae60;
}

.job-status.failed {
  color: #e74c3c;
}
</style>