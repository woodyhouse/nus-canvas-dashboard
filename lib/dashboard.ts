export type EventType =
  | "assignment"
  | "quiz"
  | "midterm"
  | "exam"
  | "announcement"
  | "material"
  | "academic";
export type FilterType = EventType | "class" | "all";
export type Status = "history" | "upcoming" | "pending";
export type Course = { code: string; name: string; color: string };
export type Meeting = {
  course: string;
  weekday: number;
  start: string;
  end: string;
  venue: string;
  weeks: string;
};
export type CourseEvent = {
  id: string;
  course: string;
  type: EventType | "class";
  title: string;
  date: string | null;
  endDate?: string;
  time: string;
  status: Status;
  detail: string;
  action: string;
};
export type DashboardData = {
  demo?: boolean;
  semester?: string;
  calendar?: { start: string; end: string; excludedDates: string[]; breaks: { start: string; end: string }[] };
  updatedAt: string;
  sources: { name: string; detail: string }[];
  courses: Course[];
  meetings: Meeting[];
  events: CourseEvent[];
};
export type View = "overview" | "calendar" | "timeline" | "week" | "course";
export type Filters = { course: string; type: FilterType };
export const typeLabels: Record<FilterType, string> = {
  all: "全部非课程事项",
  class: "课程",
  assignment: "作业",
  quiz: "Quiz",
  midterm: "Midterm",
  exam: "考试",
  announcement: "公告",
  material: "资料",
  academic: "校历",
};
export const weekdays = [
  "周日",
  "周一",
  "周二",
  "周三",
  "周四",
  "周五",
  "周六",
];
export const actionTypes = ["assignment", "quiz", "midterm", "exam"];
export function singaporeNow(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(" ", "T");
}
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function weekday(date: string) {
  return weekdays[new Date(`${date}T12:00:00Z`).getUTCDay()];
}
export function dateLabel(date: string | null, time = "") {
  return date
    ? `${Number(date.slice(5, 7))}月${Number(date.slice(8))}日 · ${weekday(date)}${time ? ` · ${time}` : ""}`
    : "日期待公布";
}
export function updatedLabel(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Singapore",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(date));
}
export function sortEvents(events: CourseEvent[], ascending = true) {
  return [...events].sort(
    (a, b) =>
      (ascending ? 1 : -1) *
      `${a.date ?? "9999"}T${a.time || "23:59"}`.localeCompare(
        `${b.date ?? "9999"}T${b.time || "23:59"}`,
      ),
  );
}
export function filterEvents(events: CourseEvent[], filters: Filters) {
  return events.filter(
    (e) =>
      (filters.course === "ALL" || e.course === filters.course) &&
      (filters.type === "all" ? e.type !== "class" : e.type === filters.type),
  );
}
export function isElapsed(event: CourseEvent, now: string) {
  return (
    !!event.date &&
    `${event.endDate ?? event.date}T${event.time || "23:59"}` < now.slice(0, 16)
  );
}
export function statusLabel(event: CourseEvent, now: string) {
  if (!event.date || event.status === "pending") return "待公布";
  if (event.status === "history") return "历史记录";
  if (isElapsed(event, now))
    return actionTypes.includes(event.type)
      ? "截止已过 · 完成待核实"
      : "已过日期";
  return "即将到来";
}
export function upcoming(events: CourseEvent[], now: string) {
  return sortEvents(
    events.filter(
      (e) =>
        e.status === "upcoming" &&
        !!e.date &&
        !isElapsed(e, now) &&
        actionTypes.includes(e.type),
    ),
  );
}
export function countdown(event: CourseEvent, now: string) {
  if (!event.date) return "日期待定";
  const diff =
    new Date(`${event.date}T${event.time || "23:59"}:00+08:00`).getTime() -
    new Date(`${now.slice(0, 16)}:00+08:00`).getTime();
  if (diff < 0) return "已过截止";
  if (diff < 86400000)
    return `还剩 ${Math.max(1, Math.ceil(diff / 3600000))} 小时`;
  return `还有 ${Math.ceil(diff / 86400000)} 天`;
}
export function minutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
export function schedulePosition(
  meeting: Meeting,
  start = 8,
  hourHeight = 64,
) {
  return {
    top: ((minutes(meeting.start) - start * 60) / 60) * hourHeight,
    height: ((minutes(meeting.end) - minutes(meeting.start)) / 60) * hourHeight,
  };
}
// Recurring sessions require user-configured term dates; no inferred timetable.
export function classSessions(data: DashboardData): CourseEvent[] {
  const sessions: CourseEvent[] = [];
  if (!data.calendar) return sessions;
  for (let day = data.calendar.start; day <= data.calendar.end; day = addDays(day, 1)) {
    if (data.calendar.excludedDates.includes(day) || data.calendar.breaks.some(b => day >= b.start && day <= b.end))
      continue;
    for (const m of data.meetings.filter(
      (m) => m.weekday === new Date(`${day}T12:00:00Z`).getUTCDay(),
    )) {
      const changes = data.events.filter(
        (e) =>
          e.course === m.course &&
          e.date === day &&
          e.type === "announcement" &&
          /课堂.*(改|调整)/.test(e.title),
      );
      sessions.push({
        id: `class-${m.course}-${day}-${m.start}`,
        course: m.course,
        type: "class",
        title: `${m.course} Lecture`,
        date: day,
        time: m.start,
        status: "upcoming",
        detail: `${m.start}–${m.end} · ${m.venue} · 来源：用户配置课表。${changes.length ? " 当日调整：" + changes.map((e) => e.detail).join("；") : ""}`,
        action: changes.length
          ? changes.map((e) => e.action).join("；")
          : `前往 ${m.venue}`,
      });
    }
  }
  return sessions;
}
export function monthCells(month: string) {
  const [year, m] = month.split("-").map(Number);
  const offset = (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, i) =>
    i < offset || i >= offset + count
      ? null
      : `${month}-${String(i - offset + 1).padStart(2, "0")}`,
  );
}
export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}
export function parseRoute(search: string, courses: Course[]) {
  const q = new URLSearchParams(search);
  const views: View[] = ["overview", "calendar", "timeline", "week", "course"];
  const view = views.includes(q.get("view") as View)
    ? (q.get("view") as View)
    : "overview";
  const course = courses.some((c) => c.code === q.get("course"))
    ? q.get("course")!
    : "ALL";
  const candidate = q.get(`${view}-type`) as FilterType;
  return {
    view,
    course,
    type:
      candidate in typeLabels && (view === "calendar" || candidate !== "class")
        ? candidate
        : ("all" as FilterType),
    ascending: q.get("order") !== "desc",
    month: /^\d{4}-(0[1-9]|1[0-2])$/.test(q.get("month") ?? "")
      ? q.get("month")!
      : null,
  };
}
