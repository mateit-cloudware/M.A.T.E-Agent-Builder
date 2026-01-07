/**
 * M.A.T.E. Guardrail Service Tests
 * 
 * Phase 5.1.3: Unit-Tests für Guardrail-Service
 * 
 * Coverage: PII-Detection, Credentials-Detection, Maskierung, Injection-Detection
 * Target: 90% Coverage
 */

import { guardrailService } from '../guardrail.service'
import { GuardrailCategory, AuditAction, AuditSeverity, AuditDirection } from '../../database/entities/guardrail.entity'

describe('GuardrailService', () => {
    const service = guardrailService // Use singleton instance

    describe('PII Detection', () => {
        it('should detect email addresses', async () => {
            const text = 'Please contact me at john.doe@example.com for more details'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.PII],
                skipAuditLog: true
            })

            expect(result.hasDetections).toBe(true)
            expect(result.detections.length).toBeGreaterThan(0)
            
            const emailDetection = result.detections.find(d => d.detectionType === 'email')
            expect(emailDetection).toBeDefined()
            expect(emailDetection?.originalValue).toBe('john.doe@example.com')
            expect(emailDetection?.severity).toBe(AuditSeverity.HIGH)
        })

        it('should mask email addresses in sanitized text', async () => {
            const text = 'My email is test@example.com'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.PII],
                skipAuditLog: true
            })

            expect(result.sanitizedText).not.toContain('test@example.com')
            expect(result.sanitizedText).toContain('.com') // Partial masking
        })

        it('should detect phone numbers', async () => {
            const text = 'Call me at +49 123 456 7890'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.PII],
                skipAuditLog: true
            })

            const phoneDetection = result.detections.find(d => d.detectionType === 'phone')
            expect(phoneDetection).toBeDefined()
            expect(phoneDetection?.severity).toBe(AuditSeverity.MEDIUM)
        })

        it('should detect US Social Security Numbers', async () => {
            const text = 'My SSN is 123-45-6789'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.PII],
                skipAuditLog: true
            })

            const ssnDetection = result.detections.find(d => d.detectionType === 'ssn')
            expect(ssnDetection).toBeDefined()
            expect(ssnDetection?.severity).toBe(AuditSeverity.CRITICAL)
            expect(result.sanitizedText).not.toContain('123-45-6789')
        })

        it('should detect person names with heuristic', async () => {
            const text = 'John Smith will attend the meeting'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.PII],
                skipAuditLog: true
            })

            const nameDetection = result.detections.find(d => d.detectionType === 'personName')
            expect(nameDetection).toBeDefined()
            expect(nameDetection?.confidence).toBeLessThan(1.0) // Lower confidence for heuristic
        })

        it('should handle text with multiple PII types', async () => {
            const text = 'Contact John Smith at john@example.com or call +49 123 456 7890'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.PII],
                skipAuditLog: true
            })

            expect(result.detections.length).toBeGreaterThanOrEqual(3) // Name, email, phone
            expect(result.sanitizedText).not.toContain('john@example.com')
        })
    })

    describe('Credentials Detection', () => {
        it('should detect OpenAI API keys', async () => {
            const text = 'My API key is sk-1234567890abcdefghijklmnopqrstuvwxyz1234567'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.CREDENTIALS],
                skipAuditLog: true
            })

            const keyDetection = result.detections.find(d => d.detectionType === 'openaiKey')
            expect(keyDetection).toBeDefined()
            expect(keyDetection?.severity).toBe(AuditSeverity.CRITICAL)
            expect(result.sanitizedText).toContain('[REDACTED]')
        })

        it('should detect OpenRouter API keys', async () => {
            const text = 'Use this key: sk-or-v1-' + 'a'.repeat(64)
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.CREDENTIALS],
                skipAuditLog: true
            })

            const keyDetection = result.detections.find(d => d.detectionType === 'openrouterKey')
            expect(keyDetection).toBeDefined()
            expect(keyDetection?.severity).toBe(AuditSeverity.CRITICAL)
        })

        it('should detect Anthropic API keys', async () => {
            const text = 'Claude key: sk-ant-' + 'b'.repeat(95)
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.CREDENTIALS],
                skipAuditLog: true
            })

            const keyDetection = result.detections.find(d => d.detectionType === 'anthropicKey')
            expect(keyDetection).toBeDefined()
        })

        it('should detect Bearer tokens', async () => {
            const text = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.CREDENTIALS],
                skipAuditLog: true
            })

            const tokenDetection = result.detections.find(d => d.detectionType === 'bearerToken')
            expect(tokenDetection).toBeDefined()
            expect(tokenDetection?.severity).toBe(AuditSeverity.CRITICAL)
        })

        it('should detect password literals', async () => {
            const text = 'password=MySecretPass123'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.CREDENTIALS],
                skipAuditLog: true
            })

            const pwdDetection = result.detections.find(d => d.detectionType === 'password')
            expect(pwdDetection).toBeDefined()
            expect(result.sanitizedText).toContain('[REDACTED]')
        })

        it('should detect generic API key patterns', async () => {
            const text = 'api_key: abcdefghijklmnopqrstuvwxyz123456'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.CREDENTIALS],
                skipAuditLog: true
            })

            const apiKeyDetection = result.detections.find(d => d.detectionType === 'apiKey')
            expect(apiKeyDetection).toBeDefined()
        })
    })

    describe('Financial Detection', () => {
        it('should detect credit card numbers', async () => {
            const text = 'Card number: 1234 5678 9012 3456'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.FINANCIAL],
                skipAuditLog: true
            })

            const ccDetection = result.detections.find(d => d.detectionType === 'creditCard')
            expect(ccDetection).toBeDefined()
            expect(ccDetection?.severity).toBe(AuditSeverity.CRITICAL)
            expect(result.sanitizedText).toContain('3456') // Partial masking shows last 4
        })

        it('should detect IBAN numbers', async () => {
            const text = 'IBAN: DE89 3704 0044 0532 0130 00'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.FINANCIAL],
                skipAuditLog: true
            })

            const ibanDetection = result.detections.find(d => d.detectionType === 'iban')
            expect(ibanDetection).toBeDefined()
            expect(ibanDetection?.severity).toBe(AuditSeverity.CRITICAL)
        })

        it('should mask credit card numbers partially', async () => {
            const text = 'My card is 4532-1234-5678-9010'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.FINANCIAL],
                skipAuditLog: true
            })

            expect(result.sanitizedText).not.toContain('4532-1234')
            expect(result.sanitizedText).toContain('9010')
        })
    })

    describe('Injection Detection', () => {
        it('should detect SQL injection attempts', async () => {
            const text = 'User input: 1 OR 1=1; DROP TABLE users;'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.INJECTION],
                skipAuditLog: true
            })

            const sqlDetection = result.detections.find(d => d.detectionType === 'sqlInjection')
            expect(sqlDetection).toBeDefined()
            expect(sqlDetection?.severity).toBe(AuditSeverity.CRITICAL)
        })

        it('should detect XSS attempts', async () => {
            const text = '<script>alert("XSS")</script>'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.INJECTION],
                skipAuditLog: true
            })

            const xssDetection = result.detections.find(d => d.detectionType === 'xss')
            expect(xssDetection).toBeDefined()
            expect(xssDetection?.severity).toBe(AuditSeverity.HIGH)
            expect(result.sanitizedText).toContain('[REDACTED]')
        })

        it('should detect UNION SELECT injection', async () => {
            const text = "' UNION SELECT password FROM users--"
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.INJECTION],
                skipAuditLog: true
            })

            const sqlDetection = result.detections.find(d => d.detectionType === 'sqlInjection')
            expect(sqlDetection).toBeDefined()
        })
    })

    describe('Maskierung Styles', () => {
        it('should apply asterisk masking correctly', async () => {
            const text = 'John Smith is here'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.PII],
                skipAuditLog: true
            })

            const nameDetection = result.detections.find(d => d.detectionType === 'personName')
            expect(nameDetection?.maskedValue).toMatch(/\*+/)
        })

        it('should apply partial masking with last 4 chars visible', async () => {
            const text = 'Email: test@example.com'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.PII],
                skipAuditLog: true
            })

            const emailDetection = result.detections.find(d => d.detectionType === 'email')
            expect(emailDetection?.maskedValue).toContain('.com')
            expect(emailDetection?.maskedValue).toContain('*')
        })

        it('should apply redaction for critical data', async () => {
            const text = 'SSN: 123-45-6789'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.PII],
                skipAuditLog: true
            })

            const ssnDetection = result.detections.find(d => d.detectionType === 'ssn')
            expect(ssnDetection?.maskedValue).toBe('[REDACTED]')
        })
    })

    describe('Action Determination', () => {
        it('should return ALLOW for clean text', async () => {
            const text = 'This is a normal message without sensitive data'
            const result = await service.scanText(text, {
                skipAuditLog: true
            })

            expect(result.action).toBe(AuditAction.ALLOW)
            expect(result.hasDetections).toBe(false)
        })

        it('should return MASK for medium severity detections', async () => {
            const text = 'Call me at +49 123 456 7890'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.PII],
                skipAuditLog: true
            })

            // Phone is MEDIUM severity - should trigger MASK or WARN
            expect([AuditAction.MASK, AuditAction.WARN]).toContain(result.action)
        })

        it('should return MASK or BLOCK for critical detections', async () => {
            const text = 'My API key is sk-1234567890abcdefghijklmnopqrstuvwxyz1234567'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.CREDENTIALS],
                skipAuditLog: true
            })

            // Credentials are CRITICAL - should trigger MASK or BLOCK
            expect([AuditAction.MASK, AuditAction.BLOCK]).toContain(result.action)
        })
    })

    describe('Input/Output Validation', () => {
        it('should validate input successfully for clean text', async () => {
            const input = 'Hello, how can I help you today?'
            const result = await service.validateInput(input, {
                skipAuditLog: true
            })

            expect(result.allowed).toBe(true)
            expect(result.sanitized).toBe(input)
        })

        it('should mask PII in input validation', async () => {
            const input = 'My email is test@example.com'
            const result = await service.validateInput(input, {
                skipAuditLog: true,
                enabledCategories: [GuardrailCategory.PII]
            })

            expect(result.allowed).toBe(true)
            expect(result.sanitized).not.toContain('test@example.com')
        })

        it('should validate output successfully for clean text', async () => {
            const output = 'Here is the information you requested'
            const result = await service.validateOutput(output, {
                skipAuditLog: true
            })

            expect(result.allowed).toBe(true)
            expect(result.sanitized).toBe(output)
        })

        it('should mask PII in output validation', async () => {
            const output = 'The contact email is admin@company.com'
            const result = await service.validateOutput(output, {
                skipAuditLog: true,
                enabledCategories: [GuardrailCategory.PII]
            })

            expect(result.allowed).toBe(true)
            expect(result.sanitized).not.toContain('admin@company.com')
        })
    })

    describe('Multiple Detections', () => {
        it('should detect and mask multiple sensitive items', async () => {
            const text = `
                Contact: john.doe@example.com
                Phone: +49 123 456 7890
                API Key: sk-1234567890abcdefghijklmnopqrstuvwxyz1234567
                Card: 1234-5678-9012-3456
            `
            const result = await service.scanText(text, {
                skipAuditLog: true
            })

            expect(result.detections.length).toBeGreaterThanOrEqual(4)
            expect(result.sanitizedText).not.toContain('john.doe@example.com')
            expect(result.sanitizedText).not.toContain('sk-1234567890')
            expect(result.sanitizedText).not.toContain('1234-5678-9012')
        })

        it('should maintain text structure after multiple maskings', async () => {
            const text = 'Email: test@example.com and Phone: +49 123 456 7890'
            const result = await service.scanText(text, {
                skipAuditLog: true
            })

            expect(result.sanitizedText).toContain('Email:')
            expect(result.sanitizedText).toContain('and')
            expect(result.sanitizedText).toContain('Phone:')
        })
    })

    describe('Edge Cases', () => {
        it('should handle empty input', async () => {
            const result = await service.scanText('', {
                skipAuditLog: true
            })

            expect(result.hasDetections).toBe(false)
            expect(result.action).toBe(AuditAction.ALLOW)
            expect(result.sanitizedText).toBe('')
        })

        it('should handle very long text', async () => {
            const longText = 'a'.repeat(100000) + ' test@example.com ' + 'b'.repeat(100000)
            const result = await service.scanText(longText, {
                enabledCategories: [GuardrailCategory.PII],
                skipAuditLog: true
            })

            expect(result.detections.length).toBeGreaterThan(0)
            expect(result.processingTimeMs).toBeLessThan(5000) // Should process in < 5s
        })

        it('should handle special characters', async () => {
            const text = '🚀 Email: test@example.com 🎉'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.PII],
                skipAuditLog: true
            })

            expect(result.sanitizedText).toContain('🚀')
            expect(result.sanitizedText).toContain('🎉')
            expect(result.sanitizedText).not.toContain('test@example.com')
        })

        it('should handle malformed patterns gracefully', async () => {
            const text = 'Almost an email: test@invalid'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.PII],
                skipAuditLog: true
            })

            // 'test@invalid' should not match email pattern (missing TLD)
            const emailDetection = result.detections.find(d => d.detectionType === 'email')
            expect(emailDetection).toBeUndefined()
        })

        it('should handle overlapping patterns', async () => {
            const text = 'Key: api_key="sk-1234567890abcdefghijklmnopqrstuvwxyz1234567"'
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.CREDENTIALS],
                skipAuditLog: true
            })

            // Both apiKey and openaiKey patterns might match
            expect(result.detections.length).toBeGreaterThan(0)
            expect(result.sanitizedText).toContain('[REDACTED]')
        })
    })

    describe('Performance', () => {
        it('should scan normal text in under 100ms', async () => {
            const text = 'This is a normal message with some data: test@example.com'
            const startTime = Date.now()
            
            await service.scanText(text, {
                skipAuditLog: true
            })
            
            const duration = Date.now() - startTime
            expect(duration).toBeLessThan(100)
        })

        it('should handle concurrent scans', async () => {
            const texts = Array.from({ length: 10 }, (_, i) => 
                `Message ${i}: test${i}@example.com`
            )

            const results = await Promise.all(
                texts.map(text => service.scanText(text, {
                    skipAuditLog: true,
                    enabledCategories: [GuardrailCategory.PII]
                }))
            )

            expect(results).toHaveLength(10)
            results.forEach((result, i) => {
                expect(result.hasDetections).toBe(true)
                expect(result.sanitizedText).not.toContain(`test${i}@example.com`)
            })
        })
    })

    describe('Category Filtering', () => {
        it('should only scan enabled categories', async () => {
            const text = 'Email: test@example.com, API Key: sk-123456789012345678901234567890123456789012345678'
            
            // Only scan PII
            const result = await service.scanText(text, {
                enabledCategories: [GuardrailCategory.PII],
                skipAuditLog: true
            })

            const emailDetections = result.detections.filter(d => d.detectionType === 'email')
            const keyDetections = result.detections.filter(d => d.detectionType === 'openaiKey')

            expect(emailDetections.length).toBeGreaterThan(0)
            expect(keyDetections.length).toBe(0) // Credentials not scanned
        })

        it('should scan all categories when none specified', async () => {
            const text = 'Email: test@example.com, API Key: sk-123456789012345678901234567890123456789012345678'
            const result = await service.scanText(text, {
                skipAuditLog: true
            })

            // Should detect both PII and credentials
            expect(result.detections.length).toBeGreaterThanOrEqual(2)
        })
    })
})
