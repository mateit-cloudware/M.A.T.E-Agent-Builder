import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

/**
 * VAPI Voice Response Node for M.A.T.E.
 * 
 * This node formats responses to be sent back to VAPI.
 * It handles different response types including:
 * - Text responses (converted to speech by VAPI)
 * - Assistant responses with metadata
 * - Function call results
 * - Call control commands (transfer, end call, etc.)
 */

interface VapiResponse {
    messageResponse?: {
        content: string
        endCallAfterSpoken?: boolean
        forwardToPhoneNumber?: string
    }
    assistantResponse?: {
        content: string
        metadata?: Record<string, any>
    }
    functionCallResult?: {
        name: string
        result: any
        error?: string
    }
}

class VAPIVoiceResponse_MATEVoice implements INode {
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
        this.label = 'VAPI Voice Response'
        this.name = 'vapiVoiceResponse'
        this.version = 1.0
        this.type = 'VAPIVoiceResponse'
        this.category = 'M.A.T.E. Voice'
        this.description = 'Formats and sends responses back to VAPI voice calls'
        this.color = '#10B981'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Response Content',
                name: 'responseContent',
                type: 'string',
                description: 'The text content to speak back to the caller',
                rows: 4,
                acceptVariable: true
            },
            {
                label: 'Response Type',
                name: 'responseType',
                type: 'options',
                options: [
                    {
                        label: 'Message Response',
                        name: 'message',
                        description: 'Standard text response to be spoken'
                    },
                    {
                        label: 'Assistant Response',
                        name: 'assistant',
                        description: 'Response with assistant metadata'
                    },
                    {
                        label: 'Function Call Result',
                        name: 'functionResult',
                        description: 'Result of a function/tool call'
                    }
                ],
                default: 'message',
                description: 'Type of response to send to VAPI'
            },
            {
                label: 'Function Name',
                name: 'functionName',
                type: 'string',
                description: 'Name of the function that was called',
                show: {
                    responseType: 'functionResult'
                },
                acceptVariable: true
            },
            {
                label: 'Function Result',
                name: 'functionResult',
                type: 'json',
                description: 'The result object to return for the function call',
                show: {
                    responseType: 'functionResult'
                },
                acceptVariable: true
            },
            {
                label: 'End Call After Speaking',
                name: 'endCallAfterSpoken',
                type: 'boolean',
                default: false,
                description: 'End the call after this message is spoken',
                optional: true,
                show: {
                    responseType: 'message'
                }
            },
            {
                label: 'Transfer to Phone Number',
                name: 'forwardToPhoneNumber',
                type: 'string',
                description: 'Phone number to transfer the call to (E.164 format)',
                optional: true,
                placeholder: '+491234567890',
                show: {
                    responseType: 'message'
                }
            },
            {
                label: 'Include Metadata',
                name: 'includeMetadata',
                type: 'boolean',
                default: false,
                description: 'Include additional metadata in the response',
                optional: true
            },
            {
                label: 'Metadata',
                name: 'metadata',
                type: 'json',
                description: 'Additional metadata to include in the response',
                show: {
                    includeMetadata: true
                },
                optional: true
            },
            {
                label: 'SSML Enabled',
                name: 'ssmlEnabled',
                type: 'boolean',
                default: false,
                description: 'Enable SSML (Speech Synthesis Markup Language) for advanced speech control',
                optional: true
            }
        ]
    }

    async run(nodeData: INodeData, input: string | Record<string, any>, options: ICommonObject): Promise<any> {
        const responseContent = nodeData.inputs?.responseContent as string
        const responseType = nodeData.inputs?.responseType as string
        const functionName = nodeData.inputs?.functionName as string
        const functionResult = nodeData.inputs?.functionResult as any
        const endCallAfterSpoken = nodeData.inputs?.endCallAfterSpoken as boolean
        const forwardToPhoneNumber = nodeData.inputs?.forwardToPhoneNumber as string
        const includeMetadata = nodeData.inputs?.includeMetadata as boolean
        const metadata = nodeData.inputs?.metadata as Record<string, any>
        const ssmlEnabled = nodeData.inputs?.ssmlEnabled as boolean

        // Get runtime state
        const state = options.agentflowRuntime?.state as ICommonObject || {}

        // Process response content
        let content = responseContent || ''
        
        // If content came from previous node
        if (!content && typeof input === 'object' && input.output?.content) {
            content = input.output.content
        } else if (!content && typeof input === 'string') {
            content = input
        }

        // Build VAPI response based on type
        let vapiResponse: VapiResponse = {}

        switch (responseType) {
            case 'message':
                vapiResponse.messageResponse = {
                    content: content
                }
                if (endCallAfterSpoken) {
                    vapiResponse.messageResponse.endCallAfterSpoken = true
                }
                if (forwardToPhoneNumber) {
                    vapiResponse.messageResponse.forwardToPhoneNumber = forwardToPhoneNumber
                }
                break

            case 'assistant':
                vapiResponse.assistantResponse = {
                    content: content
                }
                if (includeMetadata && metadata) {
                    vapiResponse.assistantResponse.metadata = metadata
                }
                break

            case 'functionResult':
                let parsedResult = functionResult
                if (typeof functionResult === 'string') {
                    try {
                        parsedResult = JSON.parse(functionResult)
                    } catch (e) {
                        parsedResult = { value: functionResult }
                    }
                }
                vapiResponse.functionCallResult = {
                    name: functionName || 'unknown',
                    result: parsedResult
                }
                break
        }

        // Build output data
        const outputData: ICommonObject = {
            response: vapiResponse,
            content: content,
            responseType: responseType,
            ssmlEnabled: ssmlEnabled,
            callId: state.vapiCallId || '',
            userId: state.vapiUserId || ''
        }

        if (includeMetadata && metadata) {
            outputData.metadata = metadata
        }

        // Update flow state with response info
        const updatedState = {
            ...state,
            vapiLastResponse: content,
            vapiResponseType: responseType
        }

        const returnOutput = {
            id: nodeData.id,
            name: this.name,
            input: { responseContent, responseType },
            output: outputData,
            state: updatedState
        }

        return returnOutput
    }
}

module.exports = { nodeClass: VAPIVoiceResponse_MATEVoice }
