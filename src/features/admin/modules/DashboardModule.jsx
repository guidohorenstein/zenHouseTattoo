import { MetricCard } from "../components/MetricCard";
import { formatValue, statusLabels } from "../utils/adminFormat";

export function DashboardModule({ activeFilter, metrics, onDrillDown, onDrillUp }) {
  const statusTotal = sumCounts(metrics?.statusBreakdown);
  const maxDailyCount = Math.max(...(metrics?.dailyTrend || []).map((item) => item.count), 1);

  return (
    <section className="admin-module-stack admin-dashboard">
      {activeFilter ? (
        <div className="admin-filter-banner">
          <span>Filtered by {activeFilter.label}: {formatValue(activeFilter.value)}</span>
          <button type="button" onClick={onDrillUp}>Clear filter</button>
        </div>
      ) : null}

      <section className="admin-dashboard-hero">
        <div>
          <p className="admin-kicker">Business pulse</p>
          <h3>{metrics?.recentCount ?? 0} new requests in the last 7 days</h3>
          <p>
            Active pipeline: {metrics?.activePipeline ?? 0} requests. Average weekly demand:
            {" "}{metrics?.averageWeeklyDemand ?? 0}.
          </p>
        </div>
        <div className="admin-dashboard-score">
          <span>Booking rate</span>
          <strong>{metrics?.bookingRate ?? 0}%</strong>
          <small>Booked or completed over active leads</small>
        </div>
      </section>

      <section className="admin-grid admin-grid--metrics">
        <MetricCard label="Active leads" value={metrics?.activePipeline ?? 0} hint="Requested, no response, quoted and booked" onClick={onDrillUp} />
        <MetricCard
          label="Needs reply"
          value={metrics?.requested ?? 0}
          hint="New leads waiting for first action"
          active={activeFilter?.type === "status" && activeFilter.value === "requested"}
          onClick={() => onDrillDown({ type: "status", value: "requested", label: "status" })}
        />
        <MetricCard
          label="No response"
          value={metrics?.noResponse ?? 0}
          hint={`${metrics?.responseRisk ?? 0}% of current leads`}
          active={activeFilter?.type === "status" && activeFilter.value === "no_response"}
          onClick={() => onDrillDown({ type: "status", value: "no_response", label: "status" })}
        />
        <MetricCard
          label="Quoted"
          value={metrics?.quoted ?? 0}
          hint={`${metrics?.quoteRate ?? 0}% received a quote`}
          active={activeFilter?.type === "status" && activeFilter.value === "quoted"}
          onClick={() => onDrillDown({ type: "status", value: "quoted", label: "status" })}
        />
        <MetricCard
          label="Booked"
          value={metrics?.booked ?? 0}
          hint="Appointments already booked"
          active={activeFilter?.type === "status" && activeFilter.value === "booked"}
          onClick={() => onDrillDown({ type: "status", value: "booked", label: "status" })}
        />
        <MetricCard label="Completed" value={metrics?.completed ?? 0} hint={`${metrics?.conversionRate ?? 0}% completed`} />
      </section>

      <section className="admin-dashboard-grid">
        <DashboardPanel title="Demand trend" subtitle="New requests by day">
          <div className="admin-trend-chart">
            {(metrics?.dailyTrend || []).map((day) => (
              <div className="admin-trend-day" key={day.label}>
                <span
                  style={{
                    height: `${Math.max(8, (day.count / maxDailyCount) * 100)}%`,
                  }}
                  title={`${day.label}: ${day.count}`}
                />
                <small>{day.label}</small>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Lead funnel" subtitle="Where requests stand now">
          <div className="admin-funnel-list">
            {(metrics?.statusBreakdown || []).map((item) => (
              <button
                className={`admin-funnel-row admin-funnel-row--${item.value}`}
                key={item.value}
                type="button"
                onClick={() => onDrillDown({ type: "status", value: item.value, label: "status" })}
              >
                <span>{statusLabels[item.value]}</span>
                <strong>{item.count}</strong>
                <em>
                  <i style={{ width: `${statusTotal ? (item.count / statusTotal) * 100 : 0}%` }} />
                </em>
              </button>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Most requested styles" subtitle="Useful for portfolio and ads">
          <RankedList
            items={metrics?.topStyles}
            label="style"
            onSelect={(value) => onDrillDown({ type: "style", value, label: "style" })}
          />
        </DashboardPanel>

        <DashboardPanel title="Body demand" subtitle="General and specific areas">
          <RankedList
            items={metrics?.topZones}
            label="area"
            onSelect={(value) => onDrillDown({ type: "generalZone", value, label: "area" })}
          />
          <div className="admin-panel-divider" />
          <RankedList items={metrics?.topSpecificZones} label="view" />
        </DashboardPanel>

        <DashboardPanel title="Consultation preferences" subtitle="When and how to contact">
          <MiniBreakdown title="Timing" items={metrics?.timingBreakdown} />
          <MiniBreakdown title="Contact time" items={metrics?.contactBreakdown} />
        </DashboardPanel>

        <DashboardPanel title="Creative direction" subtitle="What clients tend to ask for">
          <MiniBreakdown title="Color" items={metrics?.colorBreakdown} />
          <MiniBreakdown title="Body reference" items={metrics?.bodyBreakdown} />
          <MiniBreakdown title="Has tattoos" items={metrics?.tattooHistoryBreakdown} />
        </DashboardPanel>
      </section>
    </section>
  );
}

function DashboardPanel({ children, subtitle, title }) {
  return (
    <article className="admin-dashboard-panel">
      <div className="admin-dashboard-panel-heading">
        <h4>{title}</h4>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {children}
    </article>
  );
}

function RankedList({ items = [], label, onSelect }) {
  const maxCount = Math.max(...items.map((item) => item.count), 1);

  if (items.length === 0) {
    return <p className="admin-muted-light">No data yet.</p>;
  }

  return (
    <div className="admin-ranked-list">
      {items.map((item, index) => {
        const Component = onSelect ? "button" : "div";

        return (
          <Component
            className="admin-ranked-row"
            key={item.value}
            type={onSelect ? "button" : undefined}
            onClick={onSelect ? () => onSelect(item.value) : undefined}
          >
            <span>{index + 1}</span>
            <strong>{formatValue(item.value)}</strong>
            <small>{item.count} {label}{item.count === 1 ? "" : "s"}</small>
            <em><i style={{ width: `${(item.count / maxCount) * 100}%` }} /></em>
          </Component>
        );
      })}
    </div>
  );
}

function MiniBreakdown({ items = [], title }) {
  const total = sumCounts(items);

  return (
    <div className="admin-mini-breakdown">
      <h5>{title}</h5>
      {items.length === 0 ? <p className="admin-muted-light">No data yet.</p> : null}
      {items.map((item) => (
        <div className="admin-mini-row" key={item.value}>
          <span>{formatValue(item.value)}</span>
          <strong>{item.count}</strong>
          <em><i style={{ width: `${total ? (item.count / total) * 100 : 0}%` }} /></em>
        </div>
      ))}
    </div>
  );
}

function sumCounts(items = []) {
  return items.reduce((total, item) => total + item.count, 0);
}
