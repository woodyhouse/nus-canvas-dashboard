import {
  isElapsed,
  sortEvents,
  type Course,
  type CourseEvent,
} from "@/lib/dashboard";
import { CourseTag, Empty, EventRow, Panel } from "./Primitives";
export function CourseDetail({
  course,
  events,
  now,
  open,
  showList,
}: {
  course: Course;
  events: CourseEvent[];
  now: string;
  open: (e: CourseEvent) => void;
  showList: (title: string, events: CourseEvent[]) => void;
}) {
  const items = events.filter((e) => e.course === course.code);
  const confirmed = sortEvents(
    items.filter(
      (e) => e.date && e.status === "upcoming" && !isElapsed(e, now),
    ),
  );
  const pending = items.filter((e) => !e.date || e.status === "pending");
  const recent = sortEvents(
    items.filter(
      (e) =>
        e.date &&
        e.date <= now.slice(0, 10) &&
        ["announcement", "material"].includes(e.type),
    ),
    false,
  ).slice(0, 4);
  return (
    <>
      <section className="course-intro">
        <CourseTag code={course.code} />
        <h2>{course.name}</h2>
        <div className="detail-counts">
          <button
            onClick={() => showList(`${course.code} · 已确认事项`, confirmed)}
          >
            已确认 <strong>{confirmed.length}</strong> 查看具体事项 ↗
          </button>
          <button
            onClick={() => showList(`${course.code} · 待公布事项`, pending)}
          >
            待公布 <strong>{pending.length}</strong> 查看具体事项 ↗
          </button>
        </div>
      </section>
      <div className="two-columns">
        <Panel title="已确认的未来事项">
          {confirmed.length ? (
            confirmed.map((e) => (
              <EventRow key={e.id} event={e} now={now} open={open} />
            ))
          ) : (
            <Empty>当前没有已确认的未来事项。</Empty>
          )}
        </Panel>
        <Panel title="待公布与需确认">
          {pending.length ? (
            pending.map((e) => (
              <EventRow key={e.id} event={e} now={now} open={open} />
            ))
          ) : (
            <Empty>当前没有待公布事项。</Empty>
          )}
        </Panel>
      </div>
      <div className="two-columns">
        {[
          { title: "作业记录", types: ["assignment"] },
          { title: "Quiz 与考试", types: ["quiz", "midterm", "exam"] },
          { title: "资料与公告", types: ["material", "announcement"] },
          { title: "最近发布", types: [] },
        ].map((section) => {
          const list = section.types.length
            ? sortEvents(
                items.filter((e) => section.types.includes(e.type)),
                false,
              )
            : recent;
          return (
            <Panel key={section.title} title={section.title}>
              {list.length ? (
                list.map((e) => (
                  <EventRow
                    compact
                    key={e.id}
                    event={e}
                    now={now}
                    open={open}
                  />
                ))
              ) : (
                <Empty>来源记录中暂无此类事项。</Empty>
              )}
            </Panel>
          );
        })}
      </div>
    </>
  );
}
