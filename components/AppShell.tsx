"use client";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  BookOpen,
  CalendarDays,
  Clock3,
  Database,
  GraduationCap,
  History,
  House,
  Menu,
  Moon,
  PanelLeftClose,
  RefreshCw,
  Sun,
} from "lucide-react";
import dashboard from "@/data/events.json";
import {
  classSessions,
  dateLabel,
  filterEvents,
  parseRoute,
  singaporeNow,
  typeLabels,
  updatedLabel,
  type CourseEvent,
  type DashboardData,
  type View,
} from "@/lib/dashboard";
import { CalendarView } from "./CalendarView";
import { CourseDetail } from "./CourseDetail";
import { Overview } from "./Overview";
import { TimelineView } from "./TimelineView";
import { WeeklySchedule } from "./WeeklySchedule";
import { CourseTag, Dialog, Empty, EventDetail, EventRow } from "./Primitives";

const data = dashboard as DashboardData;
const sessions = classSessions(data);
const nav = [
  { id: "overview", label: "总览", icon: House },
  { id: "calendar", label: "日历", icon: CalendarDays },
  { id: "timeline", label: "时间线", icon: History },
  { id: "week", label: "固定课表", icon: Clock3 },
] as const;
const meta: Record<View, { title: string; subtitle: string; en: string }> = {
  overview: {
    title: "总览",
    subtitle: "",
    en: "OVERVIEW",
  },
  calendar: {
    title: "日历",
    subtitle: "按课程与事项类型探索这个学期。固定课堂请选择“课程”。",
    en: "CALENDAR",
  },
  timeline: {
    title: "时间线",
    subtitle: "从已确认的下一步行动，到完整的学期历史。",
    en: "TIMELINE",
  },
  week: {
    title: "固定课表",
    subtitle: "按真实时间排列课堂，提前安排到校与课后学习。",
    en: "WEEKLY SCHEDULE",
  },
  course: {
    title: "课程详情",
    subtitle: "已确认安排、待公布事项与原始要求。",
    en: "MY COURSE",
  },
};
const subscribeRoute = (listener: () => void) => {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
};
const subscribeClock = (listener: () => void) => {
  const id = window.setInterval(listener, 1000);
  return () => window.clearInterval(id);
};
const subscribeTheme = (listener: () => void) => {
  window.addEventListener("storage", listener);
  window.addEventListener("themechange", listener);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("themechange", listener);
    media.removeEventListener("change", listener);
  };
};
function getTheme() {
  try {
    return (
      localStorage.getItem("nus-dashboard-theme") ??
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    );
  } catch {
    return "light";
  }
}
function ThemeToggle({ theme }: { theme: string }) {
  return (
    <button
      className="icon-button"
      aria-label={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
      aria-pressed={theme === "dark"}
      onClick={() => {
        try {
          localStorage.setItem(
            "nus-dashboard-theme",
            theme === "dark" ? "light" : "dark",
          );
        } catch {
          /* Storage may be disabled by the browser. */
        }
        window.dispatchEvent(new Event("themechange"));
      }}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
function SourcePanel() {
  return (
    <>
      <p className="detail-date">
        最近更新时间：
        {data.updatedAt.replace("T", " ").replace("+08:00", " SGT")}
      </p>
      <div className="source-list">
        {data.sources.map((s) => (
          <article key={s.name}>
            <Database size={18} />
            <div>
              <h3>{s.name}</h3>
              <p>{s.detail}</p>
            </div>
          </article>
        ))}
      </div>
      <a
        className="source-link"
        href="https://nus.edu.sg/registrar/calendar"
        target="_blank"
        rel="noreferrer"
      >
        查看 NUS 官方校历 ↗
      </a>
      <p className="fine-print">
        此处展示最近成功巡检的记录。页面时间与倒计时使用 Asia/Singapore。
      </p>
    </>
  );
}
function Sidebar({
  view,
  detail,
  collapsed,
  navigate,
  collapse,
}: {
  view: View;
  detail: string;
  collapsed: boolean;
  navigate: (view: string, detail?: string) => void;
  collapse: () => void;
}) {
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="brand">
        <span className="brand-mark">
          <GraduationCap size={23} />
        </span>
        <div>
          <strong>
            NUS <span>Study</span>
          </strong>
          <small>{data.semester || "Canvas dashboard"}</small>
        </div>
      </div>
      <button
        className="collapse-button"
        onClick={collapse}
        aria-label={collapsed ? "展开导航" : "收起导航"}
        aria-expanded={!collapsed}
      >
        {collapsed ? <Menu size={18} /> : <PanelLeftClose size={18} />}
      </button>
      <div className="sidebar-label">学习</div>
      <nav aria-label="主要导航">
        {nav.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-label={label}
            aria-current={view === id ? "page" : undefined}
            className={view === id ? "active" : ""}
            onClick={() => navigate(id)}
          >
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-label course-label">我的课程</div>
      <nav className="course-nav" aria-label="课程导航">
        {data.courses.map((c) => (
          <button
            key={c.code}
            aria-label={`${c.code} 课程详情`}
            aria-current={
              view === "course" && detail === c.code ? "page" : undefined
            }
            className={view === "course" && detail === c.code ? "active" : ""}
            onClick={() => navigate("course", c.code)}
          >
            <CourseTag code={c.code} />
          </button>
        ))}
      </nav>
      <div className="semester-note">
        <BookOpen size={20} />
        <strong>{data.semester || "Canvas"}</strong>
        <p>{data.demo ? "虚构演示数据" : "本机同步数据"}</p>
        <span>{data.courses.length} 门课程 · 新加坡时间</span>
      </div>
      <div className="sidebar-foot">
        <i />
        私人学习空间
      </div>
    </aside>
  );
}
function Topbar({
  theme,
  openSources,
}: {
  theme: string;
  openSources: () => void;
}) {
  return (
    <header className="topbar">
      <div className="mobile-brand">
        <GraduationCap size={22} />
        <strong>NUS Study</strong>
      </div>
      <button className="monitor-status" onClick={openSources}>
        <RefreshCw size={14} />
        <span>{data.demo ? "演示模式 · 未连接 Canvas" : "Canvas 同步快照"}</span>
        <span className="status-dot" />
        <span className="compact-updated">
          最近更新 {updatedLabel(data.updatedAt)} SGT
        </span>
      </button>
      <div className="topbar-right">
        <span className="updated">
          最近更新 <strong>{updatedLabel(data.updatedAt)} SGT</strong>
        </span>
        <button
          className="source-button"
          aria-label="数据来源"
          onClick={openSources}
        >
          <Database size={16} />
          <span>数据来源</span>
        </button>
        <ThemeToggle theme={theme} />
      </div>
    </header>
  );
}
export function AppShell() {
  const search = useSyncExternalStore(
    subscribeRoute,
    () => window.location.search,
    () => "",
  );
  const now = useSyncExternalStore(subscribeClock, singaporeNow, () =>
    data.updatedAt.slice(0, 16),
  );
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => "light");
  const route = parseRoute(search, data.courses);
  const { view, course, type, ascending } = route;
  const detailCode = new URLSearchParams(search).get("detail");
  const detail =
    data.courses.find((c) => c.code === detailCode) ?? data.courses[0];
  const month = route.month ?? now.slice(0, 7);
  const [collapsed, setCollapsed] = useState(false);
  const [overlay, setOverlay] = useState<{
    title: string;
    content: ReactNode;
  } | null>(null);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  const change = (values: Record<string, string>) => {
    const q = new URLSearchParams(window.location.search);
    Object.entries(values).forEach(([key, value]) => q.set(key, value));
    window.history.pushState(null, "", `?${q}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  const navigate = (next: string, code?: string) => {
    setOverlay(null);
    change({ view: next, ...(code ? { detail: code } : {}) });
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const openSources = () =>
    setOverlay({ title: "数据来源与巡检记录", content: <SourcePanel /> });
  const open = (event: CourseEvent) =>
    setOverlay({
      title: event.title,
      content: <EventDetail event={event} now={now} />,
    });
  const showList = (title: string, items: CourseEvent[]) => {
    if (title === "最新巡检来源记录") {
      openSources();
      return;
    }
    setOverlay({
      title,
      content: items.length ? (
        items.map((e) => (
          <EventRow key={e.id} event={e} now={now} open={open} />
        ))
      ) : (
        <Empty>当前没有此类事项。</Empty>
      ),
    });
  };
  const filtered = filterEvents(data.events, { course, type });
  const filteredSessions = sessions.filter(
    (e) => course === "ALL" || e.course === course,
  );
  const calendarEvents = type === "class" ? filteredSessions : filtered;
  return (
    <div className={`app-shell ${collapsed ? "nav-collapsed" : ""}`}>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <Sidebar
        view={view}
        detail={detail.code}
        collapsed={collapsed}
        navigate={navigate}
        collapse={() => setCollapsed(!collapsed)}
      />
      <div className="workspace">
        <Topbar theme={theme} openSources={openSources} />
        <main id="main-content" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <div className="eyebrow">{dateLabel(now.slice(0, 10))}</div>
              <h1>{meta[view].title}</h1>
              {meta[view].subtitle && <p>{meta[view].subtitle}</p>}
            </div>
            {view === "overview" && (
              <button
                className="outline-button"
                onClick={() => navigate("calendar")}
              >
                <CalendarDays size={16} />
                打开日历
              </button>
            )}
          </div>
          {view !== "course" && (
            <div className="filter-bar">
              <label>
                课程
                <select
                  aria-label="课程筛选"
                  value={course}
                  onChange={(e) => change({ course: e.target.value })}
                >
                  <option value="ALL">全部课程与校历</option>
                  {data.courses.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </label>
              {(view === "calendar" || view === "timeline") && (
                <label>
                  类型
                  <select
                    aria-label="事件类型"
                    value={type}
                    onChange={(e) =>
                      change({ [`${view}-type`]: e.target.value })
                    }
                  >
                    {Object.entries(typeLabels)
                      .filter(([key]) => view === "calendar" || key !== "class")
                      .map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <span>
                {view === "week"
                  ? "按固定教学时间展示"
                  : `${view === "calendar" && type === "class" ? calendarEvents.length : filtered.length} 条来源记录`}
              </span>
              {(course !== "ALL" || type !== "all") && (
                <button
                  className="text-button"
                  onClick={() =>
                    change({ course: "ALL", [`${view}-type`]: "all" })
                  }
                >
                  清除筛选
                </button>
              )}
            </div>
          )}
          {view === "overview" && (
            <Overview
              data={data}
              events={filtered}
              sessions={filteredSessions}
              now={now}
              open={open}
              navigate={navigate}
              showList={showList}
            />
          )}
          {view === "calendar" && (
            <CalendarView
              events={calendarEvents}
              pending={filtered.filter((e) => !e.date)}
              now={now}
              month={month}
              changeMonth={(month) => change({ month })}
              open={open}
            />
          )}
          {view === "timeline" && (
            <TimelineView
              events={filtered}
              now={now}
              ascending={ascending}
              setOrder={(ascending) =>
                change({ order: ascending ? "asc" : "desc" })
              }
              open={open}
            />
          )}
          {view === "week" && (
            <WeeklySchedule
              meetings={data.meetings.filter(
                (m) => course === "ALL" || m.course === course,
              )}
              open={open}
            />
          )}
          {view === "course" && (
            <CourseDetail
              course={detail}
              events={data.events}
              now={now}
              open={open}
              showList={showList}
            />
          )}
          <footer>
            <span>{data.demo ? "虚构演示数据 · 未连接账户" : "Canvas API · 本地核验补充"}</span>
            <button className="text-button" onClick={openSources}>
              数据更新时间 {updatedLabel(data.updatedAt)} SGT ↗
            </button>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="移动端导航">
        {nav.map(({ id, label, icon: Icon }) => (
          <button
            aria-current={view === id ? "page" : undefined}
            className={view === id ? "active" : ""}
            key={id}
            onClick={() => navigate(id)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
        <button
          className={view === "course" ? "active" : ""}
          onClick={() =>
            setOverlay({
              title: "我的课程",
              content: (
                <div className="mobile-course-list">
                  {data.courses.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => navigate("course", c.code)}
                    >
                      <CourseTag code={c.code} />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              ),
            })
          }
        >
          <BookOpen size={20} />
          <span>课程</span>
        </button>
      </nav>
      {overlay && (
        <Dialog
          key={overlay.title}
          title={overlay.title}
          close={() => setOverlay(null)}
        >
          {overlay.content}
        </Dialog>
      )}
    </div>
  );
}
