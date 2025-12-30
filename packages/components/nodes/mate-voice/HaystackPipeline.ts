import { ICommonObject, INode, INodeData, INodeParams } from '../../src/Interface'

/**
 * Haystack Pipeline Integration Node for M.A.T.E.
 * 
 * This node connects to external Haystack pipelines for advanced
 * document processing and RAG capabilities. Features:
 * - Connect to self-hosted Haystack services
 * - Execute predefined pipelines
 * - Custom query parameters
 * - Streaming support
 */

interface HaystackPipelineResult {
    answer: string
    documents?: Array<{
        content: string
        meta?: Record<string, any>
        score?: number
    }>
    meta?: Record<string, any>
}

class HaystackPipeline_MATEVoice implements INode {
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
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Haystack Pipeline'
        this.name = 'haystackPipeline'
        this.version = 1.0
        this.type = 'HaystackPipeline'
        this.category = 'M.A.T.E. Voice'
        this.description = 'Execute Haystack pipelines for advanced document processing and RAG'
        this.color = '#7C3AED'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['httpBearerToken', 'httpApiKey'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Haystack API URL',
                name: 'apiUrl',
                type: 'string',
                description: 'URL of your Haystack REST API endpoint',
                placeholder: 'https://your-haystack-api.com/query'
            },
            {
                label: 'Pipeline Name',
                name: 'pipelineName',
                type: 'string',
                description: 'Name of the Haystack pipeline to execute',
                default: 'query',
                optional: true
            },
            {
                label: 'Query Input',
                name: 'queryInput',
                type: 'string',
                description: 'The query or question to send to the pipeline',
                rows: 4,
                acceptVariable: true
            },
            {
                label: 'Query Type',
                name: 'queryType',
                type: 'options',
                options: [
                    {
                        label: 'Question Answering',
                        name: 'qa',
                        description: 'Standard Q&A pipeline'
                    },
                    {
                        label: 'Document Retrieval',
                        name: 'retrieval',
                        description: 'Only retrieve relevant documents'
                    },
                    {
                        label: 'Generative QA (RAG)',
                        name: 'rag',
                        description: 'Retrieve and generate answer'
                    },
                    {
                        label: 'Custom',
                        name: 'custom',
                        description: 'Custom pipeline parameters'
                    }
                ],
                default: 'rag',
                description: 'Type of query to execute'
            },
            {
                label: 'Top K Documents',
                name: 'topK',
                type: 'number',
                default: 5,
                description: 'Number of documents to retrieve',
                optional: true,
                show: {
                    queryType: ['retrieval', 'rag', 'qa']
                }
            },
            {
                label: 'Custom Parameters',
                name: 'customParams',
                type: 'json',
                description: 'Additional parameters to send to the pipeline',
                optional: true,
                show: {
                    queryType: 'custom'
                }
            },
            {
                label: 'Filters',
                name: 'filters',
                type: 'json',
                description: 'Document filters (e.g., {"category": "voice"})',
                optional: true
            },
            {
                label: 'Include Documents',
                name: 'includeDocuments',
                type: 'boolean',
                default: false,
                description: 'Include source documents in output',
                optional: true
            },
            {
                label: 'Timeout (seconds)',
                name: 'timeout',
                type: 'number',
                default: 30,
                description: 'Request timeout in seconds',
                optional: true
            },
            {
                label: 'Retry on Failure',
                name: 'retryOnFailure',
                type: 'boolean',
                default: true,
                description: 'Retry the request if it fails',
                optional: true
            }
        ]
    }

    async run(nodeData: INodeData, input: string | Record<string, any>, options: ICommonObject): Promise<any> {
        const apiUrl = nodeData.inputs?.apiUrl as string
        const pipelineName = nodeData.inputs?.pipelineName as string || 'query'
        let queryInput = nodeData.inputs?.queryInput as string
        const queryType = nodeData.inputs?.queryType as string
        const topK = nodeData.inputs?.topK as number || 5
        const customParams = nodeData.inputs?.customParams as ICommonObject
        const filters = nodeData.inputs?.filters as ICommonObject
        const includeDocuments = nodeData.inputs?.includeDocuments as boolean
        const timeout = nodeData.inputs?.timeout as number || 30
        const retryOnFailure = nodeData.inputs?.retryOnFailure as boolean

        // Get query from previous node if not provided
        const state = options.agentflowRuntime?.state as ICommonObject || {}
        if (!queryInput) {
            if (typeof input === 'object' && input.output?.transcript) {
                queryInput = input.output.transcript
            } else if (typeof input === 'object' && input.output?.content) {
                queryInput = input.output.content
            } else if (typeof input === 'string') {
                queryInput = input
            } else if (state.vapiTranscript) {
                queryInput = state.vapiTranscript
            }
        }

        if (!queryInput) {
            throw new Error('Query input is required')
        }

        if (!apiUrl) {
            throw new Error('Haystack API URL is required')
        }

        // Get credentials if provided
        let headers: Record<string, string> = {
            'Content-Type': 'application/json'
        }

        const credentialData = await this.getCredentialData(nodeData, options)
        if (credentialData?.httpBearerToken) {
            headers['Authorization'] = `Bearer ${credentialData.httpBearerToken}`
        } else if (credentialData?.httpApiKey) {
            headers['X-API-Key'] = credentialData.httpApiKey
        }

        // Build request body based on query type
        let requestBody: ICommonObject = {
            query: queryInput
        }

        switch (queryType) {
            case 'qa':
            case 'rag':
                requestBody.params = {
                    Retriever: { top_k: topK },
                    Reader: { top_k: topK }
                }
                break
            case 'retrieval':
                requestBody.params = {
                    Retriever: { top_k: topK }
                }
                break
            case 'custom':
                if (customParams) {
                    requestBody = { ...requestBody, ...customParams }
                }
                break
        }

        if (filters) {
            requestBody.filters = filters
        }

        // Execute request with retry logic
        let result: HaystackPipelineResult | null = null
        let lastError: Error | null = null
        const maxRetries = retryOnFailure ? 3 : 1

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), timeout * 1000)

                // Build final URL
                const url = apiUrl.includes(pipelineName) 
                    ? apiUrl 
                    : `${apiUrl.replace(/\/$/, '')}/${pipelineName}`

                const response = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                })

                clearTimeout(timeoutId)

                if (!response.ok) {
                    const errorText = await response.text()
                    throw new Error(`Haystack API error: ${response.status} - ${errorText}`)
                }

                const responseData = await response.json()

                // Parse Haystack response format
                result = this.parseHaystackResponse(responseData, queryType)
                break

            } catch (error: any) {
                lastError = error
                
                if (attempt < maxRetries) {
                    // Wait before retry with exponential backoff
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
                }
            }
        }

        if (!result && lastError) {
            throw new Error(`Haystack pipeline failed after ${maxRetries} attempts: ${lastError.message}`)
        }

        // Build output
        const outputData: ICommonObject = {
            answer: result?.answer || '',
            query: queryInput,
            pipelineName,
            queryType
        }

        if (includeDocuments && result?.documents) {
            outputData.documents = result.documents
            outputData.documentCount = result.documents.length
        }

        if (result?.meta) {
            outputData.meta = result.meta
        }

        // Update flow state
        const updatedState = {
            ...state,
            lastHaystackQuery: queryInput,
            lastHaystackAnswer: result?.answer || ''
        }

        return {
            id: nodeData.id,
            name: this.name,
            input: { queryInput, pipelineName },
            output: outputData,
            state: updatedState
        }
    }

    private parseHaystackResponse(response: any, queryType: string): HaystackPipelineResult {
        // Handle different Haystack response formats
        let answer = ''
        let documents: HaystackPipelineResult['documents'] = []

        // Standard Haystack 2.x format
        if (response.answers && response.answers.length > 0) {
            answer = response.answers[0].answer || response.answers[0].data || ''
            
            if (response.answers[0].document) {
                documents.push({
                    content: response.answers[0].document.content,
                    meta: response.answers[0].document.meta,
                    score: response.answers[0].score
                })
            }
        }

        // Check for generated answer (RAG)
        if (response.llm && response.llm.replies) {
            answer = response.llm.replies[0] || ''
        }

        // Check for documents in retriever output
        if (response.documents) {
            documents = response.documents.map((doc: any) => ({
                content: doc.content || doc.text || '',
                meta: doc.meta || doc.metadata || {},
                score: doc.score
            }))
        }

        // Retriever output format
        if (response.retriever && response.retriever.documents) {
            documents = response.retriever.documents.map((doc: any) => ({
                content: doc.content || doc.text || '',
                meta: doc.meta || {},
                score: doc.score
            }))
        }

        // For retrieval-only queries, concatenate document contents
        if (queryType === 'retrieval' && !answer && documents && documents.length > 0) {
            answer = documents.map(d => d.content).join('\n\n')
        }

        return {
            answer,
            documents,
            meta: response.meta || response._debug || {}
        }
    }

    private async getCredentialData(nodeData: INodeData, options: ICommonObject): Promise<ICommonObject | null> {
        const credentialId = nodeData.credential
        if (!credentialId) {
            return null
        }

        const appDataSource = options.appDataSource
        const databaseEntities = options.databaseEntities

        if (!appDataSource || !databaseEntities) {
            return null
        }

        try {
            const credential = await appDataSource.getRepository(databaseEntities['Credential']).findOneBy({
                id: credentialId
            })

            if (credential?.encryptedData) {
                return JSON.parse(credential.encryptedData)
            }
        } catch (error) {
            // Credential not found or parse error
        }

        return null
    }
}

module.exports = { nodeClass: HaystackPipeline_MATEVoice }
