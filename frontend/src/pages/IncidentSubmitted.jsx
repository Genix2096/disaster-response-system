import { Link, useLocation, Navigate } from 'react-router-dom';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';

export default function IncidentSubmitted() {
  const location = useLocation();
  const incident = location.state?.incident;

  if (!incident) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="page-container">
      <div className="success-container">
        <div className="card">
          <div className="success-icon">✅</div>
          <h1 className="page-title" style={{ textAlign: 'center' }}>Incident Reported Successfully</h1>
          <p className="page-subtitle" style={{ textAlign: 'center' }}>
            Your incident has been submitted and will be reviewed by an administrator.
          </p>

          <div className="success-details">
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">Incident ID</div>
                <div className="detail-value" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  {incident.incidentId}
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-label">Type</div>
                <div className="detail-value">{incident.type}</div>
              </div>

              <div className="detail-item">
                <div className="detail-label">Location</div>
                <div className="detail-value">{incident.location}</div>
              </div>

              <div className="detail-item">
                <div className="detail-label">Priority</div>
                <div className="detail-value">
                  <PriorityBadge priority={incident.priority} />
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-label">Status</div>
                <div className="detail-value">
                  <StatusBadge status={incident.status} />
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-label">Reported At</div>
                <div className="detail-value">
                  {new Date(incident.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            {incident.aiSummary && (
              <div className="detail-item" style={{ marginTop: '1rem' }}>
                <div className="detail-label">AI Summary</div>
                <div className="detail-value" style={{ background: '#f0f7ff', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid #3498db' }}>
                  {incident.aiSummary}
                </div>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link to="/" className="btn btn-primary">
              📋 Report Another Incident
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
