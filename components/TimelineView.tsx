"use client";
import { sortEvents, upcoming, type CourseEvent } from "@/lib/dashboard";
import { Empty, EventRow, Panel } from "./Primitives";
export function TimelineView({
  events,
  now,
  ascending,
  setOrder,
  open,
}: {
  events: CourseEvent[];
  now: string;
  ascending: boolean;
  setOrder: (ascending: boolean) => void;
  open: (e: CourseEvent) => void;
}) {
  const dated = sortEvents(
    events.filter((e) => e.date),
    ascending,
  );
  const pending = events.filter((e) => !e.date);
  const next = upcoming(events, now);
  return (
    <div className="timeline-layout">
      <div className="stack">
        <Panel title="需要提交或参加" note="优先按截止时间展示">
          {next.slice(0, 3).map((e) => (
            <EventRow key={e.id} event={e} now={now} open={open} />
          ))}
          {!next.length && <Empty />}
        </Panel>
        <Panel
          title="全部日期记录"
          note="历史记录完整保留，以较低视觉权重展示"
          action={
            <select
              aria-label="时间线排序"
              value={ascending ? "asc" : "desc"}
              onChange={(e) => setOrder(e.target.value === "asc")}
            >
              <option value="asc">最早在前</option>
              <option value="desc">最近在前</option>
            </select>
          }
        >
          {dated.length ? (
            dated.map((e) => (
              <EventRow key={e.id} event={e} now={now} open={open} />
            ))
          ) : (
            <Empty />
          )}
        </Panel>
      </div>
      <Panel title="待公布追踪" note="日期确认后沿用原有事项 ID">
        {pending.length ? (
          pending.map((e) => (
            <EventRow key={e.id} compact event={e} now={now} open={open} />
          ))
        ) : (
          <Empty>当前筛选下没有待公布事项。</Empty>
        )}
      </Panel>
    </div>
  );
}
