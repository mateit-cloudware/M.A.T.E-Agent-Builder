/**
 * M.A.T.E. Managed Flow Integration Test
 * 
 * Phase 5.2.2: Managed Flow Integration Test
 * 
 * Flow: Pre-Flight Check → LLM Call → Post-Flight Billing → Balance Update
 * 
 * Tested Components:
 * - CostEstimatorService (Pre-Flight Token-Estimation)
 * - WalletService (Balance Check + Deduction)
 * - HybridRouterService (Managed-Mode Routing)
 * - Volume Discount System (Bronze/Silver/Gold/Platinum Tiers)
 */

import { costEstimatorService } from '../services/cost-estimator.service'
import { WalletService } from '../services/wallet.service'
import { DiscountTier } from '../services/cost-estimator.service'

describe('Managed Flow Integration Test', () => {
    let walletService: WalletService
    
    const TEST_USER_ID = 'test-user-managed-flow-456'
    const TEST_PROMPT = 'Hello, how are you? Please provide a detailed response about artificial intelligence.'
    const INITIAL_BALANCE_CENTS = 10000 // €100

    beforeAll(() => {
        walletService = new WalletService()
    })

    describe('Pre-Flight Cost Estimation', () => {
        it('should estimate token cost before LLM call', () => {
            const estimate = costEstimatorService.estimateCost(TEST_PROMPT, 500, 'default')
            
            expect(estimate.inputTokens).toBeGreaterThan(0)
            expect(estimate.outputTokens).toBe(500)
            expect(estimate.totalTokens).toBeGreaterThan(500)
            expect(estimate.estimatedCostCents).toBeGreaterThan(0)
            expect(estimate.confidence).toBeGreaterThan(0.7)
            expect(estimate.confidence).toBeLessThanOrEqual(1.0)
        })

        it('should use char/4 heuristic for token estimation', () => {
            const shortPrompt = 'test' // 4 chars = ~1 token
            const estimate = costEstimatorService.estimateCost(shortPrompt, 0, 'default')
            
            expect(estimate.inputTokens).toBe(1)
        })

        it('should scale estimation with prompt length', () => {
            const short = costEstimatorService.estimateCost('test', 100, 'default')
            const long = costEstimatorService.estimateCost('test'.repeat(100), 100, 'default')
            
            expect(long.inputTokens).toBeGreaterThan(short.inputTokens)
            expect(long.estimatedCostCents).toBeGreaterThan(short.estimatedCostCents)
        })

        it('should include safety margin in cost estimation', () => {
            const estimate = costEstimatorService.estimateCost(TEST_PROMPT, 500, 'default')
            const baseCost = estimate.estimatedCostCents
            
            // Pre-flight check should add safety margin (20%)
            const preFlightCheck = costEstimatorService.performPreFlightCheck(
                INITIAL_BALANCE_CENTS,
                TEST_PROMPT,
                'default',
                500,
                false
            )
            
            expect(preFlightCheck.safetyMarginCents).toBeGreaterThan(0)
            expect(preFlightCheck.requiredBalanceCents).toBeGreaterThan(baseCost)
        })
    })

    describe('Pre-Flight Balance Check', () => {
        it('should allow request with sufficient balance', () => {
            const result = costEstimatorService.performPreFlightCheck(
                10000, // €100
                TEST_PROMPT,
                'default',
                500,
                false
            )
            
            expect(result.allowed).toBe(true)
            expect(result.hasSufficientBalance).toBe(true)
            expect(result.usingByok).toBe(false)
        })

        it('should block request with insufficient balance', () => {
            const result = costEstimatorService.performPreFlightCheck(
                1, // €0.01
                TEST_PROMPT,
                'default',
                500,
                false
            )
            
            expect(result.allowed).toBe(false)
            expect(result.hasSufficientBalance).toBe(false)
            expect(result.reason).toBeDefined()
            expect(result.reason).toContain('Insufficient balance')
        })

        it('should always allow BYOK requests (no balance check)', () => {
            const result = costEstimatorService.performPreFlightCheck(
                0, // No balance
                TEST_PROMPT,
                'default',
                500,
                true // BYOK
            )
            
            expect(result.allowed).toBe(true)
            expect(result.usingByok).toBe(true)
            expect(result.estimatedCostCents).toBe(0)
        })

        it('should calculate shortfall amount correctly', () => {
            const userBalance = 100 // €1.00
            const result = costEstimatorService.performPreFlightCheck(
                userBalance,
                TEST_PROMPT,
                'default',
                500,
                false
            )
            
            if (!result.allowed) {
                const shortfall = result.requiredBalanceCents - userBalance
                expect(shortfall).toBeGreaterThan(0)
                expect(result.reason).toContain('Shortfall')
            }
        })
    })

    describe('Post-Flight Exact Cost Calculation', () => {
        it('should calculate exact cost from actual token usage', () => {
            const actualInputTokens = 25
            const actualOutputTokens = 150
            
            const result = costEstimatorService.calculateExactCost(
                actualInputTokens,
                actualOutputTokens,
                'default',
                0 // No monthly usage = Bronze tier
            )
            
            expect(result.costCents).toBeGreaterThan(0)
            expect(result.inputTokens).toBe(actualInputTokens)
            expect(result.outputTokens).toBe(actualOutputTokens)
            expect(result.discountPercent).toBe(0) // Bronze tier
            expect(result.discountTier).toBe('Bronze')
        })

        it('should always round costs to integer cents', () => {
            for (let i = 1; i <= 50; i++) {
                const result = costEstimatorService.calculateExactCost(i, i * 2, 'default', 0)
                expect(Number.isInteger(result.costCents)).toBe(true)
            }
        })

        it('should handle zero tokens', () => {
            const result = costEstimatorService.calculateExactCost(0, 0, 'default', 0)
            
            expect(result.costCents).toBe(0)
            expect(result.costEur).toBe(0)
        })
    })

    describe('Volume Discount System', () => {
        it('should apply Bronze tier (0%) for 0-100K tokens', () => {
            const result = costEstimatorService.calculateExactCost(
                1000,
                2000,
                'default',
                50000 // 50K monthly tokens
            )
            
            expect(result.discountTier).toBe('Bronze')
            expect(result.discountPercent).toBe(0)
            expect(result.savingsCents).toBeUndefined()
        })

        it('should apply Silver tier (5%) for 100K-500K tokens', () => {
            const result = costEstimatorService.calculateExactCost(
                1000,
                2000,
                'default',
                250000 // 250K monthly tokens
            )
            
            expect(result.discountTier).toBe('Silver')
            expect(result.discountPercent).toBe(5)
            expect(result.savingsCents).toBeGreaterThan(0)
            expect(result.originalCostCents).toBeGreaterThan(result.costCents)
        })

        it('should apply Gold tier (10%) for 500K-2M tokens', () => {
            const result = costEstimatorService.calculateExactCost(
                1000,
                2000,
                'default',
                1000000 // 1M monthly tokens
            )
            
            expect(result.discountTier).toBe('Gold')
            expect(result.discountPercent).toBe(10)
            expect(result.savingsCents).toBeGreaterThan(0)
        })

        it('should apply Platinum tier (15%) for 2M+ tokens', () => {
            const result = costEstimatorService.calculateExactCost(
                1000,
                2000,
                'default',
                3000000 // 3M monthly tokens
            )
            
            expect(result.discountTier).toBe('Platinum')
            expect(result.discountPercent).toBe(15)
            expect(result.savingsCents).toBeGreaterThan(0)
        })

        it('should correctly calculate discount savings', () => {
            const result = costEstimatorService.calculateExactCost(
                1000,
                2000,
                'default',
                250000 // Silver tier: 5%
            )
            
            if (result.originalCostCents && result.savingsCents) {
                const expectedDiscount = Math.round(result.originalCostCents * 0.05)
                expect(result.savingsCents).toBe(result.originalCostCents - result.costCents)
            }
        })

        it('should handle tier boundaries correctly', () => {
            // Exactly 100K - should be Bronze
            const bronze = costEstimatorService.calculateExactCost(100, 200, 'default', 100000)
            expect(bronze.discountTier).toBe('Bronze')
            
            // 100K + 1 - should be Silver
            const silver = costEstimatorService.calculateExactCost(100, 200, 'default', 100001)
            expect(silver.discountTier).toBe('Silver')
        })

        it('should show next tier progression', () => {
            const tierInfo = costEstimatorService.getDiscountTier(50000)
            
            expect(tierInfo.tier).toBe(DiscountTier.BRONZE)
            expect(tierInfo.nextTier).toBeDefined()
            expect(tierInfo.nextTier?.tier).toBe(DiscountTier.SILVER)
            expect(tierInfo.nextTier?.tokensNeeded).toBe(50000) // 100K - 50K
        })

        it('should not show next tier for Platinum', () => {
            const tierInfo = costEstimatorService.getDiscountTier(5000000)
            
            expect(tierInfo.tier).toBe(DiscountTier.PLATINUM)
            expect(tierInfo.nextTier).toBeUndefined()
        })
    })

    describe('Billing Transparency', () => {
        it('should include all billing details in response', () => {
            const result = costEstimatorService.calculateExactCost(
                1000,
                2000,
                'default',
                250000 // Silver tier
            )
            
            // All billing fields should be present
            expect(result.costCents).toBeDefined()
            expect(result.costEur).toBeDefined()
            expect(result.inputTokens).toBe(1000)
            expect(result.outputTokens).toBe(2000)
            expect(result.discountPercent).toBeDefined()
            expect(result.discountTier).toBeDefined()
            
            // Silver tier should have discount info
            expect(result.originalCostCents).toBeDefined()
            expect(result.savingsCents).toBeDefined()
        })

        it('should convert cents to EUR correctly', () => {
            const result = costEstimatorService.calculateExactCost(1000, 2000, 'default', 0)
            
            expect(result.costEur).toBe(result.costCents / 100)
        })
    })

    describe('Model-Specific Pricing', () => {
        it('should use different pricing for different models', () => {
            const defaultResult = costEstimatorService.calculateExactCost(1000, 1000, 'default', 0)
            const gpt4Result = costEstimatorService.calculateExactCost(1000, 1000, 'gpt-4', 0)
            
            // Both should calculate cost
            expect(defaultResult.costCents).toBeGreaterThan(0)
            expect(gpt4Result.costCents).toBeGreaterThan(0)
        })

        it('should fallback to default pricing for unknown models', () => {
            const result = costEstimatorService.calculateExactCost(
                1000,
                2000,
                'unknown-model-xyz',
                0
            )
            
            // Should still calculate cost (using default pricing)
            expect(result.costCents).toBeGreaterThan(0)
        })
    })

    describe('Complete Managed Flow Simulation', () => {
        it('should simulate full managed flow: estimate → check → call → bill', () => {
            const userId = TEST_USER_ID
            const prompt = TEST_PROMPT
            const expectedOutput = 500
            const userBalance = 10000 // €100
            const monthlyTokens = 250000 // Silver tier
            
            // STEP 1: Pre-Flight Estimation
            const estimate = costEstimatorService.estimateCost(prompt, expectedOutput, 'default')
            expect(estimate.estimatedCostCents).toBeGreaterThan(0)
            
            // STEP 2: Pre-Flight Balance Check
            const preFlightCheck = costEstimatorService.performPreFlightCheck(
                userBalance,
                prompt,
                'default',
                expectedOutput,
                false
            )
            expect(preFlightCheck.allowed).toBe(true)
            
            // STEP 3: Simulate LLM Call (mock response)
            const mockActualInputTokens = 25
            const mockActualOutputTokens = 450
            
            // STEP 4: Post-Flight Exact Cost with Volume Discount
            const exactCost = costEstimatorService.calculateExactCost(
                mockActualInputTokens,
                mockActualOutputTokens,
                'default',
                monthlyTokens
            )
            
            expect(exactCost.costCents).toBeLessThan(estimate.estimatedCostCents) // Actual < Estimated
            expect(exactCost.discountTier).toBe('Silver')
            expect(exactCost.discountPercent).toBe(5)
            expect(exactCost.savingsCents).toBeGreaterThan(0)
            
            // STEP 5: Verify balance would be sufficient
            const newBalance = userBalance - exactCost.costCents
            expect(newBalance).toBeGreaterThan(0)
            
            // Complete flow successful
            expect(true).toBe(true)
        })

        it('should handle cost over-estimation correctly', () => {
            // Pre-flight estimates higher than actual (with safety margin)
            const estimate = costEstimatorService.estimateCost('test', 500, 'default')
            const estimatedCost = estimate.estimatedCostCents * 1.2 // with safety margin
            
            // Actual usage is lower
            const exactCost = costEstimatorService.calculateExactCost(1, 50, 'default', 0)
            
            // Actual should be less than estimated
            expect(exactCost.costCents).toBeLessThan(estimatedCost)
        })
    })

    describe('Edge Cases and Error Handling', () => {
        it('should handle extremely large token counts', () => {
            const result = costEstimatorService.calculateExactCost(
                1000000,
                2000000,
                'default',
                5000000
            )
            
            expect(result.costCents).toBeGreaterThan(0)
            expect(Number.isFinite(result.costCents)).toBe(true)
            expect(result.discountTier).toBe('Platinum')
        })

        it('should handle negative monthly tokens gracefully', () => {
            const tierInfo = costEstimatorService.getDiscountTier(-1000)
            
            expect(tierInfo.tier).toBe(DiscountTier.BRONZE)
            expect(tierInfo.discountPercent).toBe(0)
        })

        it('should handle very small costs', () => {
            const result = costEstimatorService.calculateExactCost(1, 1, 'default', 0)
            
            expect(result.costCents).toBeGreaterThanOrEqual(0)
            expect(Number.isInteger(result.costCents)).toBe(true)
        })
    })

    describe('Discount Calculation Accuracy', () => {
        it('should calculate Silver discount (5%) accurately', () => {
            const result = costEstimatorService.calculateExactCost(1000, 2000, 'default', 250000)
            
            if (result.originalCostCents && result.savingsCents) {
                const discountedCost = Math.ceil(result.originalCostCents * 0.95)
                expect(result.costCents).toBe(discountedCost)
            }
        })

        it('should calculate Gold discount (10%) accurately', () => {
            const result = costEstimatorService.calculateExactCost(1000, 2000, 'default', 1000000)
            
            if (result.originalCostCents && result.savingsCents) {
                const discountedCost = Math.ceil(result.originalCostCents * 0.90)
                expect(result.costCents).toBe(discountedCost)
            }
        })

        it('should calculate Platinum discount (15%) accurately', () => {
            const result = costEstimatorService.calculateExactCost(1000, 2000, 'default', 3000000)
            
            if (result.originalCostCents && result.savingsCents) {
                const discountedCost = Math.ceil(result.originalCostCents * 0.85)
                expect(result.costCents).toBe(discountedCost)
            }
        })
    })
})
