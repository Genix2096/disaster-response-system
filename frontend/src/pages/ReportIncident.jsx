import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitIncident } from '../services/api';
import { useUserAuth } from '../context/UserAuthContext';

const INCIDENT_TYPES = [
  'Fire',
  'Flood',
  'Accident',
  'Road Damage',
  'Building Damage',
  'Other',
];

export default function ReportIncident() {
  const navigate = useNavigate();
  const { user, logout } = useUserAuth();
  const [form, setForm] = useState({
    type: '',
    location: '',
    description: '',
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      // Validate type client-side
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type)) {
        setError('Invalid file type. Only JPEG, PNG, and WEBP images are allowed.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File too large. Maximum size is 5 MB.');
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
    }
  }

  function removeImage() {
    setImage(null);
    setImagePreview(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!form.type) {
      setError('Please select an incident type.');
      return;
    }
    if (!form.location.trim()) {
      setError('Location is required.');
      return;
    }
    if (!form.description.trim()) {
      setError('Description is required.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('type', form.type);
      formData.append('location', form.location.trim());
      formData.append('description', form.description.trim());
      if (image) {
        formData.append('image', image);
      }

      const result = await submitIncident(formData);
      navigate('/incident-submitted', { state: { incident: result.data } });
    } catch (err) {
      if (err.response?.status === 401) {
        // Session expired or invalid — sign in again.
        logout();
        navigate('/user/login', { state: { from: '/', notice: 'Your session expired. Please sign in again.' } });
        return;
      }
      const msg = err.response?.data?.message || 'Failed to submit incident. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <h1 className="page-title">📋 Report an Incident</h1>
        <p className="page-subtitle">
          Help your community by reporting disasters and emergencies. Your report will be reviewed by administrators.
        </p>
        {user?.username && (
          <p className="reporting-as">Reporting as <strong>{user.username}</strong></p>
        )}

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card">
          {/* Incident Type */}
          <div className="form-group">
            <label className="form-label" htmlFor="type">Incident Type *</label>
            <select
              id="type"
              name="type"
              className="form-select"
              value={form.type}
              onChange={handleChange}
              required
            >
              <option value="">-- Select Type --</option>
              {INCIDENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div className="form-group">
            <label className="form-label" htmlFor="location">Location *</label>
            <input
              id="location"
              name="location"
              type="text"
              className="form-input"
              placeholder="e.g., Near Main Bus Stand, Vellore"
              value={form.location}
              onChange={handleChange}
              maxLength={500}
              required
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              className="form-textarea"
              placeholder="Describe the incident in detail..."
              value={form.description}
              onChange={handleChange}
              maxLength={5000}
              required
            />
          </div>

          {/* Image Upload */}
          <div className="form-group">
            <label className="form-label">Image (Optional)</label>
            {!imagePreview ? (
              <label className="image-upload-area" htmlFor="image-input">
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
                <div>Click to upload an image</div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>JPEG, PNG, WEBP — Max 5 MB</div>
                <input
                  id="image-input"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </label>
            ) : (
              <div>
                <img src={imagePreview} alt="Preview" className="image-preview" />
                <button type="button" className="btn btn-outline btn-sm" onClick={removeImage} style={{ marginTop: '0.5rem' }}>
                  ✕ Remove Image
                </button>
              </div>
            )}
          </div>

          {/* Submit */}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? (
              <>
                <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></span>
                Submitting...
              </>
            ) : (
              '🚀 Submit Incident'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
