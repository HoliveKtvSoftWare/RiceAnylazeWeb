<template>
  <!--
    茎秆 / 剑叶分析页面的路由外壳：两个页面共用同一份看板实现
    （components/AnalysisWorkspace.vue），只把"分析大类"通过 prop 传进去，
    因此两页的 UI 与交互完全一致。
  -->
  <AnalysisWorkspace :group="group" />
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AnalysisWorkspace from '@/components/AnalysisWorkspace.vue';
import { DEFAULT_TASK_GROUP, getTaskGroup } from '@/utils/taskGroups';

const route = useRoute();

// 路由 meta.group 优先（便于将来复用同一组件挂多个路径），否则回退到路由名
const group = computed(
  () => getTaskGroup(route.meta?.group)?.key || getTaskGroup(route.name)?.key || DEFAULT_TASK_GROUP,
);
</script>
