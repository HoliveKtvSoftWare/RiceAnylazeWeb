const ACTIVE_STATUSES = new Set(['pending', 'queued', 'processing']);

/**
 * Keep the selected detail object in sync with the latest history response.
 * Mutating in place preserves image zoom/drag state in the detail pane.
 */
export function syncSelectedJob(historyList, selectedJob) {
  if (!selectedJob?.analysisId || !Array.isArray(historyList)) return selectedJob;

  const selectedId = String(selectedJob.analysisId);
  const freshJob = historyList.find(job => String(job?.analysisId) === selectedId);
  if (freshJob) Object.assign(selectedJob, freshJob);
  return selectedJob;
}

export function processingJobIds(historyList) {
  if (!Array.isArray(historyList)) return [];
  return historyList
    .filter(job => ACTIVE_STATUSES.has(job?.status))
    .map(job => job.analysisId)
    .filter(Boolean)
    .map(String);
}
