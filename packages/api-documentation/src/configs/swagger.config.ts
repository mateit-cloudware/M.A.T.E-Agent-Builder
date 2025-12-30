import swaggerJSDoc from 'swagger-jsdoc'

const swaggerUiOptions = {
    failOnErrors: true, // Throw when parsing errors
    baseDir: __dirname, // Base directory which we use to locate your JSDOC files
    exposeApiDocs: true,
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'M.A.T.E. Agent Builder APIs',
            summary: 'Interactive swagger-ui auto-generated API docs for M.A.T.E. Agent Builder',
            version: '1.0.0',
            description:
                'This module serves auto-generated swagger-ui generated API docs from M.A.T.E. Agent Builder backend, based on a swagger.yml file. Swagger is available on: http://localhost:6655/api-docs',
            license: {
                name: 'Apache 2.0',
                url: 'https://github.com/mateit-cloudware/M.A.T.E-Agent-Builder/blob/main/LICENSE.md'
            },
            contact: {
                name: 'M.A.T.E. by Mate iT GmbH',
                email: 'support@mateit.de'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000/api/v1',
                description: 'M.A.T.E. Agent Builder Server'
            }
        ]
    },
    apis: [`${process.cwd()}/dist/routes/**/*.js`, `${process.cwd()}/src/yml/swagger.yml`]
}

// https://github.com/swagger-api/swagger-ui/blob/master/docs/usage/configuration.md
const swaggerExplorerOptions = {
    swaggerOptions: {
        validatorUrl: '127.0.0.1'
    },
    explorer: true
}

const swaggerDocs = swaggerJSDoc(swaggerUiOptions)

export { swaggerDocs, swaggerExplorerOptions }
