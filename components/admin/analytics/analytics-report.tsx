import { formatCount, formatNaira, formatShare } from "@/lib/analytics/format";
import type { Metric, PlatformAnalytics } from "@/lib/services/admin-analytics.service";
import { EXPORT_DATASETS, EXPORT_LABELS } from "@/lib/services/admin-export.service";
import { RangeTabs } from "@/components/admin/analytics/range-tabs";
import { StatTile } from "@/components/admin/analytics/stat-tile";
import { FunnelBars, RankedBars } from "@/components/admin/analytics/ranked-bars";
import { TimeSeriesChart, type ChartSeries } from "@/components/admin/analytics/time-series-chart";
import "@/components/admin/analytics/analytics.css";

const ROLE_SERIES: ChartSeries[] = [
  { key: "FACILITATOR", label: "Facilitators", slot: 1 },
  { key: "EVENT_MANAGER", label: "Event Managers", slot: 2 },
  { key: "PROFESSIONAL", label: "Professionals", slot: 3 },
];
const EVENT_SERIES: ChartSeries[] = [
  { key: "standard", label: "Standard events", slot: 1 },
  { key: "merged", label: "Merged trainings", slot: 2 },
];
const APPLICATION_SERIES: ChartSeries[] = [{ key: "applications", label: "Applications", slot: 1 }];
const REVENUE_SERIES: ChartSeries[] = [{ key: "total", label: "Revenue", slot: 1 }];

function sum(a: Metric, b: Metric): Metric {
  return { current: a.current + b.current, previous: a.previous !== null && b.previous !== null ? a.previous + b.previous : null };
}

function ratio(part: number, whole: number, digits = 1): string {
  return whole > 0 ? (part / whole).toFixed(digits) : "—";
}

/** The whole analytics report for one date range. Pure presentation: the page fetches, this draws. */
export function AnalyticsReport({ data, isSuperAdmin }: { data: PlatformAnalytics; isSuperAdmin: boolean }) {
  const { users, events, engagement, money, range } = data;

  const newEvents = sum(events.newStandard, events.newMerged);
  const funnel = events.funnel;

  return (
    <div className="viz viz-page">
      <header className="viz-header">
        <div>
          <h1>Analytics</h1>
          <p>
            How the platform is growing: {range.label.toLowerCase()}
            {range.previous ? ", compared with the period just before it" : ""}. All dates are Lagos time.
          </p>
        </div>
        <RangeTabs active={range.key} />
      </header>

      <div className="viz-kpis">
        <StatTile label="New users" value={formatCount(users.newUsers.current)} current={users.newUsers.current} previous={users.newUsers.previous} />
        <StatTile
          label="Active users"
          title="People who did something in this period: applied to or posted an event, funded or paid, sent a chat message, left a review, or talked to Awé."
          value={formatCount(users.active.current)}
          current={users.active.current}
          previous={users.active.previous}
        />
        <StatTile label="New events" value={formatCount(newEvents.current)} current={newEvents.current} previous={newEvents.previous} note={`${formatCount(events.newMerged.current)} merged`} />
        <StatTile label="Applications" value={formatCount(events.applications.current)} current={events.applications.current} previous={events.applications.previous} />
        {money && (
          <StatTile label="Platform revenue" value={formatNaira(money.revenue.current)} current={money.revenue.current} previous={money.revenue.previous} />
        )}
        <StatTile
          label="Verified sign-ups"
          title="Of the people who signed up in this period, the share who have completed identity verification (so far)."
          value={formatShare(users.cohort.kycVerified, users.cohort.signedUp)}
          note={`${formatCount(users.cohort.kycVerified)} of ${formatCount(users.cohort.signedUp)} new users`}
        />
      </div>

      <section className="viz-section">
        <h2>Users</h2>
        <div className="viz-cols-wide">
          <TimeSeriesChart
            title="New users"
            subtitle={`${formatCount(users.newUsers.current)} sign-ups, by role`}
            points={users.series.points}
            series={ROLE_SERIES}
          />
          <RankedBars
            title="All users by role"
            subtitle={`${formatCount(Object.values(users.totalByRole).reduce((a, b) => a + b, 0))} in total · ${formatCount(users.totalDeactivated)} deactivated`}
            items={ROLE_SERIES.map((s) => ({ label: s.label, value: users.totalByRole[s.key as keyof typeof users.totalByRole] }))}
            showShare
          />
        </div>
        <div className="viz-cols">
          <FunnelBars
            title="Sign-up progress"
            subtitle="Of the people who signed up in this period"
            stages={[
              { label: "Signed up", value: users.cohort.signedUp },
              { label: "Finished onboarding", value: users.cohort.onboarded },
              { label: "Identity verified", value: users.cohort.kycVerified },
              { label: "Wallet ready", value: users.cohort.walletReady },
            ]}
          />
          <RankedBars title="New users by state" subtitle="Top 8, by where they say they are" items={users.byState} showShare />
        </div>
      </section>

      <section className="viz-section">
        <h2>Events and the marketplace</h2>
        <div className="viz-cols-wide">
          <TimeSeriesChart
            title="New events"
            subtitle={`${formatCount(newEvents.current)} created`}
            points={events.series.points}
            series={EVENT_SERIES}
          />
          <TimeSeriesChart
            title="Applications"
            subtitle={`${formatCount(events.applications.current)} facilitator bids`}
            points={events.applicationSeries.points}
            series={APPLICATION_SERIES}
          />
        </div>
        <div className="viz-cols">
          <FunnelBars
            title="Event pipeline"
            subtitle="Standard events created in this period, and how far each has got"
            stages={[
              { label: "Created", value: funnel.created },
              { label: "Funded", value: funnel.funded },
              { label: "Received applications", value: funnel.withApplications },
              { label: "Facilitator selected", value: funnel.trainerSelected },
              { label: "Completed", value: funnel.completed },
              { label: "Facilitator paid", value: funnel.paidOut },
            ]}
          />
          <RankedBars title="Top event categories" subtitle="Standard events created in this period" items={events.byCategory} showShare />
        </div>
        <div className="viz-kpis">
          <StatTile
            label="Applications per event"
            value={ratio(events.applicationsOnCohort, funnel.created)}
            note={`${formatCount(events.applicationsOnCohort)} on ${formatCount(funnel.created)} new events`}
          />
          <StatTile
            label="Events that found a facilitator"
            title="Of the events that received at least one application, the share where an Event Manager chose a facilitator."
            value={formatShare(funnel.trainerSelected, funnel.withApplications)}
            note={`${formatCount(funnel.trainerSelected)} of ${formatCount(funnel.withApplications)}`}
          />
          <RankedBars title="Approval status" subtitle="New standard events" items={events.byApproval} />
        </div>
      </section>

      {money && (
        <section className="viz-section">
          <h2>Money</h2>
          <p className="viz-section-note">
            Revenue is the fee kept on facilitator payouts, withdrawal fees, chat unlocks and Awé subscriptions. Only successful payments
            count. Withdrawal fees are shown before Anchor&apos;s own transfer charge, which comes out of the same fee.
          </p>
          <div className="viz-cols-wide">
            <TimeSeriesChart
              title="Platform revenue"
              subtitle={formatNaira(money.revenue.current)}
              points={money.revenueSeries.points}
              series={REVENUE_SERIES}
              format="naira"
            />
            <RankedBars title="Revenue by source" items={money.revenueBySource} format="naira" showShare />
          </div>
          <div className="viz-kpis">
            <StatTile label="Funded by Event Managers" value={formatNaira(money.fundedVolume.current)} current={money.fundedVolume.current} previous={money.fundedVolume.previous} note={`${formatCount(money.fundedCount.current)} payments`} />
            <StatTile label="Paid to facilitators" value={formatNaira(money.payouts.net.current)} current={money.payouts.net.current} previous={money.payouts.net.previous} note={`${formatCount(money.payouts.count.current)} payouts`} />
            <StatTile label="Fees kept on payouts" value={formatNaira(money.payouts.fees.current)} current={money.payouts.fees.current} previous={money.payouts.fees.previous} />
            <StatTile label="Withdrawn to banks" value={formatNaira(money.withdrawals.volume.current)} current={money.withdrawals.volume.current} previous={money.withdrawals.volume.previous} note={`${formatCount(money.withdrawals.count.current)} withdrawals`} />
            <StatTile label="Withdrawal fees collected" value={formatNaira(money.withdrawals.fees.current)} current={money.withdrawals.fees.current} previous={money.withdrawals.fees.previous} />
            {money.withdrawals.feesNeedingAttention.count > 0 && (
              <StatTile
                label="Withdrawal fees to review"
                title="Withdrawals that reached the user's bank but whose fee could not be taken from their wallet (or got stuck part-way). They are not retried automatically, so a person has to check them."
                value={formatNaira(money.withdrawals.feesNeedingAttention.amount)}
                note={`${formatCount(money.withdrawals.feesNeedingAttention.count)} withdrawals, not collected`}
              />
            )}
            <StatTile label="Refunded" value={formatNaira(money.refunded.current)} current={money.refunded.current} previous={money.refunded.previous} upIsGood={false} />
          </div>
        </section>
      )}

      <section className="viz-section">
        <h2>Engagement</h2>
        <div className="viz-kpis">
          <StatTile label="Chats started" value={formatCount(engagement.conversationsStarted.current)} current={engagement.conversationsStarted.current} previous={engagement.conversationsStarted.previous} />
          <StatTile label="Chat messages" value={formatCount(engagement.messagesSent.current)} current={engagement.messagesSent.current} previous={engagement.messagesSent.previous} />
          <StatTile label="Awé conversations" value={formatCount(engagement.aweConversations.current)} current={engagement.aweConversations.current} previous={engagement.aweConversations.previous} note={`${formatCount(engagement.aweMessages.current)} messages sent`} />
          <StatTile
            label="New Awé subscribers"
            value={formatCount(engagement.aweNewSubscriptions.current)}
            current={engagement.aweNewSubscriptions.current}
            previous={engagement.aweNewSubscriptions.previous}
            note={`${formatCount(engagement.aweActiveSubscriptions)} active · ${formatCount(engagement.awePastDue)} past due now`}
          />
          <StatTile
            label="Reviews left"
            value={formatCount(engagement.reviews.current)}
            current={engagement.reviews.current}
            previous={engagement.reviews.previous}
            note={engagement.averageRating.current !== null ? `${engagement.averageRating.current.toFixed(1)} ★ average` : undefined}
          />
          <StatTile
            label="Disputes opened"
            value={formatCount(engagement.disputesOpened.current)}
            current={engagement.disputesOpened.current}
            previous={engagement.disputesOpened.previous}
            upIsGood={false}
            note={`${formatCount(engagement.disputesOpenNow)} open now`}
          />
        </div>
      </section>

      {isSuperAdmin && (
        <section className="viz-section">
          <h2>Download the data</h2>
          <p className="viz-section-note">
            CSV files for {range.label.toLowerCase()}, for your own spreadsheets and reports. Passwords, BVN, phone numbers and bank or wallet details are never included.
          </p>
          <div className="viz-exports">
            {EXPORT_DATASETS.map((dataset) => (
              <div key={dataset} className="viz-export">
                <strong>{EXPORT_LABELS[dataset].title}</strong>
                <p>{EXPORT_LABELS[dataset].description}</p>
                <a href={`/admin/analytics/export?dataset=${dataset}&range=${range.key}`} download>
                  Download CSV
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="viz-footnote">
        <strong>What isn&apos;t here:</strong> the platform doesn&apos;t record sign-ins, page views or visits, so &ldquo;active&rdquo; means someone
        acted (applied, posted, paid, chatted, reviewed or used Awé), not just that they looked around. Figures that describe a group of
        people or events (sign-up progress, the event pipeline) count everyone created in the period and show where they stand now.
      </p>
    </div>
  );
}
