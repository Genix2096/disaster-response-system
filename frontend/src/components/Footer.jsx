import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="logo-icon">🚨</span>
              <span className="footer-title">Disaster Response System</span>
            </div>
            <p className="footer-desc">
              A cloud-native incident reporting and triage coordination platform built with 
              React, Node.js, and AWS for emergency response management.
            </p>
          </div>

          <div className="footer-nav-col">
            <h4 className="footer-heading">Platform</h4>
            <ul className="footer-nav-list">
              <li><Link to="/">Report Incident</Link></li>
              <li><Link to="/user/dashboard">Citizen Dashboard</Link></li>
              <li><Link to="/admin/login">Admin Portal</Link></li>
            </ul>
          </div>

          <div className="footer-nav-col">
            <h4 className="footer-heading">Legal &amp; Policy</h4>
            <ul className="footer-nav-list">
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms &amp; Conditions</Link></li>
              <li>
                <a 
                  href="https://github.com/Genix2096/disaster-response-system" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  GitHub Source ↗
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-advisory">
          <span className="advisory-icon">⚠️</span>
          <span>
            <strong>Emergency Advisory:</strong> This web system is an educational and demonstration project 
            and does <strong>not</strong> replace official emergency telephone helplines (911 / 112 / 100). 
            If you or someone else is in immediate life-threatening danger, call emergency services directly.
          </span>
        </div>

        <div className="footer-bottom">
          <p>© 2026 Cloud-Based Disaster Reporting and Alert Management System. Built by Muralidharan Ramprabhu.</p>
          <div className="footer-legal-links">
            <Link to="/privacy">Privacy Policy</Link>
            <span className="footer-separator">•</span>
            <Link to="/terms">Terms &amp; Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
