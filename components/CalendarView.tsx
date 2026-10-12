"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  dateLabel,
  monthCells,
  shiftMonth,
  sortEvents,
  type CourseEvent,
} from "@/lib/dashboard";
import { Empty, EventRow, Panel } from "./Primitives";

export function CalendarView({
  events,
  pending,
  now,
  month,
  changeMonth,
  open,
}: {
  events: CourseEvent[];
  pending: CourseEvent[];
  now: string;
  month: string;
  changeMonth: (month: string) => void;
  open: (e: CourseEvent) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const day = selected?.startsWith(month)
    ? selected
    : now.startsWith(month)
      ? now.slice(0, 10)
      : `${month}-01`;
  const selectedItems = sortEvents(
    events.filter(
      (e) => e.date && e.date <= day && (e.endDate ?? e.date) >= day,
    ),
  );
  return (
    <>
      <div className="calendar-layout">
        <Panel
          title={`${month.slice(0, 4)} 年 ${Number(month.slice(5))} 月`}
          note="新加坡时间 · 点击日期查看全部事项"
          action={
            <div className="calendar-controls">
              <button
                className="icon-button"
                aria-label="上个月"
                onClick={() => changeMonth(shiftMonth(month, -1))}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                className="text-button"
                onClick={() => {
                  setSelected(now.slice(0, 10));
                  changeMonth(now.slice(0, 7));
                }}
              >
                本月
              </button>
              <button
                className="icon-button"
                aria-label="下个月"
                onClick={() => changeMonth(shiftMonth(month, 1))}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          }
        >
          <div className="calendar-weekdays">
            {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
              <span key={d}>周{d}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {monthCells(month).map((date, i) => {
              if (!date) return <div key={i} className="calendar-blank" />;
              const items = sortEvents(
                events.filter(
                  (e) =>
                    e.date && e.date <= date && (e.endDate ?? e.date) >= date,
                ),
              );
              return (
                <button
                  className={`calendar-cell ${date === now.slice(0, 10) ? "is-today" : ""} ${date === day ? "selected" : ""}`}
                  key={date}
                  aria-label={`${dateLabel(date)}，${items.length} 项事项`}
                  aria-pressed={date === day}
                  onClick={() => setSelected(date)}
                >
                  <span className="day-number">{Number(date.slice(8))}</span>
                  <span className="cell-events">
                    {items.slice(0, 3).map((e) => (
                      <span
                        className="cell-event"
                        data-course={e.course}
                        key={e.id}
                      >
                        <i />
                        <span>
                          {e.type === "class"
                            ? `${e.time} ${e.course}`
                            : `${e.course === "NUS" ? "" : e.course + " "}${e.title}`}
                        </span>
                      </span>
                    ))}
                  </span>
                  {items.length > 0 && (
                    <small className="cell-count">
                      {items.length} 项
                      {items.length > 3 ? ` · +${items.length - 3}` : ""}
                    </small>
                  )}
                </button>
              );
            })}
          </div>
        </Panel>
        <Panel
          title={dateLabel(day)}
          note={`${selectedItems.length} 项 · 当前课程与类型筛选`}
        >
          {selectedItems.length ? (
            selectedItems.map((e) => (
              <EventRow key={e.id} compact event={e} now={now} open={open} />
            ))
          ) : (
            <Empty>
              这一天没有符合当前筛选的事项。固定课堂可通过“课程”类型查看。
            </Empty>
          )}
        </Panel>
      </div>
      <Panel
        title="日期待公布"
        note="无日期事项在这里单独追踪，确认后自动进入月历"
      >
        {pending.length ? (
          pending.map((e) => (
            <EventRow key={e.id} event={e} now={now} open={open} />
          ))
        ) : (
          <Empty>当前筛选下没有无日期事项。</Empty>
        )}
      </Panel>
    </>
  );
}
