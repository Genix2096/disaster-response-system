import { useState, useEffect } from 'react';
import { getUsers, suspendUser, reactivateUser } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError('');
    try {
      const result = await getUsers();
      setUsers(result.data || []);
    } catch (err) {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSuspend(id) {
    if (!window.confirm(`Are you sure you want to suspend user ${id}?`)) return;
    try {
      await suspendUser(id);
      setSuccessMsg(`User ${id} suspended.`);
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Failed to suspend user.');
    }
  }

  async function handleReactivate(id) {
    if (!window.confirm(`Are you sure you want to reactivate user ${id}?`)) return;
    try {
      await reactivateUser(id);
      setSuccessMsg(`User ${id} reactivated.`);
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Failed to reactivate user.');
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {error && <div className="alert alert-error"><span>⚠️</span><span>{error}</span></div>}
      {successMsg && <div className="alert alert-success"><span>✅</span><span>{successMsg}</span></div>}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Risk Score</th>
              <th>Risk Level</th>
              <th>Fake Reports</th>
              <th>Account Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan="7" style={{textAlign: 'center'}}>No users found.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.userId}>
                  <td>{u.username || <span className="text-muted">N/A</span>}</td>
                  <td>{u.email || <span className="text-muted">N/A</span>}</td>
                  <td>{u.riskScore}</td>
                  <td style={{
                    color: u.riskLevel === 'SUSPENDED' ? 'var(--color-danger)' :
                           u.riskLevel === 'HIGH_RISK' ? 'var(--color-warning)' : 'inherit'
                  }}>
                    {u.riskLevel}
                  </td>
                  <td>{u.fakeIncidentCount}</td>
                  <td>
                    <span className={`badge ${u.accountStatus === 'ACTIVE' ? 'badge-active' : 'badge-suspended'}`}>
                      {u.accountStatus}
                    </span>
                  </td>
                  <td>
                    {u.accountStatus === 'ACTIVE' ? (
                      <button className="btn btn-danger btn-sm" onClick={() => handleSuspend(u.userId)}>Suspend</button>
                    ) : (
                      <button className="btn btn-primary btn-sm" onClick={() => handleReactivate(u.userId)}>Reactivate</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
