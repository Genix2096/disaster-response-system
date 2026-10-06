import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getIncidents, deleteIncident, updateIncidentStatus } from '../services/api';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminDashboard() {
  const { isAuthenticated } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  useEffect(() => {
    fetchIncidents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [incidents, searchQuery, filterType, filterPriority, filterStatus]);

  async function fetchIncidents() {
    setLoading(true);
    setError('');
    try {
      const result = await getIncidents();
      setIncidents(result.data || []);
    } catch (err) {
      setError('Failed to load incidents. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let result = [...incidents];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.incidentId?.toLowerCase().includes(q) ||
          i.location?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q)
      );
    }

    if (filterType) {
      result = result.filter((i) => i.type === filterType);
    }
    if (filterPriority) {
      result = result.filter((i) => i.priority === filterPriority);
    }
    if (filterStatus) {
      result = result.filter((i) => i.status === filterStatus);
    }

    setFiltered(result);
  }

  async function handleDelete(id) {
    if (!window.confirm(`Are you sure you want to delete incident ${id}?`)) return;

    try {
      await deleteIncident(id);
      setIncidents(incidents.filter((i) => i.incidentId !== id));
      setSuccessMsg(`Incident ${id} deleted successfully.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Failed to delete incident.');
    }
  }

  async function handleStatusChange(id, newStatus) {
    try {
      await updateIncidentStatus(id, newStatus);
      setIncidents(
        incidents.map((i) =>
          i.incidentId === id ? { ...i, status: newStatus, updatedAt: new Date().toISOString() } : i
        )
      );
      setSuccessMsg(`Incident ${id} status updated to ${newStatus}.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Failed to update status.');
    }
  }

  // Stats
  const stats = {
    total: incidents.length,
    pending: incidents.filter((i) => i.status === 'PENDING').length,
    inProgress: incidents.filter((i) => i.status === 'IN_PROGRESS').length,
    resolved: incidents.filter((i) => i.status === 'RESOLVED').length,
    high: incidents.filter((i) => i.priority === 'HIGH').length,
  };

  return (
    <div className="page-container">
      <h1 className="page-title">📊 Admin Dashboard</h1>
      <p className="page-subtitle">Manage and monitor all incident reports</p>

      {error && (
        <div className="alert alert-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success">
          <span>✅</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Incidents</div>
        </div>
        <div className="stat-card stat-pending">
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card stat-progress">
          <div className="stat-value">{stats.inProgress}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card stat-resolved">
          <div className="stat-value">{stats.resolved}</div>
          <div className="stat-label">Resolved</div>
        </div>
        <div className="stat-card stat-high">
          <div className="stat-value">{stats.high}</div>
          <div className="stat-label">High Priority</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="form-group" style={{ flex: 2 }}>
          <label className="form-label">Search</label>
          <input
            type="text"
            className="form-input"
            placeholder="Search by ID, location, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="Fire">Fire</option>
            <option value="Flood">Flood</option>
            <option value="Accident">Accident</option>
            <option value="Road Damage">Road Damage</option>
            <option value="Building Damage">Building Damage</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select className="form-select" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">&nbsp;</label>
          <button className="btn btn-outline btn-sm" onClick={fetchIncidents}>🔄 Refresh</button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {incidents.length === 0 ? 'No incidents reported yet.' : 'No incidents match your filters.'}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Incident ID</th>
                <th>Type</th>
                <th>Location</th>
                <th>Priority</th>
                <th>Status</th>
                <th>User ID</th>
                <th>Departments</th>
                <th>Evidence Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((incident) => (
                <tr key={incident.incidentId}>
                  <td>
                    <Link to={`/admin/incidents/${incident.incidentId}`} className="incident-id" style={{ textDecoration: 'none' }}>
                      {incident.incidentId}
                    </Link>
                  </td>
                  <td>{incident.type}</td>
                  <td>{incident.location?.length > 30 ? incident.location.substring(0, 30) + '...' : incident.location}</td>
                  <td><PriorityBadge priority={incident.priority} /></td>
                  <td><StatusBadge status={incident.status} /></td>
                  <td style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>{incident.userId || <span className="text-muted">Legacy</span>}</td>
                  <td style={{ fontSize: '0.8rem' }}>{incident.departments?.join(', ') || <span className="text-muted">—</span>}</td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {incident.evidenceStrength || (incident.imageKey ? 'Photo uploaded — no geolocation metadata' : 'No photo evidence')}
                  </td>
                  <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {new Date(incident.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <Link to={`/admin/incidents/${incident.incidentId}`} className="btn btn-outline btn-sm">
                        View
                      </Link>
                      <select
                        className="form-select"
                        value={incident.status}
                        onChange={(e) => handleStatusChange(incident.incidentId, e.target.value)}
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', minWidth: '110px' }}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(incident.incidentId)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
