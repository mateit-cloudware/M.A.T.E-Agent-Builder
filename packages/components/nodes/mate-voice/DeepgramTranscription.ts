import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

/**
 * Deepgram Voice Transcription Node for M.A.T.E.
 * 
 * This node provides real-time and batch transcription capabilities
 * using the Deepgram API. Features include:
 * - Multiple language support
 * - Speaker diarization
 * - Custom vocabulary
 * - Smart formatting
 * - Punctuation
 */

class DeepgramTranscription_MATEVoice implements INode {
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
        this.label = 'Deepgram Transcription'
        this.name = 'deepgramTranscription'
        this.version = 1.0
        this.type = 'DeepgramTranscription'
        this.category = 'M.A.T.E. Voice'
        this.description = 'Convert speech to text using Deepgram AI'
        this.color = '#13EF93'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['deepgramApi']
        }
        this.inputs = [
            {
                label: 'Audio Input',
                name: 'audioInput',
                type: 'options',
                options: [
                    {
                        label: 'URL',
                        name: 'url',
                        description: 'Transcribe audio from a URL'
                    },
                    {
                        label: 'Base64',
                        name: 'base64',
                        description: 'Transcribe base64 encoded audio'
                    },
                    {
                        label: 'From Previous Node',
                        name: 'previous',
                        description: 'Use audio data from previous node'
                    }
                ],
                default: 'previous',
                description: 'Source of the audio to transcribe'
            },
            {
                label: 'Audio URL',
                name: 'audioUrl',
                type: 'string',
                description: 'URL of the audio file to transcribe',
                show: {
                    audioInput: 'url'
                },
                acceptVariable: true
            },
            {
                label: 'Audio Base64',
                name: 'audioBase64',
                type: 'string',
                description: 'Base64 encoded audio data',
                show: {
                    audioInput: 'base64'
                },
                acceptVariable: true
            },
            {
                label: 'Model',
                name: 'model',
                type: 'options',
                options: [
                    {
                        label: 'Nova-2 (Best)',
                        name: 'nova-2',
                        description: 'Most accurate, lowest latency'
                    },
                    {
                        label: 'Nova',
                        name: 'nova',
                        description: 'High accuracy'
                    },
                    {
                        label: 'Enhanced',
                        name: 'enhanced',
                        description: 'Good balance of speed and accuracy'
                    },
                    {
                        label: 'Base',
                        name: 'base',
                        description: 'Fastest, basic accuracy'
                    },
                    {
                        label: 'Whisper (Large)',
                        name: 'whisper-large',
                        description: 'OpenAI Whisper Large model'
                    },
                    {
                        label: 'Whisper (Medium)',
                        name: 'whisper-medium',
                        description: 'OpenAI Whisper Medium model'
                    }
                ],
                default: 'nova-2',
                description: 'Deepgram model to use for transcription'
            },
            {
                label: 'Language',
                name: 'language',
                type: 'options',
                options: [
                    { label: 'English', name: 'en' },
                    { label: 'German', name: 'de' },
                    { label: 'French', name: 'fr' },
                    { label: 'Spanish', name: 'es' },
                    { label: 'Italian', name: 'it' },
                    { label: 'Dutch', name: 'nl' },
                    { label: 'Portuguese', name: 'pt' },
                    { label: 'Japanese', name: 'ja' },
                    { label: 'Chinese', name: 'zh' },
                    { label: 'Korean', name: 'ko' },
                    { label: 'Auto Detect', name: 'auto' }
                ],
                default: 'de',
                description: 'Language of the audio'
            },
            {
                label: 'Smart Formatting',
                name: 'smartFormat',
                type: 'boolean',
                default: true,
                description: 'Apply smart formatting to numbers, dates, etc.',
                optional: true
            },
            {
                label: 'Punctuation',
                name: 'punctuate',
                type: 'boolean',
                default: true,
                description: 'Add punctuation to the transcript',
                optional: true
            },
            {
                label: 'Speaker Diarization',
                name: 'diarize',
                type: 'boolean',
                default: false,
                description: 'Identify different speakers',
                optional: true
            },
            {
                label: 'Paragraphs',
                name: 'paragraphs',
                type: 'boolean',
                default: false,
                description: 'Split transcript into paragraphs',
                optional: true
            },
            {
                label: 'Custom Vocabulary',
                name: 'keywords',
                type: 'string',
                description: 'Comma-separated list of words to boost recognition',
                optional: true,
                placeholder: 'M.A.T.E., Flowise, Agent Builder'
            },
            {
                label: 'Include Word Timestamps',
                name: 'includeTimestamps',
                type: 'boolean',
                default: false,
                description: 'Include timestamps for each word',
                optional: true
            }
        ]
    }

    async run(nodeData: INodeData, input: string | Record<string, any>, options: ICommonObject): Promise<any> {
        const credentialData = await this.getCredentialData(nodeData, options)
        const apiKey = credentialData?.deepgramApiKey as string

        if (!apiKey) {
            throw new Error('Deepgram API key is required')
        }

        const audioInput = nodeData.inputs?.audioInput as string
        const audioUrl = nodeData.inputs?.audioUrl as string
        const audioBase64 = nodeData.inputs?.audioBase64 as string
        const model = nodeData.inputs?.model as string
        const language = nodeData.inputs?.language as string
        const smartFormat = nodeData.inputs?.smartFormat as boolean
        const punctuate = nodeData.inputs?.punctuate as boolean
        const diarize = nodeData.inputs?.diarize as boolean
        const paragraphs = nodeData.inputs?.paragraphs as boolean
        const keywords = nodeData.inputs?.keywords as string
        const includeTimestamps = nodeData.inputs?.includeTimestamps as boolean

        // Get audio data based on input type
        let audioData: string | undefined
        let mimeType = 'audio/wav'

        switch (audioInput) {
            case 'url':
                audioData = audioUrl
                break
            case 'base64':
                audioData = audioBase64
                break
            case 'previous':
                if (typeof input === 'object' && input.output?.audioBase64) {
                    audioData = input.output.audioBase64
                    mimeType = input.output.mimeType || 'audio/wav'
                }
                break
        }

        // Build query parameters
        const params = new URLSearchParams({
            model: model || 'nova-2',
            smart_format: String(smartFormat !== false),
            punctuate: String(punctuate !== false)
        })

        if (language && language !== 'auto') {
            params.append('language', language)
        } else {
            params.append('detect_language', 'true')
        }

        if (diarize) {
            params.append('diarize', 'true')
        }

        if (paragraphs) {
            params.append('paragraphs', 'true')
        }

        if (keywords) {
            const keywordList = keywords.split(',').map(k => k.trim())
            for (const keyword of keywordList) {
                params.append('keywords', keyword)
            }
        }

        if (includeTimestamps) {
            params.append('utterances', 'true')
        }

        // Call Deepgram API
        let transcriptResult: any
        try {
            const baseUrl = 'https://api.deepgram.com/v1/listen'
            const url = `${baseUrl}?${params.toString()}`

            let requestBody: any
            let contentType: string

            if (audioInput === 'url') {
                requestBody = JSON.stringify({ url: audioData })
                contentType = 'application/json'
            } else {
                // For base64, decode and send as binary
                requestBody = Buffer.from(audioData || '', 'base64')
                contentType = mimeType
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${apiKey}`,
                    'Content-Type': contentType
                },
                body: requestBody
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Deepgram API error: ${response.status} - ${errorText}`)
            }

            transcriptResult = await response.json()
        } catch (error: any) {
            throw new Error(`Transcription failed: ${error.message}`)
        }

        // Extract transcript from response
        const transcript = transcriptResult?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
        const confidence = transcriptResult?.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0
        const words = transcriptResult?.results?.channels?.[0]?.alternatives?.[0]?.words || []
        const detectedLanguage = transcriptResult?.results?.channels?.[0]?.detected_language || language

        // Build output
        const outputData: ICommonObject = {
            transcript,
            confidence,
            detectedLanguage,
            model,
            wordCount: words.length,
            duration: transcriptResult?.metadata?.duration || 0
        }

        if (includeTimestamps) {
            outputData.words = words
        }

        if (diarize) {
            outputData.speakers = this.extractSpeakers(words)
        }

        if (paragraphs && transcriptResult?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs) {
            outputData.paragraphs = transcriptResult.results.channels[0].alternatives[0].paragraphs
        }

        // Update flow state
        const state = options.agentflowRuntime?.state as ICommonObject || {}
        const updatedState = {
            ...state,
            lastTranscript: transcript,
            transcriptConfidence: confidence
        }

        return {
            id: nodeData.id,
            name: this.name,
            input: { audioInput, model, language },
            output: outputData,
            state: updatedState
        }
    }

    private extractSpeakers(words: any[]): any[] {
        const speakerMap = new Map<number, string[]>()
        
        for (const word of words) {
            if (word.speaker !== undefined) {
                const speakerId = word.speaker
                if (!speakerMap.has(speakerId)) {
                    speakerMap.set(speakerId, [])
                }
                speakerMap.get(speakerId)?.push(word.word)
            }
        }

        return Array.from(speakerMap.entries()).map(([speaker, words]) => ({
            speaker,
            transcript: words.join(' ')
        }))
    }

    private async getCredentialData(nodeData: INodeData, options: ICommonObject): Promise<ICommonObject> {
        const credentialId = nodeData.credential
        if (!credentialId) {
            throw new Error('Credential is required')
        }
        
        // Access credentials through options.appDataSource
        const appDataSource = options.appDataSource
        const databaseEntities = options.databaseEntities
        
        if (!appDataSource || !databaseEntities) {
            throw new Error('Database connection not available')
        }

        const credential = await appDataSource.getRepository(databaseEntities['Credential']).findOneBy({
            id: credentialId
        })

        if (!credential) {
            throw new Error('Credential not found')
        }

        // Decrypt credential data
        const decryptKey = options.secretKey
        if (credential.encryptedData && decryptKey) {
            // Implement decryption logic here
            // For now, return the raw data
            return JSON.parse(credential.encryptedData)
        }

        return {}
    }
}

module.exports = { nodeClass: DeepgramTranscription_MATEVoice }
