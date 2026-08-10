import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildMonthGrid, isSameDay, isSameMonth } from "@/lib/utils/calendar-grid";

export const metadata: Metadata = {
  title: "Calendar",
  robots: { index: false, follow: false },
};

interface CalendarEntry {
  id: string;
  title: string;
  date: Date;
  href: string;
  kind: "training" | "merged";
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

function monthHref(year: number, month: number): string {
  return `/calendar?year=${year}&month=${month}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const session = await auth();
  if (!session) return null;

  const params = await searchParams;
  const now = new Date();
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = params.month ? Number(params.month) : now.getMonth();

  const grid = buildMonthGrid(year, month);
  const gridStart = grid[0];
  const gridEnd = new Date(grid[41].getFullYear(), grid[41].getMonth(), grid[41].getDate() + 1);

  const role = session.user.role;
  const userId = session.user.id;

  const trainingWhere =
    role === "EVENT_MANAGER"
      ? { companyId: userId }
      : role === "FACILITATOR"
        ? { selectedTrainerId: userId }
        : null;

  const mergedWhere =
    role === "EVENT_MANAGER"
      ? { OR: [{ initiatorId: userId }, { participants: { some: { companyId: userId } } }] }
      : role === "FACILITATOR"
        ? { selectedTrainerId: userId }
        : null;

  const [trainingEvents, mergedEvents, upcomingTraining, upcomingMerged] = await Promise.all([
    trainingWhere
      ? prisma.trainingEvent.findMany({
          where: { ...trainingWhere, startDate: { gte: gridStart, lt: gridEnd } },
          select: { id: true, title: true, startDate: true, slug: true },
        })
      : Promise.resolve([]),
    mergedWhere
      ? prisma.mergedTrainingEvent.findMany({
          where: { ...mergedWhere, startDate: { gte: gridStart, lt: gridEnd } },
          select: { id: true, title: true, startDate: true, slug: true },
        })
      : Promise.resolve([]),
    trainingWhere
      ? prisma.trainingEvent.findMany({
          where: { ...trainingWhere, startDate: { gte: now } },
          orderBy: { startDate: "asc" },
          take: 5,
          select: { id: true, title: true, startDate: true, slug: true },
        })
      : Promise.resolve([]),
    mergedWhere
      ? prisma.mergedTrainingEvent.findMany({
          where: { ...mergedWhere, startDate: { gte: now } },
          orderBy: { startDate: "asc" },
          take: 5,
          select: { id: true, title: true, startDate: true, slug: true },
        })
      : Promise.resolve([]),
  ]);

  const entries: CalendarEntry[] = [
    ...trainingEvents.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.startDate,
      href: `/events/${e.slug}`,
      kind: "training" as const,
    })),
    ...mergedEvents.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.startDate,
      href: `/merged-trainings/${e.slug}`,
      kind: "merged" as const,
    })),
  ];

  const upcoming: CalendarEntry[] = [
    ...upcomingTraining.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.startDate,
      href: `/events/${e.slug}`,
      kind: "training" as const,
    })),
    ...upcomingMerged.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.startDate,
      href: `/merged-trainings/${e.slug}`,
      kind: "merged" as const,
    })),
  ]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  const prevMonth = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const nextMonth = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
  const today = new Date();

  return (
    <>
      <section className="hero cal-hero">
        <div className="hero-text">
          <span className="eyebrow">Event Management</span>
          <h1 className="hero-title">
            {MONTH_NAMES[month]} <span className="accent">{year}</span>
          </h1>
          <p className="hero-sub">
            <strong>{entries.length} event{entries.length === 1 ? "" : "s"}</strong> this month
            {upcoming.length > 0 && (
              <>
                {" "}
                · next up: {upcoming[0].title} on {upcoming[0].date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </>
            )}
          </p>
        </div>
        {role === "EVENT_MANAGER" && (
          <div className="hero-actions">
            <Link href="/events/new" className="btn btn--primary">
              <Plus />
              New event
            </Link>
          </div>
        )}
      </section>

      <section className="cal-shell" aria-label="Calendar">
        <aside className="cal-rail">
          <div className="cal-rail-card">
            <div className="cal-rail-head">
              <div className="cal-rail-title">
                {MONTH_NAMES[month]} {year}
              </div>
              <div className="cal-rail-tools">
                <Link href={monthHref(prevMonth.year, prevMonth.month)} className="mail-tool" aria-label="Previous month" style={{ width: 24, height: 24, display: "grid", placeItems: "center" }}>
                  ‹
                </Link>
                <Link href={monthHref(nextMonth.year, nextMonth.month)} className="mail-tool" aria-label="Next month" style={{ width: 24, height: 24, display: "grid", placeItems: "center" }}>
                  ›
                </Link>
              </div>
            </div>
            <div className="mini-cal-grid">
              {WEEKDAY_LETTERS.map((w, i) => (
                <div className="mini-cal-wd" key={`wd-${i}`}>
                  {w}
                </div>
              ))}
              {grid.map((day) => {
                const hasEvent = entries.some((e) => isSameDay(e.date, day));
                const inMonth = isSameMonth(day, { year, month });
                const isToday = isSameDay(day, today);
                return (
                  <Link
                    key={day.toISOString()}
                    href={monthHref(day.getFullYear(), day.getMonth())}
                    className={[
                      "mini-cal-day",
                      !inMonth && "is-other",
                      hasEvent && "has-event",
                      isToday && "is-today",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {day.getDate()}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="cal-rail-card">
            <div className="cal-rail-head">
              <div className="cal-rail-title">Event types</div>
            </div>
            <div className="cal-list">
              <div className="cal-list-item">
                <span className="cal-list-check" style={{ color: "var(--primary)" }} />
                <span className="cal-list-name">Training events</span>
                <span className="cal-list-count">{entries.filter((e) => e.kind === "training").length}</span>
              </div>
              <div className="cal-list-item">
                <span className="cal-list-check" style={{ color: "var(--purple)" }} />
                <span className="cal-list-name">Merged training</span>
                <span className="cal-list-count">{entries.filter((e) => e.kind === "merged").length}</span>
              </div>
            </div>
          </div>

          <div className="cal-rail-card">
            <div className="cal-rail-head">
              <div className="cal-rail-title">Upcoming</div>
            </div>
            {upcoming.length === 0 ? (
              <p style={{ color: "var(--t-light)", fontSize: 12.5 }}>Nothing on the horizon yet.</p>
            ) : (
              <div className="upc-list">
                {upcoming.map((e) => (
                  <Link key={e.id} href={e.href} className="upc-item">
                    <div className={`upc-date${isSameDay(e.date, today) ? " is-today" : ""}`}>
                      <div className="day">{e.date.getDate()}</div>
                      <span className="mo">{e.date.toLocaleDateString("en-US", { month: "short" })}</span>
                    </div>
                    <div className="upc-meta">
                      <div className="upc-title">{e.title}</div>
                      <div className="upc-time">
                        <span className="dot" style={{ background: e.kind === "training" ? "var(--primary)" : "var(--purple)" }} />
                        <span>{e.kind === "training" ? "Training" : "Merged training"}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="cal-main">
          <div className="cal-toolbar">
            <div className="cal-toolbar-left">
              <div className="cal-month">
                {MONTH_NAMES[month]} <span className="yr">{year}</span>
              </div>
              <div className="cal-nav">
                <Link href={monthHref(prevMonth.year, prevMonth.month)} className="cal-nav-btn" aria-label="Previous">
                  ‹
                </Link>
                <Link href={monthHref(today.getFullYear(), today.getMonth())} className="cal-today-btn">
                  Today
                </Link>
                <Link href={monthHref(nextMonth.year, nextMonth.month)} className="cal-nav-btn" aria-label="Next">
                  ›
                </Link>
              </div>
            </div>
          </div>

          <div className="cal-weekdays" style={{ paddingLeft: 10, paddingRight: 10 }}>
            {WEEKDAY_LETTERS.map((w, i) => (
              <div key={`hw-${i}`} className="mini-cal-wd" style={{ padding: "10px 0" }}>
                {w}
              </div>
            ))}
          </div>

          <div className="cal-grid" style={{ paddingLeft: 10, paddingRight: 10 }}>
            {grid.map((day) => {
              const dayEntries = entries.filter((e) => isSameDay(e.date, day));
              const inMonth = isSameMonth(day, { year, month });
              const isToday = isSameDay(day, today);
              return (
                <div key={day.toISOString()} className="cal-cell" style={{ opacity: inMonth ? 1 : 0.4 }}>
                  <span
                    className="cal-day-num"
                    style={isToday ? { background: "var(--primary)", color: "#fff" } : undefined}
                  >
                    {day.getDate()}
                  </span>
                  <div className="cal-chips">
                    {dayEntries.slice(0, 3).map((e) => (
                      <Link
                        key={e.id}
                        href={e.href}
                        className="cal-chip"
                        style={{
                          background: e.kind === "training" ? "var(--primary-soft)" : "var(--purple-soft)",
                          color: e.kind === "training" ? "var(--primary)" : "var(--purple)",
                          borderLeftColor: e.kind === "training" ? "var(--primary)" : "var(--purple)",
                        }}
                      >
                        <span className="cal-chip-title">{e.title}</span>
                      </Link>
                    ))}
                    {dayEntries.length > 3 && <span className="cal-chip-more">+{dayEntries.length - 3} more</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </>
  );
}
