import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ReportIncident from './pages/ReportIncident';
import IncidentSubmitted from './pages/IncidentSubmitted';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import IncidentDetails from './pages/IncidentDetails';

export default function App() {
  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="/" element={<ReportIncident />} />
        <Route path="/incident-submitted" element={<IncidentSubmitted />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/incidents/:id" element={<IncidentDetails />} />
      </Routes>
    </div>
  );
}
