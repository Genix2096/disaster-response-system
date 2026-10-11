# Security Policy

## Supported Versions

Security updates are currently intended for the latest version of this project on the `main` branch.

Older versions may not receive security fixes.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it privately to the project maintainer before making it public.

Include the following information in your report:

- A description of the vulnerability.
- Steps to reproduce the issue.
- The potential impact.
- Any relevant screenshots or logs, after removing sensitive information.

Please do not publish exploitable vulnerability details publicly before the issue has been reviewed.

For private reporting, use GitHub's **private vulnerability reporting** feature if it is enabled for this repository. Otherwise, contact the repository maintainer privately.

## Security Practices

This project is designed with the following security considerations:

- **Authentication:** User authentication is handled through Amazon Cognito, with separate administrative authentication.
- **Authorization:** Protected backend routes should verify authentication and user roles before allowing access.
- **File uploads:** Uploaded files should be restricted by file type and size.
- **Cloud storage:** AWS S3 access should be restricted through appropriate permissions.
- **Database access:** DynamoDB access should follow the principle of least privilege.
- **Secrets management:** API keys, passwords, JWT secrets, and AWS credentials must not be committed to the repository.
- **Input validation:** All incoming requests should be validated by the backend.
- **Logging:** Logs should not expose passwords, access tokens, API keys, or other sensitive information.

These practices describe the project's security goals and should not be interpreted as a guarantee that every control has been fully implemented or independently audited.

## Responsible Use

This project is intended for educational and disaster-response management purposes. Do not use it to submit false emergency reports, access data without authorization, or interfere with the system.

## Disclaimer

No software system is completely secure. Users and administrators should verify the deployment configuration, access permissions, and security controls before using this project in a real-world environment.