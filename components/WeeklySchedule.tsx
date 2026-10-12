import {
  schedulePosition,
  type CourseEvent,
  type Meeting,
} from "@/lib/dashboard";
import { CourseTag, Panel } from "./Primitives";
export function WeeklySchedule({
  meetings,
  open,
}: {
  meetings: Meeting[];
  open: (e: CourseEvent) => void;
}) {
  return (
    <Panel title="固定周课表" note="用户配置 · 新加坡时间">
      <div className="schedule-note">
        固定课表和教学周由用户配置；Canvas API 不保证提供完整课表。临时调整请查日历与公告。
      </div>
      <div
        className="schedule-scroll"
        tabIndex={0}
        role="region"
        aria-label="固定课表，可横向滚动"
      >
        <div className="schedule-board">
          <div className="schedule-head">
            <span>SGT</span>
            {["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map(
              (d) => (
                <strong key={d}>{d}</strong>
              ),
            )}
          </div>
          <div className="schedule-body">
            <div className="schedule-hours">
              {Array.from({ length: 16 }, (_, i) => (
                <span key={i} style={{ top: i * 64 }}>
                  {i + 8}:00
                </span>
              ))}
            </div>
            {Array.from({ length: 7 }, (_, i) => (
              <div className="schedule-track" key={i}>
                {meetings
                  .filter((m) => m.weekday === (i + 1) % 7)
                  .map((m) => (
                    <button
                      className="meeting"
                      data-course={m.course}
                      data-start={m.start}
                      key={`${m.course}-${m.start}`}
                      style={schedulePosition(m)}
                      onClick={() =>
                        open({
                          id: `meeting-${m.course}-${m.weekday}`,
                          course: m.course,
                          type: "class",
                          title: `${m.course} 固定课堂`,
                          date: null,
                          time: m.start,
                          status: "upcoming",
                          detail: `每${["周一", "周二", "周三", "周四", "周五", "周六", "周日"][i]} ${m.start}–${m.end}，${m.venue}。教学周 ${m.weeks}。来源：用户配置课表。临时教室调整以当日公告为准。`,
                          action: `按教学周课表前往 ${m.venue}`,
                        })
                      }
                    >
                      <CourseTag code={m.course} />
                      <strong>
                        {m.start}–{m.end}
                      </strong>
                      <span>{m.venue}</span>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
