# M.A.T.E. AI Platform - Remaining Implementation Work

**Status**: Phase 1 & 2 Complete ✅ | Phase 3-5 Pending ⏸️  
**Last Updated**: January 2025  
**Completion**: 66% (41 of 62 tasks complete)

---

## 🎯 Executive Summary

**What's Complete:**
- ✅ Enterprise Security Foundation (AES-256-GCM, BYOK, Guardrails)
- ✅ Hybrid Routing Engine (BYOK/Managed, Failover, Volume Discounts)
- ✅ Transaction Transparency (Complete billing details)
- ✅ Node Label Mapping (Natural language labels for 30+ nodes)

**What Remains:**
- ⏸️ UX Transformation (8 tasks remaining)
- ⏸️ VAPI Integration (9 tasks remaining)
- ⏸️ Testing & Launch (12 tasks remaining)

---

## 📋 Remaining Tasks by Phase

### Phase 3: UX Transformation (8 tasks, ~2-3 weeks)

#### 3.1 Node Categorization (2 tasks)
**Priority**: HIGH | **Complexity**: MEDIUM

- [x] ✅ **3.1.1** Node Label Mapping
  - **Status**: COMPLETE
  - **File**: `flowise/packages/server/src/utils/node-label-mapping.ts`
  - **Features**: 30+ nodes mapped with German labels, icons, colors, categories

- [ ] **3.1.2** Implement Icon System
  - **Effort**: 4-6 hours
  - **Files to Modify**:
    - `flowise/packages/ui/src/views/canvas/CanvasNode.jsx`
    - `flowise/packages/ui/src/ui-component/extended/NodeIcons.jsx` (create)
  - **Description**: 
    - Create icon component system with emoji/SVG support
    - Update CanvasNode to render icons based on node type
    - Add icon to node palette/toolbar
  - **Dependencies**: Material-UI Icons library
  - **Acceptance Criteria**:
    - [ ] Icons render on all nodes in canvas
    - [ ] Icons appear in node selection palette
    - [ ] Icons are color-coded by category

- [ ] **3.1.3** Color Scheme Implementation
  - **Effort**: 3-4 hours
  - **Files to Modify**:
    - `flowise/packages/ui/src/views/canvas/CanvasNode.jsx`
    - `flowise/packages/ui/src/themes/palette.js`
  - **Description**:
    - Define color palette for 6 categories (Trigger/AI/Logic/Action/Data/Tool)
    - Apply colors to node backgrounds/borders
    - Add color legend to canvas
  - **Color Scheme**:
    ```javascript
    {
      trigger: '#3b82f6', // Blue
      ai: '#8b5cf6',      // Purple
      logic: '#eab308',   // Yellow
      action: '#22c55e',  // Green
      data: '#f97316',    // Orange
      tool: '#6b7280'     // Gray
    }
    ```

#### 3.2 Drag-and-Drop Improvements (3 tasks)
**Priority**: MEDIUM | **Complexity**: HIGH

- [ ] **3.2.1** Smart-Snap Implementation
  - **Effort**: 8-12 hours
  - **Files to Modify**:
    - `flowise/packages/ui/src/views/canvas/index.jsx`
    - `flowise/packages/ui/src/utils/canvas-helpers.js` (create)
  - **Description**:
    - Detect compatible node connections
    - Auto-snap nodes when dragged near compatible anchor
    - Visual feedback for valid/invalid connections
  - **Algorithm**:
    ```javascript
    function canConnect(sourceNode, targetNode) {
      const sourceOutput = sourceNode.outputAnchors[0].baseClasses
      const targetInput = targetNode.inputAnchors[0].baseClasses
      return sourceOutput.some(c => targetInput.includes(c))
    }
    ```
  - **Acceptance Criteria**:
    - [ ] Nodes snap when within 50px of compatible anchor
    - [ ] Green highlight for valid connection
    - [ ] Red highlight for invalid connection

- [ ] **3.2.2** Auto-Complete Workflow
  - **Effort**: 12-16 hours
  - **Files to Create**:
    - `flowise/packages/server/src/services/workflow-suggestions.service.ts`
    - `flowise/packages/ui/src/views/canvas/SuggestionPanel.jsx`
  - **Description**:
    - Analyze current workflow state
    - Suggest next logical nodes based on patterns
    - Quick-add suggested nodes with one click
  - **Suggestion Logic**:
    ```
    Last Node Type → Suggested Next Nodes
    - Start → [AI Model, Condition, Tool]
    - AI Model → [Condition, Action, Tool]
    - Condition → [AI Model, Action, End]
    - Tool → [AI Model, Condition, Action]
    ```

- [ ] **3.2.3** Real-time Validation Hints
  - **Effort**: 6-8 hours
  - **Files to Modify**:
    - `flowise/packages/ui/src/views/canvas/index.jsx`
    - `flowise/packages/ui/src/views/canvas/ValidationPanel.jsx` (create)
  - **Description**:
    - Real-time workflow validation
    - Visual indicators on incomplete/invalid nodes
    - Error panel with actionable hints
  - **Validation Rules**:
    - [ ] All nodes have required inputs connected
    - [ ] At least one path from Start to End
    - [ ] No orphaned nodes (disconnected)
    - [ ] No circular dependencies

#### 3.3 Template Library (3 tasks)
**Priority**: HIGH | **Complexity**: MEDIUM

- [ ] **3.3.1** Template Data Structure
  - **Effort**: 4-6 hours
  - **Files to Create**:
    - `flowise/packages/server/src/database/entities/workflow-template.entity.ts`
    - `flowise/packages/server/src/database/migrations/postgres/1748560000000-AddWorkflowTemplate.ts`
  - **Schema**:
    ```typescript
    @Entity()
    export class WorkflowTemplate {
      @PrimaryGeneratedColumn('uuid')
      id: string
      
      @Column()
      name: string
      
      @Column()
      description: string
      
      @Column()
      category: string // 'customer-service', 'sales', 'hr', 'support'
      
      @Column('text')
      flowData: string // JSON serialized workflow
      
      @Column()
      icon: string
      
      @Column({ default: false })
      isPublic: boolean
    }
    ```

- [ ] **3.3.2** Default Templates
  - **Effort**: 6-8 hours (design + implementation)
  - **Files to Create**:
    - `flowise/packages/server/src/templates/appointment-booking.template.json`
    - `flowise/packages/server/src/templates/support-ticket.template.json`
    - `flowise/packages/server/src/templates/faq-bot.template.json`
  - **Templates to Create**:
    1. **Termin buchen** (Appointment Booking)
       - Start → Form Input (Name, Date, Time, Reason)
       - → AI Assistant (Confirm details)
       - → API Call (Book in calendar)
       - → Email Notification
       - → Voice Response (Confirmation)
    
    2. **Support-Ticket** (Support Ticket)
       - Start → Chat Input
       - → AI Assistant (Classify issue)
       - → Condition (Priority?)
       - → High: Escalate to Human
       - → Low: AI Resolution + Create Ticket
    
    3. **FAQ-Bot**
       - Start → Chat Input
       - → Vector Search (Knowledge Base)
       - → AI Assistant (Answer with context)
       - → Condition (Satisfied?)
       - → No: Transfer to Agent

- [ ] **3.3.3** Template Selection UI
  - **Effort**: 8-10 hours
  - **Files to Create**:
    - `flowise/packages/ui/src/views/templates/index.jsx`
    - `flowise/packages/ui/src/views/templates/TemplateCard.jsx`
    - `flowise/packages/ui/src/views/templates/TemplatePreview.jsx`
  - **Features**:
    - Gallery view with template cards
    - Search and filter by category
    - Preview modal with workflow diagram
    - "Use Template" button → Create new flow from template

---

### Phase 4: VAPI Deep Integration (9 tasks, ~2-3 weeks)

#### 4.1 Voice Agent Entity (3 tasks)
**Priority**: HIGH | **Complexity**: MEDIUM

- [ ] **4.1.1** VoiceAgent Entity
  - **Effort**: 3-4 hours
  - **File**: `flowise/packages/server/src/enterprise/database/entities/voice-agent.entity.ts`
  - **Schema**:
    ```typescript
    @Entity()
    export class VoiceAgent {
      @PrimaryGeneratedColumn('uuid')
      id: string
      
      @Column({ type: 'uuid' })
      chatflowId: string
      
      @Column({ nullable: true })
      vapiAssistantId: string
      
      @Column({ nullable: true })
      vapiPhoneNumber: string
      
      @Column({ type: 'jsonb', nullable: true })
      voiceSettings: {
        provider: 'elevenlabs' | 'azure' | 'deepgram'
        voiceId: string
        model: string
        speed: number
      }
      
      @Column({ default: true })
      isActive: boolean
      
      @Column({ type: 'timestamp', nullable: true })
      lastSyncedAt: Date
    }
    ```

- [ ] **4.1.2** VAPI Sync Service
  - **Effort**: 12-16 hours
  - **File**: `flowise/packages/server/src/enterprise/services/vapi-sync.service.ts`
  - **Key Methods**:
    ```typescript
    class VAPISyncService {
      // Create/Update VAPI Assistant when flow is saved
      async syncAssistant(chatflowId: string): Promise<string>
      
      // Delete VAPI Assistant when flow is deleted
      async deleteAssistant(vapiAssistantId: string): Promise<void>
      
      // Sync phone number assignment
      async assignPhoneNumber(assistantId: string, phoneId: string): Promise<void>
    }
    ```
  - **Dependencies**: VAPI API Key (from env)

- [ ] **4.1.3** Flow Type Detection
  - **Effort**: 4-6 hours
  - **Files to Modify**:
    - `flowise/packages/server/src/services/chatflows/index.ts`
  - **Logic**:
    ```typescript
    function detectFlowType(flowData: any): 'voice' | 'chat' {
      const hasVAPINodes = flowData.nodes.some(n => 
        n.name === 'vapiVoiceTrigger' || n.name === 'vapiVoiceResponse'
      )
      return hasVAPINodes ? 'voice' : 'chat'
    }
    ```
  - **Integration**: Auto-trigger VAPI sync on save if `type === 'voice'`

#### 4.2 Phone Management (3 tasks)
**Priority**: HIGH | **Complexity**: HIGH

- [ ] **4.2.1** Phone Number Booking Flow
  - **Effort**: 10-14 hours
  - **Files to Create**:
    - `flowise/packages/ui/src/views/phone-numbers/index.jsx`
    - `flowise/packages/ui/src/views/phone-numbers/BookPhoneDialog.jsx`
    - `flowise/packages/server/src/enterprise/services/phone-booking.service.ts`
  - **Features**:
    - List available phone numbers from VAPI
    - Search by country/area code
    - Purchase/book phone number
    - Assign to voice agent

- [ ] **4.2.2** Phone Billing Integration
  - **Effort**: 6-8 hours
  - **Files to Modify**:
    - `flowise/packages/server/src/enterprise/services/wallet.service.ts`
  - **New Method**:
    ```typescript
    async chargeMonthlyPhoneFee(
      userId: string,
      phoneNumber: string
    ): Promise<void> {
      const MONTHLY_PHONE_COST = 500 // €5.00
      await this.deductBalance(userId, MONTHLY_PHONE_COST, 'phone_rental', {
        description: `Monthly phone rental: ${phoneNumber}`
      })
    }
    ```
  - **Cron Job**: Monthly charge on 1st of each month

- [ ] **4.2.3** Admin Dashboard
  - **Effort**: 8-10 hours
  - **File**: `flowise/packages/ui/src/views/admin/PhoneDashboard.jsx`
  - **Features**:
    - List all rented phone numbers
    - Show assignment status (assigned/unassigned)
    - Phone usage stats (call duration, costs)
    - Release/cancel phone number

#### 4.3 Webhook Handler (3 tasks)
**Priority**: HIGH | **Complexity**: MEDIUM

- [ ] **4.3.1** VAPI Webhook Endpoint
  - **Effort**: 4-6 hours
  - **File**: `flowise/packages/server/src/routes/vapi-webhook.ts` (modify existing)
  - **New Events to Handle**:
    - `call.started`: Log call initiation
    - `call.ended`: Trigger billing
    - `call.failed`: Error logging

- [ ] **4.3.2** Call-Ended Billing
  - **Effort**: 6-8 hours
  - **Integration**: `WalletService.chargeVoiceUsage()`
  - **Logic**:
    ```typescript
    async function handleCallEnded(event: VAPICallEndedEvent) {
      const durationSeconds = event.duration
      const durationMinutes = Math.ceil(durationSeconds / 60)
      
      await walletService.chargeVoiceUsage(
        event.userId,
        durationSeconds,
        event.callId,
        event.chatflowId
      )
    }
    ```

- [ ] **4.3.3** Voice Analytics Endpoint
  - **Effort**: 6-8 hours
  - **Endpoint**: `GET /api/v1/voice-agents/:id/analytics`
  - **Response**:
    ```json
    {
      "totalCalls": 42,
      "totalDurationMinutes": 180,
      "totalCostCents": 27000,
      "avgCallDuration": 4.3,
      "callsByDay": [...],
      "topHours": [...]
    }
    ```

---

### Phase 5: Testing & Launch (12 tasks, ~2 weeks)

#### 5.1 Unit Tests (3 tasks)
**Priority**: HIGH | **Complexity**: MEDIUM

- [ ] **5.1.1** Billing Service Tests
  - **Effort**: 8-10 hours
  - **File**: `flowise/packages/server/src/enterprise/services/__tests__/cost-estimator.service.test.ts`
  - **Test Cases** (95% coverage):
    ```typescript
    describe('CostEstimatorService', () => {
      test('calculates exact cost with volume discount', () => {})
      test('estimates tokens with char/4 heuristic', () => {})
      test('applies correct discount tier based on monthly usage', () => {})
      test('rounds cents correctly', () => {})
    })
    ```

- [ ] **5.1.2** Encryption Tests
  - **Effort**: 4-6 hours
  - **File**: `flowise/packages/server/src/enterprise/services/__tests__/encryption.service.test.ts`
  - **Test Cases** (100% coverage):
    ```typescript
    describe('EncryptionService', () => {
      test('encrypts and decrypts API key correctly', () => {})
      test('generates unique IV for each encryption', () => {})
      test('SHA-256 hash is deterministic', () => {})
      test('decryption fails with wrong key', () => {})
    })
    ```

- [ ] **5.1.3** Guardrail Tests
  - **Effort**: 6-8 hours
  - **File**: `flowise/packages/server/src/enterprise/services/__tests__/guardrail.service.test.ts`
  - **Test Cases** (90% coverage):
    ```typescript
    describe('GuardrailService', () => {
      test('detects email addresses', () => {})
      test('detects phone numbers (multiple formats)', () => {})
      test('detects SSN', () => {})
      test('detects API keys (OpenRouter, OpenAI, Anthropic)', () => {})
      test('masks PII correctly (partial vs redact)', () => {})
      test('returns correct action (BLOCK, MASK, WARN)', () => {})
    })
    ```

#### 5.2 Integration Tests (3 tasks)
**Priority**: HIGH | **Complexity**: HIGH

- [ ] **5.2.1** BYOK Flow Test
  - **Effort**: 8-10 hours
  - **File**: `flowise/packages/server/src/__tests__/integration/byok-flow.test.ts`
  - **Test Flow**:
    ```
    1. User enters API key in UI
    2. Validate API key (format + test call)
    3. Save encrypted key to database
    4. Make LLM call using BYOK key
    5. Verify no billing occurred (BYOK is free)
    ```

- [ ] **5.2.2** Managed Flow Test
  - **Effort**: 10-12 hours
  - **File**: `flowise/packages/server/src/__tests__/integration/managed-flow.test.ts`
  - **Test Flow**:
    ```
    1. Pre-flight check (estimate cost + verify balance)
    2. HTTP 402 if insufficient balance
    3. LLM call with platform key
    4. Post-flight billing (exact token count)
    5. Verify wallet balance decreased
    6. Check transaction log
    ```

- [ ] **5.2.3** Voice Agent Test
  - **Effort**: 12-16 hours
  - **File**: `flowise/packages/server/src/__tests__/integration/voice-agent.test.ts`
  - **Test Flow**:
    ```
    1. Create voice-enabled flow
    2. Auto-sync to VAPI
    3. Book phone number
    4. Simulate inbound call
    5. Verify webhook handling
    6. Check voice billing
    ```

#### 5.3 E2E Tests (3 tasks)
**Priority**: MEDIUM | **Complexity**: HIGH

- [ ] **5.3.1** New User Journey
  - **Effort**: 8-10 hours
  - **Tool**: Cypress
  - **File**: `flowise/packages/ui/cypress/e2e/new-user.cy.js`
  - **Test Steps**:
    ```javascript
    describe('New User Journey', () => {
      it('registers and creates first agent', () => {
        cy.visit('/register')
        cy.fillRegistrationForm()
        cy.clickSubmit()
        cy.url().should('include', '/dashboard')
        cy.verifyWelcomeBonus() // €10 initial credits
        cy.clickCreateFlow()
        cy.selectTemplate('FAQ Bot')
        cy.saveFlow()
        cy.verifyFlowCreated()
      })
    })
    ```

- [ ] **5.3.2** Power User with BYOK
  - **Effort**: 10-12 hours
  - **File**: `flowise/packages/ui/cypress/e2e/byok-user.cy.js`
  - **Test Steps**:
    ```javascript
    describe('Power User with BYOK', () => {
      it('adds BYOK key and creates complex flow', () => {
        cy.login('poweruser@example.com')
        cy.visit('/api-keys')
        cy.clickAddKey()
        cy.fillApiKey('sk-or-v1-...')
        cy.clickValidate()
        cy.verifyKeyValid()
        cy.clickSave()
        cy.createComplexFlow() // Multi-node workflow
        cy.testFlow()
        cy.verifyNoBilling() // BYOK is free
      })
    })
    ```

- [ ] **5.3.3** Voice Agent E2E
  - **Effort**: 12-16 hours
  - **File**: `flowise/packages/ui/cypress/e2e/voice-agent.cy.js`
  - **Test Steps**:
    ```javascript
    describe('Voice Agent End-to-End', () => {
      it('creates voice agent with phone number', () => {
        cy.createVoiceFlow()
        cy.verifyVAPISynced()
        cy.visit('/phone-numbers')
        cy.bookPhoneNumber('+1234567890')
        cy.assignToAgent()
        cy.simulateInboundCall()
        cy.verifyCallHandled()
        cy.verifyVoiceBilling()
      })
    })
    ```

#### 5.4 Launch Preparation (3 tasks)
**Priority**: HIGH | **Complexity**: MEDIUM

- [ ] **5.4.1** Monitoring & Alerts
  - **Effort**: 6-8 hours
  - **Tools**: Sentry, Datadog, or similar
  - **Alerts to Configure**:
    ```yaml
    alerts:
      - name: LLM Error Rate
        condition: error_rate > 5%
        action: notify_dev_team
      
      - name: Billing Discrepancy
        condition: estimated_cost != actual_cost (>10% diff)
        action: notify_finance_team
      
      - name: VAPI Failures
        condition: webhook_failures > 3 in 10min
        action: notify_ops_team
      
      - name: Low User Balance
        condition: balance < €5 AND no auto-topup
        action: notify_user_email
    ```

- [ ] **5.4.2** User Documentation
  - **Effort**: 12-16 hours
  - **Files to Create**:
    - `docs/BYOK_SETUP.md` - How to add your own API keys
    - `docs/FLOW_BUILDER_GUIDE.md` - Step-by-step workflow creation
    - `docs/VOICE_AGENT_TUTORIAL.md` - Setting up phone agents
    - `docs/BILLING_FAQ.md` - Pricing, discounts, payment
  - **Format**: Markdown with screenshots, videos

- [ ] **5.4.3** Beta Rollout
  - **Effort**: Ongoing (1-2 weeks)
  - **Steps**:
    1. Select 10-20 beta testers (mix of use cases)
    2. Send invitation with onboarding guide
    3. Set up feedback channel (Slack/Discord)
    4. Monitor usage and errors daily
    5. Weekly check-in calls
    6. Collect feedback survey
    7. Prioritize issues for hotfixes
    8. Iterate based on feedback

---

## 🚀 Recommended Execution Plan

### Week 1-2: Complete Phase 3 (UX)
- Day 1-2: Icon System (3.1.2)
- Day 3: Color Scheme (3.1.3)
- Day 4-6: Smart-Snap (3.2.1)
- Day 7-10: Auto-Complete (3.2.2)

### Week 3-4: Complete Phase 4 (VAPI)
- Day 11-12: Voice Agent Entity (4.1.1, 4.1.3)
- Day 13-15: VAPI Sync Service (4.1.2)
- Day 16-18: Phone Management (4.2.1, 4.2.2)
- Day 19-20: Webhook Handler (4.3.1, 4.3.2)

### Week 5-6: Complete Phase 5 (Testing & Launch)
- Day 21-24: Unit Tests (5.1.1, 5.1.2, 5.1.3)
- Day 25-28: Integration Tests (5.2.1, 5.2.2, 5.2.3)
- Day 29-30: Monitoring & Documentation (5.4.1, 5.4.2)
- Day 31+: Beta Rollout (5.4.3)

---

## 📝 Notes for Future Implementation

### Critical Dependencies
- VAPI API Key (required for Phase 4)
- Test phone numbers (for Phase 4 testing)
- Sentry/Monitoring account (for Phase 5.4.1)
- Beta tester list (for Phase 5.4.3)

### Known Technical Debt
- Icons currently use emoji - consider SVG for better scaling
- Node label mapping is static - consider making it user-customizable
- Templates are hardcoded - consider template marketplace in future

### Future Enhancements (Post-Launch)
- Multi-language support (English, French, Spanish)
- Custom node creation UI
- Workflow marketplace (share/sell templates)
- Advanced analytics dashboard
- Team collaboration features

---

**Last Updated**: January 2025  
**Maintained By**: M.A.T.E. Development Team  
**Contact**: For questions about remaining work, refer to design document at `.qoder/quests/security-audit-architecture-optimization.md`
