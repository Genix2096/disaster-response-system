import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';
import { getMyProfile, getMyIncidents } from '../services/api';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * Normal-user dashboard. Separate from the Admin Dashboard.
 * Profile and incidents are fetched from user-scoped endpoints; the backend
 * decides ownership from the verified Cognito token (no client-side filtering).
 */
export default function UserDashboard() {
  const { user, logout } = useUserAuth();
  const [profile, setProfile] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileRes, incidentsRes] = await Promise.all([getMyProfile(), getMyIncidents()]);
      setProfile(profileRes.data);
      setIncidents(incidentsRes.data || []);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        return;
      }
      setError('Failed to load your dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isActive = profile?.accountStatus === 'ACTIVE';
  const displayName = profile?.username || user?.username || 'User';

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">👋 Welcome, {displayName}</h1>
          <p className="page-subtitle">Your profile and the incidents you have reported</p>
        </div>
        <div className="dashboard-actions">
          <button id="user-dashboard-refresh" className="btn btn-outline btn-sm" onClick={fetchData}>🔄 Refresh</button>
          {isActive && (
            <Link id="user-dashboard-report" to="/" className="btn btn-primary btn-sm">➕ Report Incident</Link>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error"><span>⚠️</span><span>{error}</span></div>}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Profile */}
          {profile && (
            <section className="card profile-card" aria-labelledby="profile-heading">
              <div className="profile-avatar">{displayName.charAt(0).toUpperCase()}</div>
              <div className="profile-main">
                <h2 id="profile-heading" className="profile-name">{profile.username}</h2>
                <div className="profile-email">{profile.email}</div>
                <span className={`badge ${isActive ? 'badge-active' : 'badge-suspended'}`}>
                  {profile.accountStatus}
                </span>
              </div>
              <div className="profile-stats">
                <div className="profile-stat">
                  <div className="profile-stat-value">{profile.riskScore ?? 0}</div>
                  <div className="profile-stat-label">Risk Score</div>
                </div>
                <div className="profile-stat">
                  <div className="profile-stat-value">{profile.fakeIncidentCount ?? 0}</div>
                  <div className="profile-stat-label">Fake Reports</div>
                </div>
                <div className="profile-stat">
                  <div className="profile-stat-value">{incidents.length}</div>
                  <div className="profile-stat-label">My Incidents</div>
                </div>
              </div>
            </section>
          )}

          {profile && !isActive && (
            <div className="alert alert-error">
              <span>⛔</span>
              <span>Your account is not active. You cannot submit new incidents.</span>
            </div>
          )}

          {/* Incidents */}
          <h2 className="section-title">📁 My Incidents</h2>
          {incidents.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-icon">📭</div>
              <p>You haven&apos;t reported any incidents yet.</p>
              {isActive && <Link to="/" className="btn btn-primary btn-sm">Report your first incident</Link>}
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table" id="my-incidents-table">
                <thead>
                  <tr>
                    <th>Incident ID</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Evidence Status</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((incident) => (
                    <tr key={incident.incidentId}>
                      <td>
                        <Link to={`/user/incidents/${incident.incidentId}`} className="incident-id" style={{ textDecoration: 'none' }}>
                          {incident.incidentId}
                        </Link>
                      </td>
                      <td>{incident.type}</td>
                      <td>{incident.location?.length > 30 ? incident.location.substring(0, 30) + '...' : incident.location}</td>
                      <td><PriorityBadge priority={incident.priority} /></td>
                      <td><StatusBadge status={incident.status} /></td>
                      <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(incident.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {incident.evidenceStrength || (incident.imageKey ? 'Photo uploaded — no geolocation metadata' : 'No photo evidence')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
