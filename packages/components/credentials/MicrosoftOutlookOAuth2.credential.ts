import { INodeParams, INodeCredential } from '../src/Interface'

const scopes = [
    'openid',
    'offline_access',
    'Contacts.Read',
    'Contacts.ReadWrite',
    'Calendars.Read',
    'Calendars.Read.Shared',
    'Calendars.ReadWrite',
    'Mail.Read',
    'Mail.ReadWrite',
    'Mail.ReadWrite.Shared',
    'Mail.Send',
    'Mail.Send.Shared',
    'MailboxSettings.Read'
]

class MsoftOutlookOAuth2 implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Microsoft Outlook OAuth2'
        this.name = 'microsoftOutlookOAuth2'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://learn.microsoft.com/en-us/graph/outlook-mail-concept-overview">Microsoft Graph Outlook API documentation</a> for setup instructions'
        this.inputs = [
            {
                label: 'Authorization URL',
                name: 'authorizationUrl',
                type: 'string',
                default: 'https://login.microsoftonline.com/<tenantId>/oauth2/v2.0/authorize'
            },
            {
                label: 'Access Token URL',
                name: 'accessTokenUrl',
                type: 'string',
                default: 'https://login.microsoftonline.com/<tenantId>/oauth2/v2.0/token'
            },
            {
                label: 'Client ID',
                name: 'clientId',
                type: 'string'
            },
            {
                label: 'Client Secret',
                name: 'clientSecret',
                type: 'password'
            },
            {
                label: 'Scope',
                name: 'scope',
                type: 'string',
                hidden: true,
                default: scopes.join(' ')
            }
        ]
    }
}

module.exports = { credClass: MsoftOutlookOAuth2 }
