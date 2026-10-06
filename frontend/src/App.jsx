import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedUserRoute from './components/ProtectedUserRoute';
import ReportIncident from './pages/ReportIncident';
import IncidentSubmitted from './pages/IncidentSubmitted';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import IncidentDetails from './pages/IncidentDetails';
import UserLogin from './pages/UserLogin';
import UserRegister from './pages/UserRegister';
import UserDashboard from './pages/UserDashboard';
import UserIncidentDetails from './pages/UserIncidentDetails';

export default function App() {
  return (
    <div>
      <Navbar />
      <Routes>
        {/* Normal user (Cognito) — reporting requires login */}
        <Route path="/" element={<ProtectedUserRoute><ReportIncident /></ProtectedUserRoute>} />
        <Route path="/incident-submitted" element={<ProtectedUserRoute><IncidentSubmitted /></ProtectedUserRoute>} />
        <Route path="/user/login" element={<UserLogin />} />
        <Route path="/user/register" element={<UserRegister />} />
        <Route path="/user/dashboard" element={<ProtectedUserRoute><UserDashboard /></ProtectedUserRoute>} />
        <Route path="/user/incidents/:id" element={<ProtectedUserRoute><UserIncidentDetails /></ProtectedUserRoute>} />

        {/* Admin (existing JWT auth — unchanged) */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/incidents/:id" element={<IncidentDetails />} />
      </Routes>
    </div>
  );
}
