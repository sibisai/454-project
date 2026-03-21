import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../../services/api';
import Skeleton from '../../components/Skeleton';

const DAYS_OPTIONS = [7, 14, 30, 60, 90];

const CHART_SERIES = [
  { key: 'users_per_day', label: 'New Users', color: '#06B6D4', gradId: 'gradCyan' },
  { key: 'posts_per_day', label: 'Comments', color: '#10B981', gradId: 'gradEmerald' },
  { key: 'tracks_per_day', label: 'Tracks', color: '#F59E0B', gradId: 'gradAmber' },
  { key: 'mod_actions_per_day', label: 'Mod Actions', color: '#F43F5E', gradId: 'gradRose' },
];

function formatChartDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="admin-chart-tooltip">
      <div className="admin-chart-tooltip-label">{formatChartDate(label)}</div>
      <div className="admin-chart-tooltip-value">{payload[0].value}</div>
    </div>
  );
};

export default function AnalyticsTab() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    api.get('/admin/analytics', { params: { days } })
      .then(({ data }) => { if (!cancelled) setData(data); })
      .catch(() => { if (!cancelled) setError('Failed to load analytics.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [days]);

  return (
    <div>
      <div className="admin-tabs-inline" role="tablist" aria-label="Time range">
        {DAYS_OPTIONS.map((d) => (
          <button
            key={d}
            role="tab"
            aria-selected={days === d}
            className={`sort-tab${days === d ? ' active' : ''}`}
            onClick={() => setDays(d)}
          >
            {d} days
          </button>
        ))}
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {loading ? (
        <div className="admin-charts-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="admin-chart-card">
              <Skeleton width="40%" height={16} />
              <Skeleton variant="rect" width="100%" height={250} className="disc-skeleton-row" />
            </div>
          ))}
        </div>
      ) : !data ? (
        <div className="admin-empty">No data available.</div>
      ) : (
        <div className="admin-charts-grid">
          {CHART_SERIES.map(({ key, label, color, gradId }) => (
            <div key={key} className="admin-chart-card">
              <h4 className="admin-chart-title">{label}</h4>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data[key]} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    stroke="#94A3B8"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={12}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#${gradId})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
