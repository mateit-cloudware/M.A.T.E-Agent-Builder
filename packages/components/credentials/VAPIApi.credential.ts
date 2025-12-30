import { INodeParams, INodeCredential } from '../src/Interface'

class VAPIApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'VAPI API'
        this.name = 'vapiApi'
        this.version = 1.0
        this.description = 'VAPI Voice AI Platform credentials for M.A.T.E. voice agents'
        this.inputs = [
            {
                label: 'VAPI API Key',
                name: 'vapiApiKey',
                type: 'password',
                description: 'Your VAPI API key from the VAPI dashboard'
            },
            {
                label: 'VAPI Public Key',
                name: 'vapiPublicKey',
                type: 'string',
                description: 'Your VAPI public key for client-side integrations',
                optional: true
            },
            {
                label: 'VAPI Secret Key',
                name: 'vapiSecretKey',
                type: 'password',
                description: 'Your VAPI secret key for webhook signature verification',
                optional: true
            }
        ]
    }
}

module.exports = { credClass: VAPIApi }
