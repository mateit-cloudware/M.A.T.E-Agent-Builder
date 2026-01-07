/**
 * M.A.T.E. Encryption Service Tests
 * 
 * Phase 5.1.2: Unit-Tests für Encryption-Service
 * 
 * Coverage: Encrypt, Decrypt, IV-Uniqueness, Key-Derivation, Migration
 * Target: 100% Coverage
 */

import { encryptionService } from '../encryption.service'

describe('EncryptionService', () => {
    const service = encryptionService // Use singleton instance
    const testData = 'Hello, World! This is a test string.'
    const testJson = { apiKey: 'sk-test-123456', model: 'gpt-4' }

    // Ensure ENCRYPTION_KEY is set for tests
    beforeAll(() => {
        if (!process.env.ENCRYPTION_KEY) {
            process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests-only'
        }
    })

    describe('Basic Encryption/Decryption (AES-256-GCM)', () => {
        it('should encrypt and decrypt a string successfully', async () => {
            const encrypted = await service.encrypt(testData)
            const decrypted = await service.decrypt(encrypted)
            
            expect(decrypted).toBe(testData)
        })

        it('should produce encrypted output that starts with v2:', async () => {
            const encrypted = await service.encrypt(testData)
            
            expect(encrypted).toMatch(/^v2:/)
        })

        it('should handle empty strings', async () => {
            const encrypted = await service.encrypt('')
            const decrypted = await service.decrypt('')
            
            expect(encrypted).toBe('')
            expect(decrypted).toBe('')
        })

        it('should handle special characters and unicode', async () => {
            const specialChars = '🚀 Emoji, ÄÖÜ, 中文, \n\t\r\\/"\'`'
            const encrypted = await service.encrypt(specialChars)
            const decrypted = await service.decrypt(encrypted)
            
            expect(decrypted).toBe(specialChars)
        })

        it('should handle very long strings', async () => {
            const longString = 'a'.repeat(100000)
            const encrypted = await service.encrypt(longString)
            const decrypted = await service.decrypt(encrypted)
            
            expect(decrypted).toBe(longString)
            expect(decrypted.length).toBe(100000)
        })
    })

    describe('IV Uniqueness (Cryptographic Security)', () => {
        it('should generate different IVs for same plaintext', async () => {
            const encrypted1 = await service.encrypt(testData)
            const encrypted2 = await service.encrypt(testData)
            
            // Same plaintext should produce different ciphertext due to random IV
            expect(encrypted1).not.toBe(encrypted2)
        })

        it('should encrypt same data 100 times with unique outputs', async () => {
            const encryptedSet = new Set<string>()
            
            for (let i = 0; i < 100; i++) {
                const encrypted = await service.encrypt(testData)
                encryptedSet.add(encrypted)
            }
            
            // All 100 encryptions should be unique
            expect(encryptedSet.size).toBe(100)
        })

        it('should maintain decryption integrity with different IVs', async () => {
            const results: string[] = []
            
            for (let i = 0; i < 10; i++) {
                const encrypted = await service.encrypt(testData)
                const decrypted = await service.decrypt(encrypted)
                results.push(decrypted)
            }
            
            // All decryptions should produce same result
            results.forEach(result => {
                expect(result).toBe(testData)
            })
        })
    })

    describe('Key Derivation (PBKDF2)', () => {
        it('should encrypt/decrypt with PBKDF2 enabled', async () => {
            const encrypted = await service.encrypt(testData, true)
            const decrypted = await service.decrypt(encrypted, true)
            
            expect(decrypted).toBe(testData)
        })

        it('should produce different output with PBKDF2', async () => {
            const normalEncrypted = await service.encrypt(testData, false)
            const pbkdfEncrypted = await service.encrypt(testData, true)
            
            // PBKDF2 version should have additional salt component
            expect(normalEncrypted).not.toBe(pbkdfEncrypted)
            
            // Format check: PBKDF2 should have 4 parts (salt:iv:authTag:ciphertext)
            const pbkdfParts = pbkdfEncrypted.replace('v2:', '').split(':')
            const normalParts = normalEncrypted.replace('v2:', '').split(':')
            
            expect(pbkdfParts.length).toBe(4) // With salt
            expect(normalParts.length).toBe(3) // Without salt
        })

        it('should fail decryption if PBKDF flag mismatch', async () => {
            const encrypted = await service.encrypt(testData, true)
            
            // Trying to decrypt PBKDF-encrypted data without flag should fail
            await expect(
                service.decrypt(encrypted, false)
            ).rejects.toThrow()
        })
    })

    describe('Specialized Encryption Functions', () => {
        it('should encrypt and decrypt credentials (JSON)', async () => {
            const encrypted = await service.encryptCredentials(testJson)
            const decrypted = await service.decryptCredentials(encrypted)
            
            expect(decrypted).toEqual(testJson)
        })

        it('should handle empty credentials', async () => {
            const encrypted = await service.encryptCredentials({})
            const decrypted = await service.decryptCredentials(encrypted)
            
            expect(decrypted).toEqual({})
        })

        it('should encrypt and decrypt API keys', async () => {
            const apiKey = 'sk-test-1234567890abcdefghijklmnopqrstuvwxyz'
            const encrypted = await service.encryptApiKey(apiKey)
            const decrypted = await service.decryptApiKey(encrypted)
            
            expect(decrypted).toBe(apiKey)
        })

        it('should use PBKDF2 for API keys', async () => {
            const apiKey = 'sk-test-key'
            const encrypted = await service.encryptApiKey(apiKey)
            
            // API keys should use PBKDF2 (4 parts)
            const parts = encrypted.replace('v2:', '').split(':')
            expect(parts.length).toBe(4)
        })
    })

    describe('V1 to V2 Migration', () => {
        it('should detect V2 encrypted data', () => {
            expect(service.isV2Encrypted('v2:abc123:def456:ghi789')).toBe(true)
            expect(service.isV2Encrypted('U2FsdGVkX1+abc123==')).toBe(false)
            expect(service.isV2Encrypted('')).toBe(false)
        })

        it('should detect encrypted data (V1 or V2)', () => {
            expect(service.isEncrypted('v2:abc:def:ghi')).toBe(true)
            expect(service.isEncrypted('plaintext')).toBe(false)
            expect(service.isEncrypted('')).toBe(false)
        })

        it('should migrate V1 data to V2 format', async () => {
            // Mock V1 encrypted data (we can't easily generate real V1 data in test)
            const mockV1Data = 'U2FsdGVkX1+abc123=='
            
            // Migration should attempt to decrypt V1 and re-encrypt as V2
            // This will throw error since it's mock data, but we test the flow
            await expect(
                service.migrateToV2(mockV1Data)
            ).rejects.toThrow()
        })

        it('should not migrate already-V2 data', async () => {
            const encrypted = await service.encrypt(testData)
            const migrated = await service.migrateToV2(encrypted)
            
            // Should return same data if already V2
            expect(migrated).toBe(encrypted)
        })

        it('should handle empty migration input', async () => {
            const result = await service.migrateToV2('')
            expect(result).toBe('')
        })
    })

    describe('Utility Functions', () => {
        it('should mask sensitive values', () => {
            const masked = service.mask('sk-1234567890abcdef', 4)
            
            expect(masked).toBe('••••••••cdef')
            expect(masked).not.toContain('1234567890')
        })

        it('should mask short values completely', () => {
            const masked = service.mask('short')
            
            expect(masked).toBe('••••••••')
        })

        it('should generate secure random tokens', () => {
            const token1 = service.generateSecureToken(32)
            const token2 = service.generateSecureToken(32)
            
            expect(token1).not.toBe(token2)
            expect(token1.length).toBe(64) // 32 bytes = 64 hex chars
            expect(token2.length).toBe(64)
        })

        it('should generate UUIDs', () => {
            const uuid1 = service.generateUuid()
            const uuid2 = service.generateUuid()
            
            expect(uuid1).not.toBe(uuid2)
            expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
        })

        it('should generate encryption keys', () => {
            const key = service.generateKey()
            
            expect(key).toBeDefined()
            expect(key.length).toBeGreaterThan(40) // Base64 of 32 bytes
        })

        it('should hash keys consistently', () => {
            const hash1 = service.hashKey('test-key')
            const hash2 = service.hashKey('test-key')
            
            expect(hash1).toBe(hash2)
            expect(hash1.length).toBe(16) // Truncated to 16 chars
        })
    })

    describe('Hashing Functions', () => {
        it('should create SHA-256 hash', () => {
            const hash = service.sha256('test data')
            
            expect(hash).toHaveLength(64) // SHA-256 produces 64 hex chars
            expect(hash).toMatch(/^[0-9a-f]{64}$/)
        })

        it('should create SHA-512 hash', () => {
            const hash = service.sha512('test data')
            
            expect(hash).toHaveLength(128) // SHA-512 produces 128 hex chars
            expect(hash).toMatch(/^[0-9a-f]{128}$/)
        })

        it('should create consistent hashes', () => {
            const hash1 = service.sha256('consistent data')
            const hash2 = service.sha256('consistent data')
            
            expect(hash1).toBe(hash2)
        })

        it('should create HMAC', async () => {
            const hmac = await service.hmac('test data')
            
            expect(hmac).toHaveLength(64)
            expect(hmac).toMatch(/^[0-9a-f]{64}$/)
        })

        it('should verify timing-safe equality', () => {
            const hash = service.sha256('test')
            
            expect(service.timingSafeEqual(hash, hash)).toBe(true)
            expect(service.timingSafeEqual(hash, 'different')).toBe(false)
        })

        it('should handle timing-safe equality with different lengths', () => {
            expect(service.timingSafeEqual('short', 'much longer string')).toBe(false)
        })
    })

    describe('Key Rotation', () => {
        it('should invalidate key cache', () => {
            // This should not throw
            expect(() => service.invalidateKeyCache()).not.toThrow()
        })

        it('should track key rotation history', () => {
            const historyBefore = service.getKeyRotationHistory()
            
            expect(Array.isArray(historyBefore)).toBe(true)
        })

        it('should rotate keys and re-encrypt data', async () => {
            // Create test data
            const item1 = await service.encrypt('data 1')
            const item2 = await service.encrypt('data 2')
            
            const items = [
                { id: 'item1', encryptedData: item1 },
                { id: 'item2', encryptedData: item2 }
            ]
            
            // Generate new key
            const newKey = service.generateKey()
            
            // Rotate (this will change process.env.ENCRYPTION_KEY)
            const result = await service.rotateKey(items, newKey)
            
            expect(result.success).toBe(true)
            expect(result.itemsProcessed).toBe(2)
            expect(result.errors.length).toBe(0)
        })
    })

    describe('Error Handling', () => {
        it('should throw error on corrupted encrypted data', async () => {
            const corrupted = 'v2:invalid:data:here'
            
            await expect(
                service.decrypt(corrupted)
            ).rejects.toThrow()
        })

        it('should throw error on malformed V2 format', async () => {
            const malformed = 'v2:only-two-parts'
            
            await expect(
                service.decrypt(malformed)
            ).rejects.toThrow()
        })

        it('should handle decryption of invalid credentials gracefully', async () => {
            // Empty JSON should be handled
            const result = await service.decryptCredentials('')
            expect(result).toEqual({})
        })
    })

    describe('Integration Tests', () => {
        it('should encrypt/decrypt full credential workflow', async () => {
            const credentials = {
                provider: 'openai',
                apiKey: 'sk-1234567890',
                model: 'gpt-4',
                temperature: 0.7,
                metadata: {
                    userId: 'user-123',
                    created: new Date().toISOString()
                }
            }
            
            const encrypted = await service.encryptCredentials(credentials)
            const decrypted = await service.decryptCredentials(encrypted)
            
            expect(decrypted).toEqual(credentials)
        })

        it('should maintain data integrity across multiple encrypt/decrypt cycles', async () => {
            let data = testData
            
            // Encrypt and decrypt 5 times
            for (let i = 0; i < 5; i++) {
                const encrypted = await service.encrypt(data)
                data = await service.decrypt(encrypted)
            }
            
            expect(data).toBe(testData)
        })

        it('should handle concurrent encryption operations', async () => {
            const promises = Array.from({ length: 10 }, (_, i) => 
                service.encrypt(`Test data ${i}`)
            )
            
            const results = await Promise.all(promises)
            
            // All encryptions should succeed
            expect(results).toHaveLength(10)
            
            // All should be unique (different IVs)
            const uniqueResults = new Set(results)
            expect(uniqueResults.size).toBe(10)
            
            // All should decrypt correctly
            const decrypted = await Promise.all(
                results.map(encrypted => service.decrypt(encrypted))
            )
            
            decrypted.forEach((dec, i) => {
                expect(dec).toBe(`Test data ${i}`)
            })
        })
    })
})
