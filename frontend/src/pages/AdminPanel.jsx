import { useState } from 'react';
import {
  HiChartBarSquare,
  HiUsers,
  HiClipboardDocumentList,
  HiChartBar,
  HiMusicalNote,
} from 'react-icons/hi2';
import OverviewTab from './admin/OverviewTab';
import UsersTab from './admin/UsersTab';
import AuditLogTab from './admin/AuditLogTab';
import AnalyticsTab from './admin/AnalyticsTab';
import TopTracksTab from './admin/TopTracksTab';
import './AdminPanel.css';

const TABS = [
  { id: 'overview', label: 'Overview', icon: HiChartBarSquare, Component: OverviewTab },
  { id: 'users', label: 'Users', icon: HiUsers, Component: UsersTab },
  { id: 'audit', label: 'Audit Log', icon: HiClipboardDocumentList, Component: AuditLogTab },
  { id: 'analytics', label: 'Analytics', icon: HiChartBar, Component: AnalyticsTab },
  { id: 'tracks', label: 'Top Tracks', icon: HiMusicalNote, Component: TopTracksTab },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('overview');

  const active = TABS.find((t) => t.id === activeTab);
  const ActiveComponent = active.Component;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Panel</h1>
      </div>

      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            className={`sort-tab admin-tab${activeTab === id ? ' active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div className="admin-tab-content" role="tabpanel">
        <ActiveComponent />
      </div>
    </div>
  );
}
