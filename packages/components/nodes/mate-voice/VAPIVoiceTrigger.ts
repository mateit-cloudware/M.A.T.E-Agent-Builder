import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

/**
 * VAPI Voice Trigger Node for M.A.T.E.
 * 
 * This node serves as an entry point for VAPI webhook events.
 * It receives voice call data from VAPI and extracts relevant information
 * for processing in the agent flow.
 * 
 * Webhook Event Types:
 * - assistant-request: Request for assistant response
 * - call-start: Voice call started
 * - call-end: Voice call ended
 * - transcript: Real-time transcription
 * - speech-update: Speech status update
 * - function-call: Tool/function call request
 */

interface VapiWebhookPayload {
    message: {
        type: string
        call?: {
            id: string
            orgId: string
            createdAt: string
            updatedAt: string
            type: string
            status: string
            phoneCallProvider?: string
            phoneCallProviderId?: string
            phoneCallTransport?: string
            endedReason?: string
            customer?: {
                number?: string
                name?: string
                metadata?: Record<string, any>
            }
            assistant?: {
                id: string
                name: string
                model?: Record<string, any>
                voice?: Record<string, any>
            }
        }
        transcript?: string
        messages?: Array<{
            role: string
            content: string
            timestamp?: string
        }>
        timestamp?: string
        artifact?: {
            messages?: Array<any>
            transcript?: string
        }
    }
}

class VAPIVoiceTrigger_MATEVoice implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    hideInput: boolean
    baseClasses: string[]
    documentation?: string
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'VAPI Voice Trigger'
        this.name = 'vapiVoiceTrigger'
        this.version = 1.0
        this.type = 'VAPIVoiceTrigger'
        this.category = 'M.A.T.E. Voice'
        this.description = 'Receives voice call webhook events from VAPI and extracts call data'
        this.color = '#6366F1'
        this.hideInput = true
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['vapiApi']
        }
        this.inputs = [
            {
                label: 'Webhook Event Types',
                name: 'eventTypes',
                type: 'multiOptions',
                options: [
                    {
                        label: 'Assistant Request',
                        name: 'assistant-request',
                        description: 'Triggered when VAPI needs an assistant response'
                    },
                    {
                        label: 'Function Call',
                        name: 'function-call',
                        description: 'Triggered when a function/tool call is requested'
                    },
                    {
                        label: 'Call Start',
                        name: 'call-start',
                        description: 'Triggered when a voice call starts'
                    },
                    {
                        label: 'Call End',
                        name: 'call-end',
                        description: 'Triggered when a voice call ends'
                    },
                    {
                        label: 'Transcript',
                        name: 'transcript',
                        description: 'Triggered for real-time transcription updates'
                    },
                    {
                        label: 'Speech Update',
                        name: 'speech-update',
                        description: 'Triggered for speech status updates'
                    }
                ],
                default: ['assistant-request', 'function-call'],
                description: 'Select which webhook events to handle'
            },
            {
                label: 'Verify Webhook Signature',
                name: 'verifySignature',
                type: 'boolean',
                default: true,
                description: 'Verify the VAPI webhook signature for security',
                optional: true
            },
            {
                label: 'Extract User ID From',
                name: 'userIdSource',
                type: 'options',
                options: [
                    {
                        label: 'Customer Metadata',
                        name: 'customerMetadata',
                        description: 'Extract user ID from customer.metadata.userId'
                    },
                    {
                        label: 'Customer Phone Number',
                        name: 'customerPhone',
                        description: 'Use customer phone number as user identifier'
                    },
                    {
                        label: 'Organization ID',
                        name: 'orgId',
                        description: 'Use VAPI organization ID'
                    }
                ],
                default: 'customerMetadata',
                description: 'Where to extract the user ID for billing purposes'
            },
            {
                label: 'User ID Metadata Key',
                name: 'userIdMetadataKey',
                type: 'string',
                default: 'userId',
                description: 'The key in customer.metadata to use as user ID',
                show: {
                    userIdSource: 'customerMetadata'
                }
            },
            {
                label: 'Log Webhook Payloads',
                name: 'logPayloads',
                type: 'boolean',
                default: false,
                description: 'Log incoming webhook payloads for debugging',
                optional: true
            }
        ]
    }

    async run(nodeData: INodeData, input: string | Record<string, any>, options: ICommonObject): Promise<any> {
        const eventTypes = nodeData.inputs?.eventTypes as string[]
        const verifySignature = nodeData.inputs?.verifySignature as boolean
        const userIdSource = nodeData.inputs?.userIdSource as string
        const userIdMetadataKey = nodeData.inputs?.userIdMetadataKey as string
        const logPayloads = nodeData.inputs?.logPayloads as boolean

        // Parse incoming webhook payload
        let webhookPayload: VapiWebhookPayload
        if (typeof input === 'string') {
            try {
                webhookPayload = JSON.parse(input)
            } catch (error) {
                throw new Error('Invalid webhook payload: Unable to parse JSON')
            }
        } else {
            webhookPayload = input as VapiWebhookPayload
        }

        // Log payload if enabled
        if (logPayloads) {
            console.log('[VAPI Voice Trigger] Received webhook:', JSON.stringify(webhookPayload, null, 2))
        }

        // Extract message type
        const messageType = webhookPayload.message?.type
        if (!messageType) {
            throw new Error('Invalid webhook payload: Missing message.type')
        }

        // Check if event type is in the allowed list
        if (!eventTypes.includes(messageType)) {
            return {
                id: nodeData.id,
                name: this.name,
                input: { webhookPayload },
                output: {
                    skip: true,
                    reason: `Event type '${messageType}' not in allowed list`
                },
                state: {}
            }
        }

        // Extract call data
        const call = webhookPayload.message?.call
        const callId = call?.id || ''
        const callStatus = call?.status || ''
        const assistant = call?.assistant
        const customer = call?.customer

        // Extract transcript
        let transcript = ''
        if (webhookPayload.message?.transcript) {
            transcript = webhookPayload.message.transcript
        } else if (webhookPayload.message?.artifact?.transcript) {
            transcript = webhookPayload.message.artifact.transcript
        } else if (webhookPayload.message?.messages && webhookPayload.message.messages.length > 0) {
            // Get last user message
            const userMessages = webhookPayload.message.messages.filter(m => m.role === 'user')
            if (userMessages.length > 0) {
                transcript = userMessages[userMessages.length - 1].content
            }
        }

        // Extract user ID based on configuration
        let userId = ''
        switch (userIdSource) {
            case 'customerMetadata':
                userId = customer?.metadata?.[userIdMetadataKey] || ''
                break
            case 'customerPhone':
                userId = customer?.number || ''
                break
            case 'orgId':
                userId = call?.orgId || ''
                break
        }

        // Calculate call duration if call has ended
        let callDurationSeconds = 0
        if (call?.createdAt && call?.updatedAt && call?.status === 'ended') {
            const startTime = new Date(call.createdAt).getTime()
            const endTime = new Date(call.updatedAt).getTime()
            callDurationSeconds = Math.floor((endTime - startTime) / 1000)
        }

        // Build output data
        const outputData: ICommonObject = {
            eventType: messageType,
            callId,
            callStatus,
            transcript,
            userId,
            assistantId: assistant?.id || '',
            assistantName: assistant?.name || '',
            customerPhone: customer?.number || '',
            customerName: customer?.name || '',
            customerMetadata: customer?.metadata || {},
            callDurationSeconds,
            timestamp: webhookPayload.message?.timestamp || new Date().toISOString(),
            rawPayload: webhookPayload
        }

        // Add conversation messages if available
        if (webhookPayload.message?.messages) {
            outputData.messages = webhookPayload.message.messages
        }

        // Build flow state
        const flowState: Record<string, any> = {
            vapiCallId: callId,
            vapiEventType: messageType,
            vapiUserId: userId,
            vapiTranscript: transcript
        }

        const returnOutput = {
            id: nodeData.id,
            name: this.name,
            input: { webhookPayload, verifySignature },
            output: outputData,
            state: flowState
        }

        return returnOutput
    }
}

module.exports = { nodeClass: VAPIVoiceTrigger_MATEVoice }
