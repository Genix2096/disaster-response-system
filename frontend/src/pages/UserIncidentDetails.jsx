import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMyIncidentById } from '../services/api';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * Read-only incident details for the owning user.
 * Ownership is enforced by the backend (GET /api/users/me/incidents/:id).
 */
export default function UserIncidentDetails() {
  const { id } = useParams();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getMyIncidentById(id)
      .then((res) => { if (!cancelled) setIncident(res.data); })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load incident.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="page-container"><LoadingSpinner /></div>;

  return (
    <div className="page-container">
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <Link to="/user/dashboard" className="back-link">← Back to My Dashboard</Link>
        <h1 className="page-title" style={{ marginTop: '0.5rem' }}>Incident Details</h1>

        {error && <div className="alert alert-error"><span>⚠️</span><span>{error}</span></div>}

        {incident && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h2 style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                {incident.incidentId}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <PriorityBadge priority={incident.priority} />
                <StatusBadge status={incident.status} />
              </div>
            </div>

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
                <div className="detail-label">Last Updated</div>
                <div className="detail-value">{new Date(incident.updatedAt).toLocaleString()}</div>
              </div>
            </div>

            <div className="detail-item" style={{ marginTop: '1rem' }}>
              <div className="detail-label">Description</div>
              <div className="detail-value" style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
                {incident.description}
              </div>
            </div>

            {incident.aiSummary && (
              <div className="detail-item" style={{ marginTop: '1rem' }}>
                <div className="detail-label">🤖 AI Summary</div>
                <div className="detail-value" style={{ background: '#f0f7ff', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid #3498db' }}>
                  {incident.aiSummary}
                </div>
              </div>
            )}

            {incident.imageUrl && (
              <div className="detail-item" style={{ marginTop: '1rem' }}>
                <div className="detail-label">📷 Incident Image</div>
                <img src={incident.imageUrl} alt="Incident" className="image-preview" style={{ maxHeight: '400px' }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
