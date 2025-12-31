import { ChatFlow } from './ChatFlow'
import { ChatMessage } from './ChatMessage'
import { ChatMessageFeedback } from './ChatMessageFeedback'
import { Credential } from './Credential'
import { Tool } from './Tool'
import { Assistant } from './Assistant'
import { Variable } from './Variable'
import { DocumentStore } from './DocumentStore'
import { DocumentStoreFileChunk } from './DocumentStoreFileChunk'
import { Lead } from './Lead'
import { UpsertHistory } from './UpsertHistory'
import { Dataset } from './Dataset'
import { DatasetRow } from './DatasetRow'
import { EvaluationRun } from './EvaluationRun'
import { Evaluation } from './Evaluation'
import { Evaluator } from './Evaluator'
import { ApiKey } from './ApiKey'
import { CustomTemplate } from './CustomTemplate'
import { Execution } from './Execution'
import { LoginActivity, WorkspaceShared, WorkspaceUsers } from '../../enterprise/database/entities/EnterpriseEntities'
import { User } from '../../enterprise/database/entities/user.entity'
import { Organization } from '../../enterprise/database/entities/organization.entity'
import { Role } from '../../enterprise/database/entities/role.entity'
import { OrganizationUser } from '../../enterprise/database/entities/organization-user.entity'
import { Workspace } from '../../enterprise/database/entities/workspace.entity'
import { WorkspaceUser } from '../../enterprise/database/entities/workspace-user.entity'
import { LoginMethod } from '../../enterprise/database/entities/login-method.entity'
import { LoginSession } from '../../enterprise/database/entities/login-session.entity'
import { Wallet } from '../../enterprise/database/entities/wallet.entity'
import { WalletTransaction } from '../../enterprise/database/entities/wallet-transaction.entity'
import { CallTranscription } from '../../enterprise/database/entities/call-transcription.entity'
import { TokenUsage } from '../../enterprise/database/entities/token-usage.entity'
import { UsageRecord } from '../../enterprise/database/entities/usage-record.entity'
import { SystemConfig } from '../../enterprise/database/entities/system-config.entity'
import { AuditLog } from '../../enterprise/database/entities/audit-log.entity'
import { GuardrailConfig, GuardrailAuditLog } from '../../enterprise/database/entities/guardrail.entity'
import { ConsentRecord, DataExportRequest, DeletionRequest, ProcessingRestriction } from '../../enterprise/database/entities/gdpr.entity'

export const entities = {
    ChatFlow,
    ChatMessage,
    ChatMessageFeedback,
    Credential,
    Tool,
    Assistant,
    Variable,
    UpsertHistory,
    DocumentStore,
    DocumentStoreFileChunk,
    Lead,
    Dataset,
    DatasetRow,
    Evaluation,
    EvaluationRun,
    Evaluator,
    ApiKey,
    User,
    WorkspaceUsers,
    LoginActivity,
    WorkspaceShared,
    CustomTemplate,
    Execution,
    Organization,
    Role,
    OrganizationUser,
    Workspace,
    WorkspaceUser,
    LoginMethod,
    LoginSession,
    Wallet,
    WalletTransaction,
    CallTranscription,
    TokenUsage,
    UsageRecord,
    SystemConfig,
    AuditLog,
    GuardrailConfig,
    GuardrailAuditLog,
    ConsentRecord,
    DataExportRequest,
    DeletionRequest,
    ProcessingRestriction
}
