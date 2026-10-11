import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="page-container">
      <div className="legal-container">
        <div className="legal-header">
          <Link to="/" className="back-link">← Back to Home</Link>
          <div className="legal-badge">Security & Data Governance</div>
          <h1 className="page-title">Privacy Policy</h1>
          <p className="page-subtitle">
            Last updated: October 2026 • Cloud-Based Disaster Reporting and Alert Management System
          </p>
        </div>

        <div className="card legal-card">
          <div className="legal-callout alert-info">
            <strong>Academic Project Notice:</strong> This application was developed as a Cloud Computing 
            college project demonstrating full-stack cloud architecture, serverless integrations, and 
            reputation-based governance. It operates as an educational and demonstration platform and is 
            not an official governmental emergency dispatch agency.
          </div>

          <section className="legal-section">
            <h2>1. Introduction</h2>
            <p>
              This Privacy Policy explains how the <strong>Cloud-Based Disaster Reporting and Alert Management System</strong> 
              (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the System&rdquo;) collects, uses, stores, processes, and protects 
              information when you register an account, log in, submit emergency incident reports, and interact with our web 
              application.
            </p>
            <p>
              We are committed to transparent data handling and minimizing the collection of personal information to what is 
              strictly necessary for incident triage, emergency alerting, and system security.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Information We Collect</h2>
            <p>We collect information in three primary scenarios:</p>

            <h3>A. User Registration and Authentication</h3>
            <p>
              When you register for a citizen account to report incidents, authentication is managed through 
              <strong>Amazon Cognito User Pools</strong>:
            </p>
            <ul>
              <li><strong>Username:</strong> Chosen by you (3–64 characters) to identify your account and display on your submissions.</li>
              <li><strong>Email Address:</strong> Used for account verification via one-time verification codes and password recovery.</li>
              <li>
                <strong>Passwords:</strong> Handled securely using the <em>Secure Remote Password (SRP)</em> protocol. 
                Your plaintext password is never transmitted to our backend API server and is never stored in our application database.
              </li>
            </ul>
            <p>
              Upon successful registration and initial login, a user profile is automatically provisioned in our 
              <strong>Amazon DynamoDB</strong> <code>DisasterUsers</code> table containing:
            </p>
            <ul>
              <li>Your immutable Cognito user identifier (<code>userId</code> / <code>sub</code> UUID)</li>
              <li>Your username and email address</li>
              <li>Account reputation metrics: <code>riskScore</code> (starts at 0) and <code>fakeIncidentCount</code> (starts at 0)</li>
              <li>Account status: <code>accountStatus</code> (<code>ACTIVE</code> or <code>SUSPENDED</code>)</li>
              <li>Profile creation and update timestamps</li>
            </ul>

            <h3>B. Incident Report Submissions</h3>
            <p>
              When an authenticated user submits an incident report, the following information is recorded in the 
              <strong>Amazon DynamoDB</strong> <code>DisasterReports</code> table:
            </p>
            <ul>
              <li><strong>Incident Category:</strong> Selected incident type (<code>Fire</code>, <code>Flood</code>, <code>Accident</code>, <code>Road Damage</code>, <code>Building Damage</code>, or <code>Other</code>).</li>
              <li><strong>Location:</strong> Textual location entered by the user (up to 500 characters).</li>
              <li><strong>Description:</strong> Narrative explanation of the hazard or emergency (up to 5,000 characters).</li>
              <li><strong>Submitter Association:</strong> Your Cognito <code>userId</code> is cryptographically extracted from your verified session token and bound to the incident record to maintain an audit trail. Body-supplied user IDs are discarded by the server.</li>
              <li><strong>Generated Identifiers &amp; Timestamps:</strong> A unique Incident ID (format: <code>INC-YYYYMMDD-XXXXXX</code>) and ISO 8601 creation timestamp.</li>
            </ul>

            <h3>C. Uploaded Photographs &amp; EXIF Geolocation Metadata</h3>
            <p>
              If you optionally attach an image to an incident report:
            </p>
            <ul>
              <li><strong>Image File:</strong> Processed in server memory (max 5 MB; JPEG, PNG, or WEBP) and uploaded to a private Amazon S3 bucket.</li>
              <li>
                <strong>EXIF GPS Data Extraction:</strong> The backend automatically parses the raw image buffer using the 
                <code>exifr</code> library to inspect for embedded GPS metadata (latitude and longitude).
              </li>
              <li>
                <strong>Evidence Strength Classification:</strong> If GPS coordinates are detected, the system records 
                <code>photoHasGeotag = true</code>, stores the extracted latitude/longitude coordinates, and classifies evidence 
                as <em>&ldquo;Strong supporting evidence&rdquo;</em>. If no GPS tags exist, evidence is classified as 
                <em>&ldquo;Photo uploaded — no geolocation metadata&rdquo;</em>.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Cloud Storage &amp; Infrastructure Providers</h2>
            <p>Your information is stored across the following verified AWS services in the Asia Pacific (Mumbai / <code>ap-south-1</code>) region:</p>
            <div className="legal-grid">
              <div className="legal-grid-item">
                <h4>Amazon Cognito</h4>
                <p>Manages user identities, email verifications, and cryptographic JWT ID/access token generation via SRP authentication.</p>
              </div>
              <div className="legal-grid-item">
                <h4>Amazon DynamoDB</h4>
                <p>Stores incident records (<code>DisasterReports</code>) and user governance profiles (<code>DisasterUsers</code>) in encrypted NoSQL tables.</p>
              </div>
              <div className="legal-grid-item">
                <h4>Amazon S3</h4>
                <p>Stores incident photographs in a private bucket with all public access blocked. Access is restricted to short-lived presigned URLs.</p>
              </div>
              <div className="legal-grid-item">
                <h4>Amazon SNS</h4>
                <p>Publishes automated emergency notification alerts to departmental responder topics.</p>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>4. Third-Party AI Integration (Groq Cloud API)</h2>
            <p>
              To assist emergency personnel in rapidly triaging incidents, the backend communicates with the 
              <strong>Groq Cloud API</strong> running the <strong>LLaMA 3.1 8B Instant</strong> language model 
              (<code>llama-3.1-8b-instant</code>).
            </p>
            <ul>
              <li>
                <strong>Information Transmitted to Groq:</strong> The system sends structured incident metadata: Incident ID, 
                category, location, user description, report timestamp, priority level, notification departments, photo presence, 
                geotag availability, and evidence strength.
              </li>
              <li>
                <strong>Information NOT Transmitted to Groq:</strong> Your username, email address, raw password, and AWS account 
                credentials are never transmitted to Groq.
              </li>
              <li>
                <strong>AI Purpose:</strong> Groq synthesizes this data into a factual 2–3 sentence executive incident summary. 
                If the Groq API is unavailable or unconfigured, the system automatically falls back to a clean truncated summary 
                without failing the incident report.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. Emergency Alert Notifications (Amazon SNS)</h2>
            <p>
              When an incident is reported, the backend evaluates department routing rules deterministically based on category:
            </p>
            <ul>
              <li><code>Fire</code> → Fire Department (<code>FIRE</code>)</li>
              <li><code>Flood</code>, <code>Building Damage</code> → Fire &amp; Police Departments (<code>FIRE</code>, <code>POLICE</code>)</li>
              <li><code>Accident</code>, <code>Road Damage</code> → Police Department (<code>POLICE</code>)</li>
            </ul>
            <p>
              The system publishes an asynchronous alert message to the corresponding Amazon SNS topics 
              (<code>DisasterAlerts-Fire</code> and/or <code>DisasterAlerts-Police</code>).
            </p>
            <p>
              <strong>Content of Alerts:</strong> The alert message contains the Incident ID, category, priority, location, 
              incident description, evidence tier, and timestamp. Submitter email addresses and usernames are 
              <strong>not</strong> included in published SNS alert messages.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Data Security and Access Controls</h2>
            <p>We employ multiple layers of technical and architectural safeguards:</p>
            <ul>
              <li><strong>Dual-Tier Authentication:</strong> Citizen sessions rely on Cognito RS256 ID tokens verified against Cognito&apos;s JWKS. Administrative sessions rely on HS256-signed JWTs pinned to prevent algorithm substitution attacks.</li>
              <li><strong>Private Object Storage:</strong> The Amazon S3 bucket strictly prohibits public reads. Incident images are delivered to authorized clients solely through temporary presigned URLs expiring after 15 minutes (900 seconds).</li>
              <li><strong>Memory-Only Upload Buffering:</strong> Uploaded files are processed in memory with <code>multer.memoryStorage()</code> and never written to temporary files on the host server&apos;s file system.</li>
              <li><strong>Keyless Cloud Execution:</strong> On deployment, the backend assumes an IAM instance profile (<code>DisasterResponseEC2Role</code>) without hardcoding long-lived AWS secret access keys on disk.</li>
              <li><strong>Sanitized Logging:</strong> Application logs generated for Amazon CloudWatch omit user passwords, raw tokens, and secret configuration keys.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>7. Reputation Tracking &amp; Fake-Incident Governance</h2>
            <p>
              To maintain system integrity and discourage malicious hoaxes, administrators have the capability to audit reports 
              and flag false incidents (<code>PATCH /api/admin/incidents/:id/fake</code>) with an audited justification.
            </p>
            <ul>
              <li>When a report is flagged as fake, the submitter&apos;s <code>riskScore</code> is incremented by <strong>+25</strong> points, and their <code>fakeIncidentCount</code> is incremented by 1.</li>
              <li>If a user&apos;s <code>riskScore</code> reaches or exceeds <strong>100</strong>, their account status is automatically set to <code>SUSPENDED</code>.</li>
              <li>Suspended users are prevented from submitting subsequent reports by the <code>requireActiveAccount</code> backend middleware (HTTP 403 Forbidden).</li>
              <li>Users can view their current risk score, risk level, and account status transparently at any time on their <Link to="/user/dashboard">User Dashboard</Link>.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>8. Data Retention, Deletion, and User Requests</h2>
            <ul>
              <li><strong>Incident Deletion:</strong> When an administrator deletes an incident (<code>DELETE /api/incidents/:id</code>), the record is deleted from DynamoDB and its associated photo is permanently deleted from Amazon S3.</li>
              <li><strong>Automated Retention Limits:</strong> The current implementation does not enforce an automatic time-to-live (TTL) expiry for incident records or user accounts; records remain in DynamoDB until deleted by an administrator.</li>
              <li><strong>Access &amp; Deletion Requests:</strong> Users can inspect all reports they have submitted on their User Dashboard. If you wish to request the deletion of your account profile or submitted records, please contact the project administrator or maintainer directly.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>9. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy as new features, cloud services, or security controls are introduced. 
              The revised policy will be posted on this page with an updated &ldquo;Last updated&rdquo; timestamp. Continued 
              use of the platform after updates constitutes awareness of the revised terms.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Contact &amp; Maintainer Inquiries</h2>
            <p>
              For privacy inquiries, security concerns, or account deletion requests regarding this college project, please 
              reach out to the project maintainer via the official GitHub repository:
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
