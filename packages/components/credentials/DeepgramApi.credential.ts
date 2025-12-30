import { INodeParams, INodeCredential } from '../src/Interface'

class DeepgramApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Deepgram API'
        this.name = 'deepgramApi'
        this.version = 1.0
        this.description = 'Deepgram Speech-to-Text API credentials for M.A.T.E. voice transcription'
        this.inputs = [
            {
                label: 'Deepgram API Key',
                name: 'deepgramApiKey',
                type: 'password',
                description: 'Your Deepgram API key from the Deepgram console'
            }
        ]
    }
}

module.exports = { credClass: DeepgramApi }
