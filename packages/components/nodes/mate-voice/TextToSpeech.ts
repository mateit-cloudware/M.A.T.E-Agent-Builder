import { ICommonObject, INode, INodeData, INodeParams } from '../../src/Interface'

/**
 * Text-to-Speech Node for M.A.T.E.
 * 
 * This node converts text to speech using various TTS providers.
 * Supports:
 * - ElevenLabs (high quality, natural voices)
 * - OpenAI TTS
 * - Azure Cognitive Services
 * 
 * Output can be used for voice responses or audio generation.
 */

class TextToSpeech_MATEVoice implements INode {
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
        this.label = 'Text to Speech'
        this.name = 'mateTextToSpeech'
        this.version = 1.0
        this.type = 'MATETextToSpeech'
        this.category = 'M.A.T.E. Voice'
        this.description = 'Convert text to speech using AI voice synthesis'
        this.color = '#F59E0B'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['elevenLabsApi', 'openAIApi', 'azureCognitiveServices']
        }
        this.inputs = [
            {
                label: 'Text Input',
                name: 'textInput',
                type: 'string',
                description: 'The text to convert to speech',
                rows: 4,
                acceptVariable: true
            },
            {
                label: 'Provider',
                name: 'provider',
                type: 'options',
                options: [
                    {
                        label: 'ElevenLabs',
                        name: 'elevenlabs',
                        description: 'High-quality AI voices'
                    },
                    {
                        label: 'OpenAI TTS',
                        name: 'openai',
                        description: 'OpenAI Text-to-Speech'
                    },
                    {
                        label: 'Azure Cognitive Services',
                        name: 'azure',
                        description: 'Microsoft Azure TTS'
                    }
                ],
                default: 'elevenlabs',
                description: 'TTS provider to use'
            },
            {
                label: 'ElevenLabs Voice ID',
                name: 'elevenLabsVoiceId',
                type: 'string',
                description: 'ElevenLabs voice ID or name',
                default: 'josh',
                show: {
                    provider: 'elevenlabs'
                }
            },
            {
                label: 'ElevenLabs Model',
                name: 'elevenLabsModel',
                type: 'options',
                options: [
                    {
                        label: 'Eleven Multilingual v2',
                        name: 'eleven_multilingual_v2',
                        description: 'Best for multiple languages including German'
                    },
                    {
                        label: 'Eleven Turbo v2.5',
                        name: 'eleven_turbo_v2_5',
                        description: 'Low latency, great quality'
                    },
                    {
                        label: 'Eleven Turbo v2',
                        name: 'eleven_turbo_v2',
                        description: 'Fastest, English only'
                    },
                    {
                        label: 'Eleven Monolingual v1',
                        name: 'eleven_monolingual_v1',
                        description: 'English only, very fast'
                    }
                ],
                default: 'eleven_multilingual_v2',
                show: {
                    provider: 'elevenlabs'
                }
            },
            {
                label: 'OpenAI Voice',
                name: 'openaiVoice',
                type: 'options',
                options: [
                    { label: 'Alloy', name: 'alloy' },
                    { label: 'Echo', name: 'echo' },
                    { label: 'Fable', name: 'fable' },
                    { label: 'Onyx', name: 'onyx' },
                    { label: 'Nova', name: 'nova' },
                    { label: 'Shimmer', name: 'shimmer' }
                ],
                default: 'nova',
                show: {
                    provider: 'openai'
                }
            },
            {
                label: 'OpenAI Model',
                name: 'openaiModel',
                type: 'options',
                options: [
                    {
                        label: 'TTS-1',
                        name: 'tts-1',
                        description: 'Standard quality, faster'
                    },
                    {
                        label: 'TTS-1-HD',
                        name: 'tts-1-hd',
                        description: 'High quality, slower'
                    }
                ],
                default: 'tts-1',
                show: {
                    provider: 'openai'
                }
            },
            {
                label: 'Azure Voice Name',
                name: 'azureVoiceName',
                type: 'string',
                description: 'Azure voice name (e.g., de-DE-ConradNeural)',
                default: 'de-DE-ConradNeural',
                show: {
                    provider: 'azure'
                }
            },
            {
                label: 'Speed',
                name: 'speed',
                type: 'number',
                default: 1.0,
                description: 'Speech speed (0.5 - 2.0)',
                optional: true
            },
            {
                label: 'Output Format',
                name: 'outputFormat',
                type: 'options',
                options: [
                    { label: 'MP3', name: 'mp3' },
                    { label: 'WAV', name: 'wav' },
                    { label: 'OGG', name: 'ogg' },
                    { label: 'AAC', name: 'aac' }
                ],
                default: 'mp3',
                description: 'Audio output format'
            },
            {
                label: 'Return Audio As',
                name: 'returnAs',
                type: 'options',
                options: [
                    {
                        label: 'Base64',
                        name: 'base64',
                        description: 'Return audio as base64 encoded string'
                    },
                    {
                        label: 'URL',
                        name: 'url',
                        description: 'Return URL to audio file (if supported)'
                    },
                    {
                        label: 'Buffer',
                        name: 'buffer',
                        description: 'Return raw audio buffer'
                    }
                ],
                default: 'base64',
                description: 'Format to return the audio in'
            }
        ]
    }

    async run(nodeData: INodeData, input: string | Record<string, any>, options: ICommonObject): Promise<any> {
        const provider = nodeData.inputs?.provider as string
        let textInput = nodeData.inputs?.textInput as string
        const speed = nodeData.inputs?.speed as number || 1.0
        const outputFormat = nodeData.inputs?.outputFormat as string || 'mp3'
        const returnAs = nodeData.inputs?.returnAs as string || 'base64'

        // Get text from previous node if not provided
        if (!textInput && typeof input === 'object' && input.output?.content) {
            textInput = input.output.content
        } else if (!textInput && typeof input === 'string') {
            textInput = input
        }

        if (!textInput) {
            throw new Error('Text input is required')
        }

        // Get credentials
        const credentialData = await this.getCredentialData(nodeData, options)

        let audioBase64 = ''
        let audioUrl = ''
        let audioDuration = 0

        switch (provider) {
            case 'elevenlabs':
                const elevenLabsResult = await this.generateElevenLabs(nodeData, textInput, credentialData, outputFormat)
                audioBase64 = elevenLabsResult.audioBase64
                audioDuration = elevenLabsResult.duration
                break

            case 'openai':
                const openaiResult = await this.generateOpenAI(nodeData, textInput, speed, credentialData, outputFormat)
                audioBase64 = openaiResult.audioBase64
                audioDuration = openaiResult.duration
                break

            case 'azure':
                const azureResult = await this.generateAzure(nodeData, textInput, credentialData, outputFormat)
                audioBase64 = azureResult.audioBase64
                audioDuration = azureResult.duration
                break

            default:
                throw new Error(`Unknown TTS provider: ${provider}`)
        }

        // Build output
        const outputData: ICommonObject = {
            provider,
            text: textInput,
            format: outputFormat,
            duration: audioDuration,
            characterCount: textInput.length
        }

        if (returnAs === 'base64' || returnAs === 'buffer') {
            outputData.audioBase64 = audioBase64
            outputData.mimeType = this.getMimeType(outputFormat)
        }

        if (returnAs === 'url' && audioUrl) {
            outputData.audioUrl = audioUrl
        }

        // Update flow state
        const state = options.agentflowRuntime?.state as ICommonObject || {}
        const updatedState = {
            ...state,
            lastTTSText: textInput,
            lastTTSDuration: audioDuration
        }

        return {
            id: nodeData.id,
            name: this.name,
            input: { textInput, provider },
            output: outputData,
            state: updatedState
        }
    }

    private async generateElevenLabs(
        nodeData: INodeData,
        text: string,
        credentials: ICommonObject,
        outputFormat: string
    ): Promise<{ audioBase64: string; duration: number }> {
        const apiKey = credentials?.elevenLabsApiKey as string
        if (!apiKey) {
            throw new Error('ElevenLabs API key is required')
        }

        const voiceId = nodeData.inputs?.elevenLabsVoiceId as string || 'josh'
        const model = nodeData.inputs?.elevenLabsModel as string || 'eleven_multilingual_v2'

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Accept': `audio/${outputFormat}`,
                'Content-Type': 'application/json',
                'xi-api-key': apiKey
            },
            body: JSON.stringify({
                text: text,
                model_id: model,
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        const audioBase64 = Buffer.from(arrayBuffer).toString('base64')

        // Estimate duration based on text length (rough estimate)
        const wordsPerMinute = 150
        const wordCount = text.split(/\s+/).length
        const duration = (wordCount / wordsPerMinute) * 60

        return { audioBase64, duration }
    }

    private async generateOpenAI(
        nodeData: INodeData,
        text: string,
        speed: number,
        credentials: ICommonObject,
        outputFormat: string
    ): Promise<{ audioBase64: string; duration: number }> {
        const apiKey = credentials?.openAIApiKey as string
        if (!apiKey) {
            throw new Error('OpenAI API key is required')
        }

        const voice = nodeData.inputs?.openaiVoice as string || 'nova'
        const model = nodeData.inputs?.openaiModel as string || 'tts-1'

        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                input: text,
                voice: voice,
                speed: speed,
                response_format: outputFormat === 'wav' ? 'wav' : 'mp3'
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`OpenAI TTS API error: ${response.status} - ${errorText}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        const audioBase64 = Buffer.from(arrayBuffer).toString('base64')

        // Estimate duration
        const wordsPerMinute = 150 * speed
        const wordCount = text.split(/\s+/).length
        const duration = (wordCount / wordsPerMinute) * 60

        return { audioBase64, duration }
    }

    private async generateAzure(
        nodeData: INodeData,
        text: string,
        credentials: ICommonObject,
        outputFormat: string
    ): Promise<{ audioBase64: string; duration: number }> {
        const subscriptionKey = credentials?.azureSubscriptionKey as string
        const region = credentials?.azureRegion as string || 'westeurope'

        if (!subscriptionKey) {
            throw new Error('Azure subscription key is required')
        }

        const voiceName = nodeData.inputs?.azureVoiceName as string || 'de-DE-ConradNeural'

        // Build SSML
        const ssml = `
            <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="de-DE">
                <voice name="${voiceName}">
                    ${text}
                </voice>
            </speak>
        `.trim()

        const audioFormatMap: Record<string, string> = {
            mp3: 'audio-24khz-160kbitrate-mono-mp3',
            wav: 'riff-24khz-16bit-mono-pcm',
            ogg: 'ogg-24khz-16bit-mono-opus',
            aac: 'audio-24khz-160kbitrate-mono-mp3'
        }

        const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': audioFormatMap[outputFormat] || 'audio-24khz-160kbitrate-mono-mp3',
                'Ocp-Apim-Subscription-Key': subscriptionKey
            },
            body: ssml
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Azure TTS API error: ${response.status} - ${errorText}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        const audioBase64 = Buffer.from(arrayBuffer).toString('base64')

        // Estimate duration
        const wordsPerMinute = 150
        const wordCount = text.split(/\s+/).length
        const duration = (wordCount / wordsPerMinute) * 60

        return { audioBase64, duration }
    }

    private getMimeType(format: string): string {
        const mimeTypes: Record<string, string> = {
            mp3: 'audio/mpeg',
            wav: 'audio/wav',
            ogg: 'audio/ogg',
            aac: 'audio/aac'
        }
        return mimeTypes[format] || 'audio/mpeg'
    }

    private async getCredentialData(nodeData: INodeData, options: ICommonObject): Promise<ICommonObject> {
        const credentialId = nodeData.credential
        if (!credentialId) {
            throw new Error('Credential is required')
        }

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

        if (credential.encryptedData) {
            return JSON.parse(credential.encryptedData)
        }

        return {}
    }
}

module.exports = { nodeClass: TextToSpeech_MATEVoice }
