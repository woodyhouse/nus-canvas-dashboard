import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { environment, accessToken, getAll, writeJsonAtomic, root } from './canvas.mjs';
export function plain(html = '') { return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }
export function sectionUnavailable(section, status) {
  return ['quizzes', 'files'].includes(section) && [403, 404].includes(status);
}
export function wall(iso) {
  if (!iso) return { date: null, time: '' };
  const str = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
  return { date: str.slice(0, 10), time: str.slice(11, 16) };
}
export function assignmentEvent(course, a) {
  const due = wall(a.due_at), submission = a.submission;
  const submitted = !!submission?.submitted_at;
  return { id: `canvas-assignment-${a.id}`, course, type: a.is_quiz_assignment ? 'quiz' : 'assignment', title: a.name, ...due,
    status: !due.date ? 'pending' : submitted ? 'history' : 'upcoming',
    detail: `${plain(a.description)} 来源：Canvas Assignment ${a.id}。提交方式：${(a.submission_types || []).join(', ')}。分值：${a.points_possible ?? '未公布'}。${a.html_url || ''}`,
    action: submitted ? '已提交；成绩请登录 Canvas 查看' : due.date ? '查看要求并完成提交' : '截止日期待确认' };
}
export async function sync() {
  const config = environment(), token = await accessToken(config);
  const courses = (await getAll(config.base, token, '/courses?enrollment_state=active&per_page=100')).filter(c => c.workflow_state === 'available');
  const target = resolve(root, 'data/events.json');
  const old = existsSync(target) ? JSON.parse(readFileSync(target, 'utf8')) : { events: [] };
  const preserved = new Map((old.demo ? [] : old.events).map(e => [e.id, e]));
  const snapshot = {}, changes = [], errors = [], unavailable = [];
  const colors = ['#005aa9', '#2f78a6', '#d56700', '#ef7c00'];
  const courseRows = courses.map((c, i) => ({ code: c.course_code || String(c.id), name: c.name, color: colors[i % colors.length] }));
  const priorPath = resolve(root, '.local/snapshot.json');
  const prior = existsSync(priorPath) ? JSON.parse(readFileSync(priorPath, 'utf8')) : {};
  const put = e => {
    if (JSON.stringify(preserved.get(e.id)) !== JSON.stringify(e)) changes.push(e.id);
    preserved.set(e.id, e);
  };
  for (const c of courses) {
    const code = c.course_code || String(c.id);
    for (const [section, path] of Object.entries({ assignments: `/courses/${c.id}/assignments?include[]=submission&per_page=100`, quizzes: `/courses/${c.id}/quizzes?per_page=100`, files: `/courses/${c.id}/files?per_page=100`, modules: `/courses/${c.id}/modules?include[]=items&per_page=100`, announcements: `/announcements?context_codes[]=course_${c.id}&start_date=2000-01-01&end_date=${new Date(Date.now()+86400000).toISOString().slice(0,10)}&per_page=100`, calendar: `/calendar_events?context_codes[]=course_${c.id}&all_events=true&per_page=100` })) {
      const key = `${c.id}:${section}`;
      try {
        const rows = await getAll(config.base, token, path);
        // Store only fields used by this app. Never retain signed download URLs, grades, or tokens.
        const safe = rows.map(r => section === 'files' ? { id: r.id, display_name: r.display_name, updated_at: r.updated_at, size: r.size } : section === 'modules' ? { id: r.id, name: r.name, items: (r.items || []).map(i => ({ id: i.id, title: i.title, type: i.type, content_id: i.content_id })) } : { id: r.id, title: r.title || r.name, updated_at: r.updated_at, due_at: r.due_at, posted_at: r.posted_at, start_at: r.start_at, contentHash: createHash('sha256').update(JSON.stringify({body:r.description || r.message, due:r.due_at, lock:r.lock_at, unlock:r.unlock_at, submissionTypes:r.submission_types, timeLimit:r.time_limit})).digest('hex') });
        snapshot[key] = { hash: createHash('sha256').update(JSON.stringify(safe)).digest('hex'), rows: safe };
        if (prior[key]?.hash !== snapshot[key].hash) changes.push(key);
        if (section === 'assignments') rows.forEach(a => put(assignmentEvent(code, a)));
        if (section === 'quizzes') rows.filter(q => !q.assignment_id).forEach(q => put({ id: `canvas-quiz-${q.id}`, course: code, type: 'quiz', title: q.title, ...wall(q.due_at), status: q.due_at ? 'upcoming' : 'pending', detail: `${plain(q.description)} 来源：Canvas Quiz ${q.id}。时限：${q.time_limit ?? '未公布'} 分钟。`, action: '登录 Canvas 核对测验开放时间与要求' }));
        if (section === 'announcements') rows.forEach(a => put({ id: `canvas-announcement-${a.id}`, course: code, type: 'announcement', title: a.title, ...wall(a.posted_at), status: 'history', detail: `${plain(a.message)} 来源：${a.html_url || `Canvas Announcement ${a.id}`}`, action: '查看原始公告；正文日期需进一步核验' }));
        if (section === 'calendar') rows.filter(r => r.start_at && !r.assignment).forEach(r => put({ id: `canvas-calendar-${r.id}`, course: code, type: 'academic', title: r.title, ...wall(r.start_at), status: 'upcoming', detail: `${plain(r.description)} 来源：Canvas Calendar ${r.id}；结束：${r.end_at || '未公布'}。`, action: '查看课程日历安排' }));
      } catch (error) {
        if (sectionUnavailable(section, error.status)) unavailable.push({ course: code, section, status: error.status });
        else errors.push({ course: code, section, message: error.message });
        if (prior[key]) snapshot[key] = prior[key];
      }
    }
  }
  if (errors.length) {
    writeJsonAtomic(resolve(root, '.local/last-check.json'), { checkedAt: new Date().toISOString(), changes: [...new Set(changes)], errors });
    throw new Error('Some Canvas sections could not be verified. Previous dashboard and baseline preserved; see .local/last-check.json.');
  }
  const overridesPath = resolve(root, 'data/overrides.local.json');
  const overrides = existsSync(overridesPath) ? JSON.parse(readFileSync(overridesPath, 'utf8')) : {};
  for (const event of overrides.events || []) preserved.set(event.id, event);
  const data = { demo: false, updatedAt: new Date().toISOString(), semester: overrides.semester || 'Canvas active courses', courses: courseRows, meetings: overrides.meetings || [], ...(overrides.calendar ? { calendar: overrides.calendar } : {}), events: [...preserved.values()], sources: [{ name: 'Canvas API', detail: '只读 API 同步：作业、公告、Modules、Files 元数据与 Calendar。保留历史事件；课件内的考试规则需要 agent 单独核验。未收集成绩与学生名单。' + (unavailable.length ? ` 未核验栏目：${unavailable.map(u => `${u.course} / ${u.section} (HTTP ${u.status})`).join('；')}。保留旧记录，请通过浏览器补查；不可用不等于没有内容。` : ' Files / Quizzes 查询成功。') }, { name: '本地核验补充', detail: 'data/overrides.local.json；用于教学周、课表和课件核验事实。' }] };
  writeJsonAtomic(target, data); writeJsonAtomic(priorPath, snapshot);
  writeJsonAtomic(resolve(root, '.local/last-check.json'), { checkedAt: data.updatedAt, changes: [...new Set(changes)], errors: [], unavailable });
  console.log(`Synced ${courses.length} courses; ${new Set(changes).size} changed records/sections. Rebuild to deploy the refreshed private snapshot.`);
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) sync().catch(() => { console.error('Canvas sync failed. Dashboard freshness was not advanced. Check local configuration and .local/last-check.json.'); process.exitCode = 1; });

