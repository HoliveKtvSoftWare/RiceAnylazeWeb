<template>
  <!-- 剑叶与茎秆共用同一套分析工作台；group="leaf" 让历史记录与模型列表
       都只取剑叶那一类，和茎秆页完全隔开。 -->
  <AnalysisWorkspace group="leaf" />
</template>

<script setup>
import AnalysisWorkspace from '@/components/AnalysisWorkspace.vue';
</script>
