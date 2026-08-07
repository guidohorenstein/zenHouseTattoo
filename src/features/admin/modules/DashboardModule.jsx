import { MetricCard } from "../components/MetricCard";
import { formatValue } from "../utils/adminFormat";

export function DashboardModule({ activeFilter, metrics, onDrillDown, onDrillUp }) {
  return (
    <section className="admin-module-stack">
      {activeFilter ? (
        <div className="admin-filter-banner">
          <span>Filtered by {activeFilter.label}: {formatValue(activeFilter.value)}</span>
          <button type="button" onClick={onDrillUp}>Clear filter</button>
        </div>
      ) : null}

      <section className="admin-grid admin-grid--metrics">
        <MetricCard label="Total" value={metrics?.total ?? 0} hint="All requests" onClick={onDrillUp} />
        <MetricCard
          label="Requested"
          value={metrics?.requested ?? 0}
          hint="New leads waiting for review"
          active={activeFilter?.type === "status" && activeFilter.value === "requested"}
          onClick={() => onDrillDown({ type: "status", value: "requested", label: "status" })}
        />
        <MetricCard
          label="Quoted"
          value={metrics?.quoted ?? 0}
          hint="Budget already sent"
          active={activeFilter?.type === "status" && activeFilter.value === "quoted"}
          onClick={() => onDrillDown({ type: "status", value: "quoted", label: "status" })}
        />
        <MetricCard
          label="Booked"
          value={metrics?.booked ?? 0}
          hint="Appointment booked"
          active={activeFilter?.type === "status" && activeFilter.value === "booked"}
          onClick={() => onDrillDown({ type: "status", value: "booked", label: "status" })}
        />
        <MetricCard label="Conversion" value={`${metrics?.conversionRate ?? 0}%`} hint="Completed over total" />
        <MetricCard
          label="Top style"
          value={formatValue(metrics?.topStyle)}
          hint="Click to filter requests"
          active={activeFilter?.type === "style" && activeFilter.value === metrics?.topStyle}
          onClick={() => metrics?.topStyle && metrics.topStyle !== "-" ? onDrillDown({ type: "style", value: metrics.topStyle, label: "style" }) : null}
        />
        <MetricCard
          label="Top area"
          value={formatValue(metrics?.topZone)}
          hint="Click to filter requests"
          active={activeFilter?.type === "generalZone" && activeFilter.value === metrics?.topZone}
          onClick={() => metrics?.topZone && metrics.topZone !== "-" ? onDrillDown({ type: "generalZone", value: metrics.topZone, label: "area" }) : null}
        />
        <MetricCard
          label="Top timing"
          value={formatValue(metrics?.topTiming)}
          hint="Click to filter requests"
          active={activeFilter?.type === "timing" && activeFilter.value === metrics?.topTiming}
          onClick={() => metrics?.topTiming && metrics.topTiming !== "-" ? onDrillDown({ type: "timing", value: metrics.topTiming, label: "timing" }) : null}
        />
      </section>
    </section>
  );
}
