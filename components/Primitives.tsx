"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  X,
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Megaphone,
  FileText,
  CalendarClock,
} from "lucide-react";
import {
  countdown,
  dateLabel,
  statusLabel,
  typeLabels,
  type CourseEvent,
} from "@/lib/dashboard";

export function Dialog({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className="detail-dialog"
      aria-labelledby="dialog-title"
      aria-modal="true"
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const items = Array.from(
          e.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], select, input, [tabindex="0"]',
          ),
        ).filter((item) => item.getClientRects().length > 0);
        const first = items[0];
        const last = items[items.length - 1];
        if (
          (e.shiftKey && document.activeElement === first) ||
          (!e.shiftKey && document.activeElement === last)
        ) {
          e.preventDefault();
          (e.shiftKey ? last : first)?.focus();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-inner">
        <div className="dialog-header">
          <h2 id="dialog-title">{title}</h2>
          <button
            className="icon-button"
            autoFocus
            aria-label="关闭详情"
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
      </div>
    </dialog>,
    document.body,
  );
}
export function Empty({
  children = "当前筛选下没有事项。可以切换课程或类型查看其他记录。",
}: {
  children?: ReactNode;
}) {
  return <p className="empty">{children}</p>;
}
export function Panel({
  title,
  note,
  action,
  children,
  className = "",
}: {
  title: string;
  note?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          {note && <p>{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function CourseTag({ code }: { code: string }) {
  return (
    <span className="course-tag" data-course={code}>
      <i />
      {code}
    </span>
  );
}
function EventIcon({ type }: { type: CourseEvent["type"] }) {
  const Icon =
    {
      assignment: ClipboardList,
      quiz: ClipboardList,
      midterm: GraduationCap,
      exam: GraduationCap,
      announcement: Megaphone,
      material: FileText,
      academic: CalendarDays,
      class: BookOpen,
    }[type] ?? CalendarClock;
  return <Icon size={20} strokeWidth={1.7} />;
}
export function EventRow({
  event,
  now,
  open,
  compact = false,
}: {
  event: CourseEvent;
  now: string;
  open: (e: CourseEvent) => void;
  compact?: boolean;
}) {
  return (
    <button
      className={`event-row ${event.status === "history" ? "historical" : ""} ${compact ? "compact" : ""}`}
      onClick={() => open(event)}
    >
      <span className="event-symbol" data-course={event.course}>
        <EventIcon type={event.type} />
      </span>
      <div className="event-content">
        <div className="event-meta">
          <CourseTag code={event.course} />
          <span>{typeLabels[event.type]}</span>
        </div>
        <h3>{event.title}</h3>
        <p>
          {event.type === "class"
            ? event.detail.split(" · 来源")[0]
            : event.action}
        </p>
        <small className="event-time">
          {event.type === "class" && !event.date
            ? "每周固定课堂 · " + event.time
            : dateLabel(event.date, event.time)}
          {event.endDate ? ` 至 ${dateLabel(event.endDate)}` : ""}
        </small>
      </div>
      <span className="row-end">
        {event.type === "class"
          ? event.date
            ? "课堂安排"
            : "固定课堂"
          : event.status === "upcoming" && event.date
            ? countdown(event, now)
            : statusLabel(event, now)}
        <ArrowUpRight size={15} />
      </span>
    </button>
  );
}
export function EventDetail({
  event,
  now,
}: {
  event: CourseEvent;
  now: string;
}) {
  const links = Array.from(
    new Set(event.detail.match(/https?:\/\/[^\s；。]+/g) ?? []),
  );
  return (
    <>
      <div className="event-meta">
        <CourseTag code={event.course} />
        <span>{typeLabels[event.type]}</span>
        <span>{statusLabel(event, now)}</span>
      </div>
      <p className="detail-date">
        {event.type === "class" && !event.date
          ? "每周固定课堂 · " + event.time
          : dateLabel(event.date, event.time)}
        {event.endDate ? ` — ${dateLabel(event.endDate)}` : ""}
      </p>
      <div className="action-note">
        <small>下一步行动</small>
        <p>{event.action}</p>
      </div>
      <h3 className="detail-heading">要求与来源</h3>
      <p className="detail-text">{event.detail}</p>
      {links.length > 0 && (
        <div className="source-links">
          {links.map((link) => (
            <a href={link} target="_blank" rel="noreferrer" key={link}>
              打开原始来源 <ArrowUpRight size={14} />
            </a>
          ))}
        </div>
      )}
      <p className="fine-print">
        日期与要求沿用巡检记录；完成状态仅在来源明确时展示。
      </p>
    </>
  );
}
