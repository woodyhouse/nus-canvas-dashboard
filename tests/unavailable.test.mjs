import test from 'node:test';
import assert from 'node:assert/strict';
import { sectionUnavailable } from '../scripts/sync.mjs';
test('disabled Files/Quizzes are explicitly unavailable; assessment and transient failures remain fatal', () => {
  for (const section of ['files', 'quizzes']) {
    assert.equal(sectionUnavailable(section, 403), true);
    assert.equal(sectionUnavailable(section, 404), true);
    assert.equal(sectionUnavailable(section, 401), false);
    assert.equal(sectionUnavailable(section, 500), false);
  }
  for (const section of ['assignments', 'calendar', 'announcements', 'modules']) assert.equal(sectionUnavailable(section, 403), false);
});
