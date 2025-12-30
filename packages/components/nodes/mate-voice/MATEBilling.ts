import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

/**
 * M.A.T.E. Billing Node for Agent Flows
 * 
 * This node integrates with the M.A.T.E. billing system to:
 * - Check wallet balance before operations
 * - Charge for voice usage (per minute)
 * - Charge for LLM/token usage
 * - Log billing events
 * 
 * Pricing:
 * - Voice: €1.50 per minute (2.5 cents per second)
 * - LLM: €0.03 per 1000 tokens
 */

interface BillingResult {
    success: boolean
    costCents: number
    costEur: number
    balanceAfterCents: number
    balanceAfterEur: number
    transactionId: string
    error?: string
}

class MATEBilling_MATEVoice implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    baseClasses: string[]
    documentation?: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'M.A.T.E. Billing'
        this.name = 'mateBilling'
        this.version = 1.0
        this.type = 'MATEBilling'
        this.category = 'M.A.T.E. Voice'
        this.description = 'Charge users for voice and LLM usage with the M.A.T.E. billing system'
        this.color = '#DC2626'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Billing Action',
                name: 'billingAction',
                type: 'options',
                options: [
                    {
                        label: 'Check Balance',
                        name: 'checkBalance',
                        description: 'Check if user has sufficient balance'
                    },
                    {
                        label: 'Charge Voice Usage',
                        name: 'chargeVoice',
                        description: 'Charge for voice call duration'
                    },
                    {
                        label: 'Charge LLM Usage',
                        name: 'chargeLLM',
                        description: 'Charge for LLM token usage'
                    },
                    {
                        label: 'Estimate Cost',
                        name: 'estimateCost',
                        description: 'Calculate estimated cost without charging'
                    }
                ],
                default: 'chargeVoice',
                description: 'Type of billing action to perform'
            },
            {
                label: 'User ID',
                name: 'userId',
                type: 'string',
                description: 'The user ID for billing. Can be retrieved from VAPI Voice Trigger.',
                acceptVariable: true,
                placeholder: '{{ $vapiUserId }}'
            },
            {
                label: 'Voice Duration (Seconds)',
                name: 'voiceSeconds',
                type: 'number',
                description: 'Duration of voice call in seconds',
                default: 0,
                show: {
                    billingAction: ['chargeVoice', 'estimateCost']
                },
                acceptVariable: true
            },
            {
                label: 'LLM Tokens',
                name: 'llmTokens',
                type: 'number',
                description: 'Number of LLM tokens used',
                default: 0,
                show: {
                    billingAction: ['chargeLLM', 'estimateCost']
                },
                acceptVariable: true
            },
            {
                label: 'Call ID',
                name: 'callId',
                type: 'string',
                description: 'VAPI call ID for tracking',
                optional: true,
                acceptVariable: true,
                show: {
                    billingAction: ['chargeVoice', 'chargeLLM']
                }
            },
            {
                label: 'Chatflow ID',
                name: 'chatflowId',
                type: 'string',
                description: 'Chatflow ID for tracking',
                optional: true,
                acceptVariable: true,
                show: {
                    billingAction: ['chargeVoice', 'chargeLLM']
                }
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'string',
                description: 'Name of the LLM model used',
                optional: true,
                acceptVariable: true,
                show: {
                    billingAction: 'chargeLLM'
                }
            },
            {
                label: 'Minimum Required Balance (EUR)',
                name: 'minimumBalance',
                type: 'number',
                description: 'Minimum balance required to continue (for balance check)',
                default: 0.50,
                show: {
                    billingAction: 'checkBalance'
                }
            },
            {
                label: 'Block on Insufficient Balance',
                name: 'blockOnInsufficient',
                type: 'boolean',
                description: 'Stop execution if balance is insufficient',
                default: true,
                optional: true,
                show: {
                    billingAction: 'checkBalance'
                }
            },
            {
                label: 'Log Billing Events',
                name: 'logBillingEvents',
                type: 'boolean',
                description: 'Log billing events for debugging',
                default: false,
                optional: true
            }
        ]
    }

    async run(nodeData: INodeData, input: string | Record<string, any>, options: ICommonObject): Promise<any> {
        const billingAction = nodeData.inputs?.billingAction as string
        const userId = nodeData.inputs?.userId as string
        const voiceSeconds = nodeData.inputs?.voiceSeconds as number || 0
        const llmTokens = nodeData.inputs?.llmTokens as number || 0
        const callId = nodeData.inputs?.callId as string
        const chatflowId = nodeData.inputs?.chatflowId as string || options.chatflowid
        const modelName = nodeData.inputs?.modelName as string
        const minimumBalance = nodeData.inputs?.minimumBalance as number || 0.50
        const blockOnInsufficient = nodeData.inputs?.blockOnInsufficient as boolean
        const logBillingEvents = nodeData.inputs?.logBillingEvents as boolean

        // Get runtime state
        const state = options.agentflowRuntime?.state as ICommonObject || {}

        // Resolve userId from state if not provided
        let resolvedUserId = userId
        if (!resolvedUserId && state.vapiUserId) {
            resolvedUserId = state.vapiUserId
        }

        if (!resolvedUserId) {
            throw new Error('User ID is required for billing operations')
        }

        // Pricing constants (in cents)
        const VOICE_CENTS_PER_SECOND = 2.5  // €1.50 per minute
        const LLM_CENTS_PER_1K_TOKENS = 3   // €0.03 per 1000 tokens

        let result: BillingResult = {
            success: false,
            costCents: 0,
            costEur: 0,
            balanceAfterCents: 0,
            balanceAfterEur: 0,
            transactionId: ''
        }

        try {
            // Access wallet service through options
            const appServer = options.appServer
            
            switch (billingAction) {
                case 'checkBalance':
                    result = await this.checkBalance(resolvedUserId, minimumBalance, options)
                    if (!result.success && blockOnInsufficient) {
                        throw new Error(`Insufficient balance. Required: €${minimumBalance.toFixed(2)}, Available: €${result.balanceAfterEur.toFixed(2)}`)
                    }
                    break

                case 'chargeVoice':
                    const voiceCost = Math.ceil(voiceSeconds * VOICE_CENTS_PER_SECOND)
                    result = await this.chargeUsage(
                        resolvedUserId,
                        voiceCost,
                        'VOICE',
                        { voiceSeconds, callId, chatflowId },
                        options
                    )
                    break

                case 'chargeLLM':
                    const llmCost = Math.ceil((llmTokens / 1000) * LLM_CENTS_PER_1K_TOKENS)
                    result = await this.chargeUsage(
                        resolvedUserId,
                        llmCost,
                        'LLM',
                        { tokensUsed: llmTokens, modelName, chatflowId },
                        options
                    )
                    break

                case 'estimateCost':
                    const estimatedVoiceCost = Math.ceil(voiceSeconds * VOICE_CENTS_PER_SECOND)
                    const estimatedLLMCost = Math.ceil((llmTokens / 1000) * LLM_CENTS_PER_1K_TOKENS)
                    const totalEstimate = estimatedVoiceCost + estimatedLLMCost
                    result = {
                        success: true,
                        costCents: totalEstimate,
                        costEur: totalEstimate / 100,
                        balanceAfterCents: 0,
                        balanceAfterEur: 0,
                        transactionId: 'ESTIMATE'
                    }
                    break
            }

            if (logBillingEvents) {
                console.log(`[M.A.T.E. Billing] Action: ${billingAction}, User: ${resolvedUserId}, Result:`, result)
            }

        } catch (error: any) {
            result.error = error.message
            if (logBillingEvents) {
                console.error(`[M.A.T.E. Billing] Error:`, error.message)
            }
            
            if (billingAction !== 'estimateCost') {
                throw error
            }
        }

        // Build output
        const outputData: ICommonObject = {
            action: billingAction,
            userId: resolvedUserId,
            success: result.success,
            costCents: result.costCents,
            costEur: result.costEur.toFixed(2),
            balanceAfterCents: result.balanceAfterCents,
            balanceAfterEur: result.balanceAfterEur.toFixed(2),
            transactionId: result.transactionId
        }

        if (billingAction === 'chargeVoice') {
            outputData.voiceSeconds = voiceSeconds
            outputData.voiceMinutes = (voiceSeconds / 60).toFixed(2)
        }

        if (billingAction === 'chargeLLM') {
            outputData.llmTokens = llmTokens
            outputData.modelName = modelName
        }

        if (result.error) {
            outputData.error = result.error
        }

        // Update flow state with billing info
        const updatedState = {
            ...state,
            lastBillingAction: billingAction,
            lastBillingCostCents: result.costCents,
            lastBillingSuccess: result.success,
            currentBalanceCents: result.balanceAfterCents
        }

        return {
            id: nodeData.id,
            name: this.name,
            input: { billingAction, userId: resolvedUserId },
            output: outputData,
            state: updatedState
        }
    }

    private async checkBalance(
        userId: string,
        minimumBalanceEur: number,
        options: ICommonObject
    ): Promise<BillingResult> {
        // Import WalletService dynamically to access it
        try {
            // Import from server package - path adjusted for components package
            const { WalletService } = await import('@flowise/server/src/enterprise/services/wallet.service')
            const walletService = new WalletService()
            const balance = await walletService.getWalletBalance(userId)

            const minimumBalanceCents = Math.ceil(minimumBalanceEur * 100)
            const hasBalance = balance.balanceCents >= minimumBalanceCents

            return {
                success: hasBalance,
                costCents: 0,
                costEur: 0,
                balanceAfterCents: balance.balanceCents,
                balanceAfterEur: balance.balanceEur,
                transactionId: ''
            }
        } catch (error: any) {
            // If wallet service is not available, return insufficient balance
            return {
                success: false,
                costCents: 0,
                costEur: 0,
                balanceAfterCents: 0,
                balanceAfterEur: 0,
                transactionId: '',
                error: error.message
            }
        }
    }

    private async chargeUsage(
        userId: string,
        costCents: number,
        usageType: 'VOICE' | 'LLM',
        metadata: ICommonObject,
        options: ICommonObject
    ): Promise<BillingResult> {
        if (costCents <= 0) {
            return {
                success: true,
                costCents: 0,
                costEur: 0,
                balanceAfterCents: 0,
                balanceAfterEur: 0,
                transactionId: 'NO_CHARGE'
            }
        }

        try {
            const { WalletService } = await import('@flowise/server/src/enterprise/services/wallet.service')
            const { UsageType: UsageTypeEnum } = await import('@flowise/server/src/enterprise/database/entities/wallet-transaction.entity')
            
            const walletService = new WalletService()
            
            let result
            if (usageType === 'VOICE') {
                result = await walletService.chargeVoiceUsage(
                    userId,
                    metadata.voiceSeconds,
                    metadata.callId,
                    metadata.chatflowId
                )
            } else {
                result = await walletService.chargeLLMUsage(
                    userId,
                    metadata.tokensUsed,
                    metadata.modelName,
                    metadata.chatflowId
                )
            }

            return {
                success: true,
                costCents: result.costCents,
                costEur: result.costCents / 100,
                balanceAfterCents: result.newBalance,
                balanceAfterEur: result.newBalance / 100,
                transactionId: result.transactionId
            }
        } catch (error: any) {
            return {
                success: false,
                costCents: costCents,
                costEur: costCents / 100,
                balanceAfterCents: 0,
                balanceAfterEur: 0,
                transactionId: '',
                error: error.message
            }
        }
    }
}

module.exports = { nodeClass: MATEBilling_MATEVoice }
