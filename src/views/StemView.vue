<template>
  <!-- 茎秆与剑叶共用同一套分析工作台；group="stem" 让历史记录与模型列表
       都只取茎秆那一类，和剑叶页完全隔开。 -->
  <AnalysisWorkspace group="stem" />
</template>

<script setup>
import AnalysisWorkspace from '@/components/AnalysisWorkspace.vue';
</script>
