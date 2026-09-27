import assert from 'node:assert/strict';
import { processingJobIds, syncSelectedJob } from '../src/utils/analysisStatus.js';

const selected = {
  analysisId: 'our-1',
  status: 'processing',
  annotatedImageUrl: '',
};
const history = [
  {
    analysisId: 'our-1',
    status: 'completed',
    annotatedImageUrl: '/static/our-1.jpg',
  },
  { analysisId: 'stem-1', status: 'queued' },
];

const synced = syncSelectedJob(history, selected);
assert.equal(synced, selected, 'sync should preserve selected object identity');
assert.equal(selected.status, 'completed');
assert.equal(selected.annotatedImageUrl, '/static/our-1.jpg');
assert.deepEqual(processingJobIds(history), ['stem-1']);

console.log('analysis status regression tests passed');
