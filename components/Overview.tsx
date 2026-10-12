import { ArrowRight, BookOpen, CalendarDays, ChevronRight } from "lucide-react";
import {
  addDays,
  countdown,
  dateLabel,
  isElapsed,
  sortEvents,
  upcoming,
  type Course,
  type CourseEvent,
  type DashboardData,
} from "@/lib/dashboard";
import { CourseTag, Empty, EventRow, Panel } from "./Primitives";

type Props = {
  data: DashboardData;
  events: CourseEvent[];
  sessions: CourseEvent[];
  now: string;
  open: (e: CourseEvent) => void;
  navigate: (view: string, detail?: string) => void;
  showList: (title: string, events: CourseEvent[]) => void;
};
export function CourseSummaryCard({
  course,
  events,
  now,
  navigate,
  showList,
}: {
  course: Course;
  events: CourseEvent[];
  now: string;
  navigate: Props["navigate"];
  showList: Props["showList"];
}) {
  const confirmed = sortEvents(
    events.filter(
      (e) =>
        e.course === course.code &&
        e.date &&
        e.status === "upcoming" &&
        !isElapsed(e, now),
    ),
  );
  const pending = events.filter(
    (e) => e.course === course.code && (!e.date || e.status === "pending"),
  );
  return (
    <article className="course-summary" data-course={course.code}>
      <button
        className="course-title"
        aria-label={`${course.code} ${course.name}`}
        onClick={() => navigate("course", course.code)}
      >
        <span className="course-glyph">
          <BookOpen size={23} />
        </span>
        <span className="course-title-copy">
          <CourseTag code={course.code} />
          <h3>{course.name}</h3>
        </span>
        <ChevronRight size={17} />
      </button>
      <div className="course-counts">
        <button
          aria-label={`已确认 ${confirmed.length} 查看事项 ↗`}
          onClick={() => showList(`${course.code} · 已确认事项`, confirmed)}
        >
          <span>已确认</span>
          <strong>{confirmed.length}</strong>
          <ChevronRight size={14} />
        </button>
        <button
          aria-label={`待公布 ${pending.length} 查看事项 ↗`}
          onClick={() => showList(`${course.code} · 待公布事项`, pending)}
        >
          <span>待公布</span>
          <strong>{pending.length}</strong>
          <ChevronRight size={14} />
        </button>
      </div>
      <p>
        {confirmed[0]
          ? `${dateLabel(confirmed[0].date)} · ${confirmed[0].title}`
          : "目前没有已确认的未来事项"}
      </p>
    </article>
  );
}
export function Overview({
  data,
  events,
  sessions,
  now,
  open,
  navigate,
  showList,
}: Props) {
  const today = now.slice(0, 10);
  const due = upcoming(events, now);
  const next = due[0];
  const week = sortEvents([
    ...events.filter(
      (e) =>
        e.date &&
        e.date >= today &&
        e.date <= addDays(today, 6) &&
        !isElapsed(e, now),
    ),
    ...sessions.filter(
      (e) => e.date && e.date >= today && e.date <= addDays(today, 6),
    ),
  ]);
  const todayClasses = sessions.filter((e) => e.date === today);
  const pending = events.filter((e) => !e.date || e.status === "pending");
  const review = events.filter(
    (e) =>
      e.status === "upcoming" &&
      isElapsed(e, now) &&
      ["assignment", "quiz", "midterm", "exam"].includes(e.type),
  );
  const recent = sortEvents(
    events.filter(
      (e) =>
        e.date &&
        e.date <= today &&
        ["material", "announcement"].includes(e.type),
    ),
    false,
  ).slice(0, 4);
  return (
    <>
      <div className="overview-board">
        <Panel
          title="即将到来"
          action={
            <button
              className="text-button"
              onClick={() => navigate("timeline")}
            >
              全部 {due.length} 项 <ChevronRight size={15} />
            </button>
          }
        >
          {next ? (
            <section className="next-action" data-course={next.course}>
              <div className="next-caption">
                <span>下一项行动</span>
                <span className="countdown">{countdown(next, now)}</span>
              </div>
              <div className="next-meta">
                <CourseTag code={next.course} />
              </div>
              <h2>{next.title}</h2>
              <p className="next-date">{dateLabel(next.date, next.time)}</p>
              <p className="next-description">{next.action}</p>
              <button className="primary-button" onClick={() => open(next)}>
                查看要求与来源 <ChevronRight size={16} />
              </button>
            </section>
          ) : (
            <Empty>当前没有已确认的未来作业或考试。</Empty>
          )}
          {due.slice(1, 5).map((e) => (
            <EventRow key={e.id} event={e} now={now} open={open} />
          ))}
        </Panel>
        <div className="stack">
          <Panel title="未来 7 天" action={<CalendarDays size={19} />}>
            <div className="week-strip">
              {Array.from({ length: 7 }, (_, i) => {
                const day = addDays(today, i);
                const count = week.filter((e) => e.date === day).length;
                return (
                  <button
                    key={day}
                    className={i === 0 ? "today" : ""}
                    onClick={() =>
                      showList(
                        dateLabel(day),
                        week.filter((e) => e.date === day),
                      )
                    }
                  >
                    <small>{dateLabel(day).split(" · ")[1]}</small>
                    <strong>{Number(day.slice(8))}</strong>
                    <span>{count ? `${count} 项` : "—"}</span>
                  </button>
                );
              })}
            </div>
            <p className="week-caption">点击日期查看当天课程与事项</p>
          </Panel>
          <Panel title="今日课程" note={dateLabel(today)}>
            {todayClasses.length ? (
              todayClasses.map((e) => (
                <EventRow compact key={e.id} event={e} now={now} open={open} />
              ))
            ) : (
              <Empty>今天没有固定课堂。</Empty>
            )}
          </Panel>
          <Panel
            title="待公布"
            action={
              <button
                className="text-button"
                onClick={() => showList("待公布事项", pending)}
              >
                全部 {pending.length} 项 <ChevronRight size={15} />
              </button>
            }
          >
            {pending.slice(0, 2).map((e) => (
              <EventRow compact key={e.id} event={e} now={now} open={open} />
            ))}
            {!pending.length && <Empty>当前没有待公布事项。</Empty>}
          </Panel>
        </div>
      </div>
      {review.length > 0 && (
        <button
          className="review-note"
          onClick={() => showList("截止已过 · 完成状态待核实", review)}
        >
          <span>需核实</span>
          {review.length} 项截止日期已过，完成状态待核实。
          <ChevronRight size={16} />
        </button>
      )}
      <div className="section-heading">
        <h2>我的课程</h2>
        <span>{data.semester || "Canvas"}</span>
      </div>
      <div className="course-grid">
        {data.courses.map((course) => (
          <CourseSummaryCard
            key={course.code}
            course={course}
            events={data.events}
            now={now}
            navigate={navigate}
            showList={showList}
          />
        ))}
      </div>
      <Panel
        title="最近更新"
        action={
          <button
            className="text-button"
            onClick={() => showList("最新巡检来源记录", [])}
          >
            来源记录 <ArrowRight size={14} />
          </button>
        }
      >
        <div className="latest-source-note">
          <strong>最近巡检 · {data.updatedAt.slice(0, 10)}</strong>
          <p>{data.sources[0]?.detail}</p>
        </div>
        <div className="recent-grid">
          {recent.map((e) => (
            <EventRow compact key={e.id} event={e} now={now} open={open} />
          ))}
        </div>
        {!recent.length && <Empty />}
      </Panel>
    </>
  );
}
