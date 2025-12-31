/**
 * M.A.T.E. SOC 2 Policy Documents
 * 
 * Implementiert S3: SOC 2 Type II Vorbereitung
 * - S3.1a: Information Security Policy
 * - S3.1b: Access Control Policy  
 * - S3.1c: Change Management Process
 * - S3.1d: Incident Response Plan
 * - S3.1e: Business Continuity Plan
 */

import { CompanyInfo, DEFAULT_COMPANY_INFO } from './index'

// ==================== INFORMATION SECURITY POLICY (S3.1a) ====================

export function generateInformationSecurityPolicy(company: CompanyInfo = DEFAULT_COMPANY_INFO): string {
    return `
================================================================================
INFORMATION SECURITY POLICY
================================================================================

${company.name}
Effective Date: ${new Date().toLocaleDateString('de-DE')}
Version: 1.0
Classification: INTERNAL

================================================================================

1. PURPOSE
----------
This policy establishes the framework for protecting the confidentiality,
integrity, and availability of ${company.name}'s information assets and
customer data.

2. SCOPE
--------
This policy applies to:
- All employees, contractors, and third parties with access to systems
- All information assets, including data, systems, and infrastructure
- All processing activities, including cloud services and AI systems

3. INFORMATION SECURITY PRINCIPLES
----------------------------------

3.1 Confidentiality
- Data is classified and protected according to sensitivity
- Access is granted on a need-to-know basis
- Encryption is used for data at rest and in transit

3.2 Integrity
- Changes to systems and data are controlled and logged
- Data validation ensures accuracy
- Audit trails maintain accountability

3.3 Availability
- Systems are designed for high availability
- Backup and recovery procedures are tested
- Incident response procedures ensure quick recovery

4. ORGANIZATIONAL SECURITY
--------------------------

4.1 Roles and Responsibilities
- CEO: Overall accountability for information security
- CTO: Technical security implementation
- DPO: Data protection compliance
- All employees: Following security policies and reporting incidents

4.2 Security Awareness
- All employees receive security training upon onboarding
- Annual security awareness refresher training
- Phishing simulation exercises quarterly

5. ASSET MANAGEMENT
-------------------

5.1 Asset Inventory
- All hardware, software, and data assets are inventoried
- Assets are classified by criticality and sensitivity
- Asset owners are assigned and documented

5.2 Data Classification
- PUBLIC: No restrictions
- INTERNAL: Business use only
- CONFIDENTIAL: Restricted access, encryption required
- RESTRICTED: Highly sensitive, strictest controls

6. ACCESS CONTROL
-----------------
See separate Access Control Policy (S3.1b)

7. CRYPTOGRAPHY
---------------

7.1 Encryption Standards
- AES-256 for data at rest
- TLS 1.3 for data in transit
- Strong key management practices

7.2 Key Management
- Keys stored securely (environment variables, secrets management)
- Regular key rotation (annually minimum)
- Separation of duties for key access

8. PHYSICAL SECURITY
--------------------
As a cloud-native platform, physical security is delegated to our
hosting provider (Railway) which maintains:
- ISO 27001 certified data centers
- 24/7 physical security and monitoring
- Environmental controls

9. OPERATIONS SECURITY
----------------------

9.1 Change Management
See separate Change Management Process (S3.1c)

9.2 Capacity Management
- Resource usage is monitored continuously
- Auto-scaling is implemented for critical services
- Capacity planning reviews quarterly

9.3 Malware Protection
- Automated vulnerability scanning
- Dependency security monitoring
- Container image scanning

10. COMMUNICATIONS SECURITY
---------------------------

10.1 Network Security
- All external communications encrypted (TLS 1.3)
- API security (authentication, rate limiting)
- Web Application Firewall considerations

10.2 Information Transfer
- Secure file transfer mechanisms
- Email encryption for sensitive data
- Third-party access controls

11. SYSTEM DEVELOPMENT SECURITY
-------------------------------

11.1 Secure Development
- Security requirements in development lifecycle
- Code review with security focus
- Automated security testing (SAST/DAST)

11.2 Test Data
- Production data not used in testing without anonymization
- Separate test environments

12. SUPPLIER RELATIONSHIPS
--------------------------

12.1 Supplier Security
- Security requirements in contracts
- Regular supplier assessments
- Data Processing Agreements (DPAs)

12.2 Service Level Monitoring
- Provider SLAs monitored
- Security incident notification requirements

13. INCIDENT MANAGEMENT
-----------------------
See separate Incident Response Plan (S3.1d)

14. BUSINESS CONTINUITY
-----------------------
See separate Business Continuity Plan (S3.1e)

15. COMPLIANCE
--------------

15.1 Regulatory Requirements
- GDPR compliance (EU data protection)
- SOC 2 Type II preparation
- Industry-specific requirements as applicable

15.2 Policy Review
- Annual policy review and update
- Review following significant incidents or changes

16. ENFORCEMENT
---------------
Violations of this policy may result in disciplinary action,
up to and including termination of employment or contract.

================================================================================
Approved by: [CEO Name]
Date: ${new Date().toLocaleDateString('de-DE')}
Next Review: ${getNextReviewDate()}
================================================================================
`.trim()
}

// ==================== ACCESS CONTROL POLICY (S3.1b) ====================

export function generateAccessControlPolicy(company: CompanyInfo = DEFAULT_COMPANY_INFO): string {
    return `
================================================================================
ACCESS CONTROL POLICY
================================================================================

${company.name}
Effective Date: ${new Date().toLocaleDateString('de-DE')}
Version: 1.0

================================================================================

1. PURPOSE
----------
This policy defines the requirements for controlling access to
${company.name}'s information systems and data.

2. SCOPE
--------
All systems, applications, and data owned or managed by ${company.name}.

3. ACCESS CONTROL PRINCIPLES
----------------------------

3.1 Least Privilege
Users receive minimum permissions necessary for their role.

3.2 Need-to-Know
Access granted only when required for job function.

3.3 Separation of Duties
Critical functions require multiple individuals.

4. USER ACCESS MANAGEMENT
-------------------------

4.1 User Registration
- Unique user ID for each individual
- Access request and approval documented
- Manager approval required

4.2 User Roles
| Role        | Description                    | Permissions              |
|-------------|--------------------------------|--------------------------|
| User        | Standard platform user         | Own data, own agents     |
| Admin       | Organization administrator     | Org users, org settings  |
| SuperAdmin  | Platform administrator         | All system settings      |

4.3 Access Review
- Quarterly access reviews
- Immediate review on role change
- Annual recertification

4.4 Deprovisioning
- Same-day deactivation for terminations
- Access removal within 24 hours of role change
- Documented process

5. AUTHENTICATION
-----------------

5.1 Password Requirements
- Minimum 8 characters
- Complexity requirements (upper, lower, number, special)
- Password hashing (bcrypt)
- No password reuse (last 5 passwords)

5.2 Multi-Factor Authentication (MFA)
- Required for administrative access
- Recommended for all users
- TOTP-based implementation

5.3 Session Management
- Automatic session timeout (30 minutes inactivity)
- Concurrent session limits
- Secure session handling (HttpOnly, Secure cookies)

6. PRIVILEGED ACCESS
--------------------

6.1 Administrative Access
- Separate admin accounts
- MFA required
- Logged and monitored
- Regular review

6.2 Service Accounts
- Unique per application
- No interactive login
- Regularly rotated credentials
- Documented purpose

7. NETWORK ACCESS CONTROL
-------------------------

7.1 API Access
- API key authentication
- Rate limiting per user/key
- IP allowlisting optional

7.2 External Access
- HTTPS only (TLS 1.3)
- No direct database access
- VPN for administrative tasks

8. APPLICATION ACCESS
---------------------

8.1 Authorization
- Role-based access control (RBAC)
- Feature-level permissions
- Workspace isolation

8.2 API Security
- JWT token authentication
- Token expiration
- Refresh token rotation

9. AUDIT LOGGING
----------------

9.1 Logged Events
- Login/logout attempts
- Access grants and revocations
- Privilege escalation
- Configuration changes
- Data exports

9.2 Log Retention
- Security logs: 365 days
- Access logs: 90 days
- Tamper-proof storage

10. ENFORCEMENT
---------------
Violations may result in:
- Account suspension
- Disciplinary action
- Termination

================================================================================
Approved by: [CTO Name]
Date: ${new Date().toLocaleDateString('de-DE')}
Next Review: ${getNextReviewDate()}
================================================================================
`.trim()
}

// ==================== CHANGE MANAGEMENT PROCESS (S3.1c) ====================

export function generateChangeManagementProcess(company: CompanyInfo = DEFAULT_COMPANY_INFO): string {
    return `
================================================================================
CHANGE MANAGEMENT PROCESS
================================================================================

${company.name}
Effective Date: ${new Date().toLocaleDateString('de-DE')}
Version: 1.0

================================================================================

1. PURPOSE
----------
Ensure changes to production systems are controlled, reviewed, and documented.

2. SCOPE
--------
- Application code changes
- Infrastructure changes
- Configuration changes
- Database schema changes
- Third-party integrations

3. CHANGE CATEGORIES
--------------------

3.1 Standard Changes
Pre-approved, low-risk changes following established procedures.
Examples: Library updates, minor UI changes

3.2 Normal Changes
Require review and approval before implementation.
Examples: New features, API changes

3.3 Emergency Changes
Urgent changes to address security or availability issues.
Expedited approval, full documentation post-implementation.

4. CHANGE REQUEST PROCESS
-------------------------

Step 1: Request
- Change description and justification
- Impact assessment
- Risk assessment
- Rollback plan

Step 2: Review
- Technical review by peers
- Security review for relevant changes
- Testing requirements

Step 3: Approval
- Standard: Automatic if criteria met
- Normal: Tech lead + relevant stakeholder
- Emergency: On-call lead (post-hoc CAB review)

Step 4: Implementation
- Scheduled deployment window
- Follow deployment checklist
- Monitor for issues

Step 5: Verification
- Functional verification
- Performance monitoring
- Security scan

Step 6: Documentation
- Change log updated
- Lessons learned (if applicable)

5. ROLES AND RESPONSIBILITIES
-----------------------------

5.1 Change Requester
- Submits change request
- Provides impact analysis
- Implements approved changes

5.2 Change Approver
- Reviews change request
- Assesses risk
- Approves or rejects

5.3 Change Advisory Board (CAB)
- Reviews significant changes
- Emergency change retrospectives
- Process improvement

6. DEPLOYMENT PROCEDURES
------------------------

6.1 Pre-Deployment
□ Code review completed
□ Tests passing
□ Security scan passed
□ Rollback plan documented
□ Stakeholders notified

6.2 Deployment
□ Deploy to staging
□ Staging verification
□ Deploy to production
□ Production verification

6.3 Post-Deployment
□ Monitor logs and metrics
□ Verify functionality
□ Update documentation
□ Close change request

7. ROLLBACK PROCEDURES
----------------------

7.1 Triggers
- Critical functionality broken
- Security vulnerability introduced
- Performance degradation >20%

7.2 Process
1. Decision to rollback (within 30 minutes)
2. Execute rollback
3. Verify restoration
4. Notify stakeholders
5. Root cause analysis

8. EMERGENCY CHANGES
--------------------

8.1 Definition
Changes required to:
- Address security vulnerabilities
- Restore service availability
- Fix critical bugs affecting customers

8.2 Process
1. Verbal approval from on-call lead
2. Implement change
3. Document within 24 hours
4. CAB review within 1 week

9. METRICS
----------
- Change success rate (target: >95%)
- Mean time to deploy
- Rollback frequency
- Emergency change frequency

================================================================================
Approved by: [CTO Name]
Date: ${new Date().toLocaleDateString('de-DE')}
Next Review: ${getNextReviewDate()}
================================================================================
`.trim()
}

// ==================== INCIDENT RESPONSE PLAN (S3.1d) ====================

export function generateIncidentResponsePlan(company: CompanyInfo = DEFAULT_COMPANY_INFO): string {
    return `
================================================================================
INCIDENT RESPONSE PLAN
================================================================================

${company.name}
Effective Date: ${new Date().toLocaleDateString('de-DE')}
Version: 1.0
Classification: INTERNAL

================================================================================

1. PURPOSE
----------
Define procedures for detecting, responding to, and recovering from
security incidents and service disruptions.

2. SCOPE
--------
All security incidents, data breaches, and service disruptions
affecting ${company.name} systems or data.

3. INCIDENT CATEGORIES
----------------------

3.1 Security Incidents
- Unauthorized access attempts
- Data breaches
- Malware/ransomware
- Denial of service attacks
- Insider threats

3.2 Service Incidents
- System outages
- Performance degradation
- Data loss
- Integration failures

4. SEVERITY LEVELS
------------------

| Level | Description              | Response Time | Escalation          |
|-------|--------------------------|---------------|---------------------|
| SEV 1 | Critical - System down   | 15 minutes    | Immediate (CTO)     |
| SEV 2 | High - Major impact      | 1 hour        | Within 2 hours      |
| SEV 3 | Medium - Limited impact  | 4 hours       | Within 24 hours     |
| SEV 4 | Low - Minimal impact     | 24 hours      | Weekly review       |

5. INCIDENT RESPONSE TEAM
-------------------------

5.1 Core Team
- Incident Commander (IC): Overall coordination
- Technical Lead: Technical investigation and remediation
- Communications Lead: Stakeholder communication
- Legal/Compliance: Regulatory and legal matters

5.2 Extended Team
- Customer Success: Customer communication
- Engineering: Additional technical support
- Executive: Major decisions and approvals

6. INCIDENT RESPONSE PHASES
---------------------------

PHASE 1: DETECTION & TRIAGE (0-15 minutes)
------------------------------------------
□ Alert received/incident reported
□ Initial assessment
□ Severity classification
□ Incident ticket created
□ IC assigned

PHASE 2: CONTAINMENT (15-60 minutes)
------------------------------------
□ Identify affected systems
□ Isolate compromised systems
□ Preserve evidence
□ Activate response team
□ Initial stakeholder notification

PHASE 3: INVESTIGATION (Ongoing)
--------------------------------
□ Root cause analysis
□ Impact assessment
□ Evidence collection
□ Timeline reconstruction
□ Attack vector identification (security incidents)

PHASE 4: ERADICATION (As required)
----------------------------------
□ Remove threat/fix issue
□ Patch vulnerabilities
□ Reset compromised credentials
□ Verify remediation

PHASE 5: RECOVERY (As required)
-------------------------------
□ Restore systems from backup
□ Verify system integrity
□ Monitor for recurrence
□ Gradual service restoration

PHASE 6: POST-INCIDENT (Within 1 week)
--------------------------------------
□ Incident report completed
□ Lessons learned documented
□ Process improvements identified
□ Stakeholder debrief

7. COMMUNICATION PROCEDURES
---------------------------

7.1 Internal Communication
- Slack: #incident-response channel
- Email: security@${company.email?.split('@')[1] || 'getmate.ai'}
- Phone tree for SEV 1/2

7.2 External Communication
- Customers: Email notification within 72 hours (data breach)
- Regulators: Within 72 hours for GDPR breaches
- Press: Coordinated through Communications Lead

7.3 Status Page
- Update within 30 minutes of confirmed incident
- Regular updates every 30 minutes during active incident
- Post-incident summary

8. DATA BREACH RESPONSE
-----------------------

8.1 Definition
Unauthorized access to, or disclosure of, personal data.

8.2 Notification Requirements
- Supervisory Authority: Within 72 hours
- Affected Individuals: "Without undue delay" if high risk
- Documentation: All breaches must be documented

8.3 Notification Content
- Nature of breach
- Categories and approximate number of individuals affected
- Likely consequences
- Measures taken or proposed

9. EVIDENCE HANDLING
--------------------

9.1 Preservation
- System logs
- Access logs
- Network traffic
- Screenshots
- Affected data copies

9.2 Chain of Custody
- Document who handled evidence
- Secure storage
- Integrity verification

10. CONTACT INFORMATION
-----------------------

Security Team: security@${company.email?.split('@')[1] || 'getmate.ai'}
On-Call: [Phone number]
Legal: [Legal contact]
Regulators: [Relevant DPA contact]

================================================================================
Approved by: [CEO Name]
Date: ${new Date().toLocaleDateString('de-DE')}
Next Review: ${getNextReviewDate()}
================================================================================
`.trim()
}

// ==================== BUSINESS CONTINUITY PLAN (S3.1e) ====================

export function generateBusinessContinuityPlan(company: CompanyInfo = DEFAULT_COMPANY_INFO): string {
    return `
================================================================================
BUSINESS CONTINUITY PLAN
================================================================================

${company.name}
Effective Date: ${new Date().toLocaleDateString('de-DE')}
Version: 1.0
Classification: INTERNAL

================================================================================

1. PURPOSE
----------
Ensure ${company.name} can continue essential operations during and after
a significant disruption.

2. SCOPE
--------
- Core platform services (Agent Builder, Voice Services)
- Customer data and access
- Internal operations
- Third-party dependencies

3. BUSINESS IMPACT ANALYSIS
---------------------------

3.1 Critical Business Functions
| Function           | RTO*    | RPO**   | Priority |
|--------------------|---------|---------|----------|
| Platform Access    | 4 hours | 1 hour  | Critical |
| Voice Services     | 4 hours | 0       | Critical |
| Agent Builder      | 8 hours | 4 hours | High     |
| Customer Portal    | 8 hours | 4 hours | High     |
| Billing System     | 24 hours| 24 hours| Medium   |
| Admin Functions    | 48 hours| 24 hours| Low      |

*RTO: Recovery Time Objective
**RPO: Recovery Point Objective

3.2 Dependencies
- Railway (Cloud Hosting)
- OpenRouter (LLM Services)
- VAPI (Voice Services)
- Stripe (Payment Processing)
- Database (PostgreSQL)

4. RISK SCENARIOS
-----------------

4.1 Technology Failures
- Cloud provider outage
- Database corruption
- Network disruption
- Third-party service failure

4.2 Cyber Incidents
- Ransomware attack
- Data breach
- DDoS attack

4.3 External Events
- Natural disasters
- Pandemic
- Supply chain disruption

5. RECOVERY STRATEGIES
----------------------

5.1 Data Backup
- Automated daily backups
- Backup encryption (AES-256)
- Geographically distributed storage
- Regular restoration testing

5.2 System Redundancy
- Multi-region deployment (planned)
- Auto-scaling infrastructure
- Load balancing

5.3 Third-Party Alternatives
| Primary       | Alternative     | Switch Time |
|---------------|-----------------|-------------|
| Railway       | Render/Fly.io   | 4-8 hours   |
| OpenRouter    | Direct API      | 2 hours     |
| VAPI          | Twilio          | 8 hours     |

6. RECOVERY PROCEDURES
----------------------

6.1 Initial Response (0-30 minutes)
□ Incident declared
□ BCP team activated
□ Situation assessment
□ Communication initiated

6.2 Activation (30 min - 2 hours)
□ Recovery strategy selected
□ Resources mobilized
□ Stakeholders notified
□ Backup systems prepared

6.3 Recovery (2-24 hours)
□ Systems restored from backup
□ Services brought online
□ Data integrity verified
□ Functionality tested

6.4 Resumption (24-72 hours)
□ Full service restoration
□ Backlog processing
□ Customer communication
□ Normal operations resumed

7. COMMUNICATION PLAN
---------------------

7.1 Internal
- Team leads: Immediate notification
- All staff: Within 30 minutes
- Regular updates: Every 2 hours

7.2 External
- Customers: Within 2 hours (email, status page)
- Partners: Within 4 hours
- Regulators: As required

7.3 Status Page
URL: status.getmate.ai
Updates: Minimum every 30 minutes during incident

8. ROLES AND RESPONSIBILITIES
-----------------------------

8.1 BCP Coordinator
- Declares business continuity event
- Coordinates response
- Makes key decisions

8.2 Technical Lead
- Leads technical recovery
- Coordinates with providers
- Validates restoration

8.3 Communications Lead
- Stakeholder communication
- Status page updates
- Customer support coordination

9. TESTING AND MAINTENANCE
--------------------------

9.1 Testing Schedule
- Tabletop exercises: Quarterly
- Technical recovery test: Semi-annually
- Full BCP test: Annually

9.2 Plan Maintenance
- Review after each incident
- Annual update minimum
- Update after significant changes

10. APPENDICES
--------------

A. Contact List
B. System Recovery Procedures
C. Vendor Contacts
D. Insurance Information
E. Regulatory Contacts

================================================================================
Approved by: [CEO Name]
Date: ${new Date().toLocaleDateString('de-DE')}
Next Review: ${getNextReviewDate()}
================================================================================
`.trim()
}

// Helper
function getNextReviewDate(): string {
    const date = new Date()
    date.setFullYear(date.getFullYear() + 1)
    return date.toLocaleDateString('de-DE')
}
