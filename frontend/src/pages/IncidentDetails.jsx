import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getIncidentById, updateIncidentStatus, deleteIncident } from '../services/api';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

export default function IncidentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  useEffect(() => {
    fetchIncident();
  }, [id]);

  async function fetchIncident() {
    setLoading(true);
    setError('');
    try {
      const result = await getIncidentById(id);
      setIncident(result.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load incident.');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate(newStatus) {
    setStatusLoading(true);
    try {
      const result = await updateIncidentStatus(id, newStatus);
      setIncident({ ...incident, status: newStatus, updatedAt: result.data?.updatedAt || new Date().toISOString() });
      setSuccessMsg(`Status updated to ${newStatus}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Failed to update status.');
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete incident ${id}?`)) return;
    try {
      await deleteIncident(id);
      navigate('/admin/dashboard');
    } catch (err) {
      setError('Failed to delete incident.');
    }
  }

  if (loading) return <div className="page-container"><LoadingSpinner /></div>;

  if (error && !incident) {
    return (
      <div className="page-container">
        <div className="alert alert-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
        <Link to="/admin/dashboard" className="btn btn-outline">← Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <Link to="/admin/dashboard" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}>
              ← Back to Dashboard
            </Link>
            <h1 className="page-title" style={{ marginTop: '0.5rem' }}>Incident Details</h1>
          </div>
          <button className="btn btn-danger" onClick={handleDelete}>🗑️ Delete</button>
        </div>

        {error && <div className="alert alert-error"><span>⚠️</span><span>{error}</span></div>}
        {successMsg && <div className="alert alert-success"><span>✅</span><span>{successMsg}</span></div>}

        {incident && (
          <div className="card">
            {/* ID and Badges */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h2 style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                {incident.incidentId}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <PriorityBadge priority={incident.priority} />
                <StatusBadge status={incident.status} />
              </div>
            </div>

            {/* Details Grid */}
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">Incident Type</div>
                <div className="detail-value">{incident.type}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Location</div>
                <div className="detail-value">{incident.location}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Created At</div>
                <div className="detail-value">{new Date(incident.createdAt).toLocaleString()}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Updated At</div>
                <div className="detail-value">{new Date(incident.updatedAt).toLocaleString()}</div>
              </div>
            </div>

            {/* Description */}
            <div className="detail-item" style={{ marginTop: '1rem' }}>
              <div className="detail-label">Description</div>
              <div className="detail-value" style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
                {incident.description}
              </div>
            </div>

            {/* AI Summary */}
            {incident.aiSummary && (
              <div className="detail-item" style={{ marginTop: '1rem' }}>
                <div className="detail-label">🤖 AI Summary</div>
                <div className="detail-value" style={{ background: '#f0f7ff', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid #3498db' }}>
                  {incident.aiSummary}
                </div>
              </div>
            )}

            {/* Image */}
            {incident.imageUrl && (
              <div className="detail-item" style={{ marginTop: '1rem' }}>
                <div className="detail-label">📷 Incident Image</div>
                <img
                  src={incident.imageUrl}
                  alt="Incident"
                  className="image-preview"
                  style={{ maxHeight: '400px', marginTop: '0.5rem' }}
                />
              </div>
            )}

            {/* Status Update */}
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div className="detail-label" style={{ marginBottom: '0.5rem' }}>Update Status</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'].map((s) => (
                  <button
                    key={s}
                    className={`btn btn-sm ${incident.status === s ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleStatusUpdate(s)}
                    disabled={statusLoading || incident.status === s}
                  >
                    {s === 'IN_PROGRESS' ? 'In Progress' : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
