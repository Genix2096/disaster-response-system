import { Link } from 'react-router-dom';

export default function TermsConditions() {
  return (
    <div className="page-container">
      <div className="legal-container">
        <div className="legal-header">
          <Link to="/" className="back-link">← Back to Home</Link>
          <div className="legal-badge">Platform Rules &amp; Governance</div>
          <h1 className="page-title">Terms &amp; Conditions</h1>
          <p className="page-subtitle">
            Last updated: October 2026 • Cloud-Based Disaster Reporting and Alert Management System
          </p>
        </div>

        <div className="card legal-card">
          <div className="legal-callout alert-error" style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
            <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>⚠️ <strong>EMERGENCY SERVICES ADVISORY</strong></div>
            <p style={{ margin: 0 }}>
              <strong>THIS SYSTEM DOES NOT REPLACE OFFICIAL EMERGENCY SERVICES (e.g., 911, 112, 100, 101).</strong> If you or 
              someone else is in immediate physical danger, medical crisis, or life-threatening peril, contact your local emergency 
              police, ambulance, or fire services immediately via standard telephone channels. Submitting a report on this web 
              application does <strong>NOT</strong> guarantee immediate review, physical dispatch, rescue operations, or emergency assistance.
            </p>
          </div>

          <section className="legal-section">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing, browsing, registering an account on, or submitting incident reports through the 
              <strong>Cloud-Based Disaster Reporting and Alert Management System</strong> (&ldquo;the System&rdquo; or &ldquo;the Service&rdquo;), 
              you acknowledge that you have read, understood, and agree to be bound by these Terms &amp; Conditions and our 
              <Link to="/privacy"> Privacy Policy</Link>.
            </p>
            <p>
              This application was engineered as an academic <strong>Cloud Computing college project</strong> demonstrating 
              cloud architecture, serverless integrations, deterministic severity triage, and reputation governance. If you 
              do not agree with any part of these terms, you must not register or submit reports through the System.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. User Accounts and Registration Responsibilities</h2>
            <p>
              To report disaster hazards, users must register an authentic account verified via <strong>Amazon Cognito</strong>:
            </p>
            <ul>
              <li><strong>Accurate Information:</strong> You agree to provide a valid, accessible email address during registration and keep your account details accurate.</li>
              <li><strong>Credential Security:</strong> You are responsible for safeguarding your login credentials. You are responsible for all incident reports and activities conducted under your authenticated username.</li>
              <li><strong>One Individual per Account:</strong> Accounts must not be shared, automated via unapproved scripts, or transferred to third parties.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Incident Reporting Guidelines and User Conduct</h2>
            <p>When reporting disasters, emergencies, or community hazards, you agree that:</p>
            <ul>
              <li><strong>Truthfulness:</strong> All submitted categories, locations, and descriptions must represent genuine observations to the best of your knowledge.</li>
              <li><strong>No Hoaxes or False Reports:</strong> You are strictly prohibited from submitting fake, fabricated, exaggerated, prank, or malicious incident reports.</li>
              <li><strong>Authentic Media:</strong> Uploaded photographs must genuinely depict the reported incident or location. Do not upload stock photos, misleading imagery from past events, copyrighted media without authorization, or obscene/unlawful material.</li>
              <li><strong>No System Abuse:</strong> You must not attempt to disrupt the backend API, overwhelm server resources, manipulate client-side priority parameters, or bypass authentication controls.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Fake Incident Detection, Risk Scoring, and Account Suspension</h2>
            <p>
              The System features an integrated administrative audit and reputation governance framework to safeguard dispatch 
              resources against false alarms:
            </p>
            <ul>
              <li>
                <strong>Administrative Auditing:</strong> Authorized emergency administrators review incoming reports on the Admin Dashboard. 
                If an administrator determines that a report is fictitious, misleading, or fraudulent, they may flag the report as fake 
                (<code>PATCH /api/admin/incidents/:id/fake</code>) with an audited justification.
              </li>
              <li>
                <strong>Reputation Penalty (+25 Points):</strong> When an incident is flagged as fake, the submitter&apos;s 
                <code>riskScore</code> in Amazon DynamoDB is automatically increased by <strong>+25 points</strong>, and their 
                <code>fakeIncidentCount</code> is incremented.
              </li>
              <li>
                <strong>Risk Levels:</strong> User profiles reflect dynamic risk classifications visible on the 
                <Link to="/user/dashboard"> User Dashboard</Link>:
                <ul>
                  <li><code>0 – 49</code>: <strong>NORMAL</strong> (Good standing)</li>
                  <li><code>50 – 74</code>: <strong>WARNING</strong> (Multiple suspicious submissions)</li>
                  <li><code>75 – 99</code>: <strong>HIGH_RISK</strong> (Critical risk threshold)</li>
                  <li><code>100+</code>: <strong>SUSPENDED</strong> (Account locked)</li>
                </ul>
              </li>
              <li>
                <strong>Automatic Account Suspension:</strong> If your cumulative <code>riskScore</code> reaches or exceeds <strong>100</strong>, 
                your account status is automatically set to <code>SUSPENDED</code>.
              </li>
              <li>
                <strong>Enforcement Effect:</strong> Suspended users are immediately prohibited by the backend 
                <code>requireActiveAccount</code> middleware from submitting subsequent incident reports (HTTP 403 Forbidden).
              </li>
              <li>
                <strong>Administrative Discretion:</strong> Administrators retain the authority to manually suspend or reactivate 
                user accounts based on review of incident integrity.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. Limitations of AI-Generated Incident Summaries</h2>
            <p>
              The System integrates with the <strong>Groq Cloud API</strong> (running <code>llama-3.1-8b-instant</code>) to generate 
              automated executive summaries of reported emergencies:
            </p>
            <ul>
              <li><strong>Supplementary Tool:</strong> AI-generated summaries are computational syntheses intended solely as rapid-reading aids for triage review.</li>
              <li><strong>No Guarantee of Factual Precision:</strong> Artificial intelligence summaries may occasionally omit details or produce generalizations. They must never be considered definitive legal or factual accounts without independent verification by human emergency dispatchers.</li>
              <li><strong>Resilience Fallback:</strong> If the AI service experiences downtime or API limits, the System falls back to truncated raw text summaries without disrupting incident storage.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. No Guarantee of Emergency Assistance or Service Availability</h2>
            <p>
              This application is provided on an <strong>&ldquo;AS IS&rdquo;</strong> and <strong>&ldquo;AS AVAILABLE&rdquo;</strong> basis:
            </p>
            <ul>
              <li><strong>No Response Guarantee:</strong> The operators of this system do not guarantee that any incident report will be viewed, triaged, responded to, or acted upon within any specific timeframe, or at all.</li>
              <li><strong>Technical Disruptions:</strong> We do not warrant that the application will operate uninterrupted, error-free, or without network latency, server downtime, or third-party cloud service disruptions (including AWS or Groq outages).</li>
              <li><strong>Device Limitations:</strong> Successful transmission of reports depends on active internet connectivity, browser capabilities, and device hardware (such as functional camera and GPS sensors).</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>7. Content License and Rights</h2>
            <p>
              By submitting an incident report, text description, or photograph, you grant the System operators, emergency administrators, 
              and relevant public safety authorities a non-exclusive, royalty-free, perpetual license to review, store, process, display, 
              and transmit the content for the purposes of incident management, emergency coordination, and educational evaluation.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, the student developers, project contributors, academic institutions, 
              and hosting providers shall not be held liable for any direct, indirect, incidental, consequential, special, or exemplary 
              damages resulting from:
            </p>
            <ul>
              <li>The use of, or inability to use, this application;</li>
              <li>Any delay, failure, or refusal of emergency services to respond to an incident submitted through this system;</li>
              <li>Inaccuracies, errors, or omissions in incident descriptions or AI-generated summaries;</li>
              <li>Any unauthorized access to, alteration of, or loss of data;</li>
              <li>Account suspension or penalties resulting from fake-report enforcement.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>9. Modifications to These Terms</h2>
            <p>
              We reserve the right to revise or update these Terms &amp; Conditions at any time. Changes will be reflected directly 
              on this page with a revised &ldquo;Last updated&rdquo; date. Continued access or submission of reports following any 
              modifications constitutes your binding acceptance of the updated terms.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Contact Information</h2>
            <p>
              If you have questions or feedback regarding these Terms &amp; Conditions, please submit an issue or inquiry via 
              the project&apos;s public repository:
            </p>
            <p>
              <a 
                href="https://github.com/Genix2096/disaster-response-system" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
              >
                GitHub Repository: Genix2096/disaster-response-system ↗
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
