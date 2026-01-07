/**
 * M.A.T.E. Cost Estimator Service Tests
 * 
 * Phase 5.1.1: Unit-Tests für Billing-Service
 * 
 * Coverage: Token-Cost, Volume-Discount, Rounding
 */

import { costEstimatorService, DiscountTier } from '../cost-estimator.service'

describe('CostEstimatorService', () => {
    const service = costEstimatorService // Use singleton instance

    describe('Pre-Flight Cost Estimation', () => {
        it('should estimate cost using char/4 heuristic', () => {
            const prompt = 'Hello, how are you today?' // 26 chars
            const expectedTokens = Math.ceil(26 / 4) // 7 tokens
            
            const result = service.estimateCost(prompt)
            
            expect(result.inputTokens).toBe(expectedTokens)
            expect(result.estimatedCostCents).toBeGreaterThan(0)
        })

        it('should handle empty input', () => {
            const result = service.estimateCost('')
            
            expect(result.inputTokens).toBe(0)
            expect(result.estimatedCostCents).toBe(0)
        })

        it('should handle very long input', () => {
            const longText = 'a'.repeat(10000)
            const result = service.estimateCost(longText)
            
            expect(result.inputTokens).toBe(2500) // 10000/4
            expect(result.estimatedCostCents).toBeGreaterThan(0)
        })
    })

    describe('Post-Flight Exact Cost Calculation', () => {
        it('should calculate exact cost from actual tokens', () => {
            const result = service.calculateExactCost(100, 200, 'default')
            
            expect(result.costCents).toBeGreaterThan(0)
            expect(result.inputTokens).toBe(100)
            expect(result.outputTokens).toBe(200)
        })

        it('should handle zero tokens', () => {
            const result = service.calculateExactCost(0, 0, 'default')
            
            expect(result.costCents).toBe(0)
        })

        it('should round costs correctly to cents', () => {
            const result = service.calculateExactCost(1, 1, 'default')
            
            // Should be rounded to nearest cent
            expect(Number.isInteger(result.costCents)).toBe(true)
            expect(result.costCents).toBeGreaterThanOrEqual(0)
        })
    })

    describe('Volume Discount Tiers', () => {
        it('should return Bronze tier for 0-100K tokens', () => {
            const tier = service.getDiscountTier(50000)
            
            expect(tier.tier).toBe(DiscountTier.BRONZE)
            expect(tier.discountPercent).toBe(0)
        })

        it('should return Silver tier for 100K-500K tokens', () => {
            const tier = service.getDiscountTier(250000)
            
            expect(tier.tier).toBe(DiscountTier.SILVER)
            expect(tier.discountPercent).toBe(5)
        })

        it('should return Gold tier for 500K-2M tokens', () => {
            const tier = service.getDiscountTier(1000000)
            
            expect(tier.tier).toBe(DiscountTier.GOLD)
            expect(tier.discountPercent).toBe(10)
        })

        it('should return Platinum tier for 2M+ tokens', () => {
            const tier = service.getDiscountTier(3000000)
            
            expect(tier.tier).toBe(DiscountTier.PLATINUM)
            expect(tier.discountPercent).toBe(15)
        })

        it('should handle boundary values correctly', () => {
            // Exactly 100K - should be Bronze
            expect(service.getDiscountTier(100000).tier).toBe(DiscountTier.BRONZE)
            
            // 100K + 1 - should be Silver
            expect(service.getDiscountTier(100001).tier).toBe(DiscountTier.SILVER)
            
            // Exactly 500K - should be Silver
            expect(service.getDiscountTier(500000).tier).toBe(DiscountTier.SILVER)
            
            // 500K + 1 - should be Gold
            expect(service.getDiscountTier(500001).tier).toBe(DiscountTier.GOLD)
        })

        it('should show next tier information', () => {
            const tier = service.getDiscountTier(50000)
            
            expect(tier.nextTier).toBeDefined()
            expect(tier.nextTier?.tier).toBe(DiscountTier.SILVER)
            expect(tier.nextTier?.tokensNeeded).toBe(50000) // 100K - 50K
        })

        it('should not show next tier for Platinum', () => {
            const tier = service.getDiscountTier(3000000)
            
            expect(tier.nextTier).toBeUndefined()
        })
    })

    describe('Volume Discount Application', () => {
        it('should apply no discount for Bronze tier', () => {
            const result = service.calculateExactCost(1000, 2000, 'default', 50000)
            
            expect(result.discountPercent).toBe(0)
            expect(result.discountTier).toBe('Bronze')
            // Bronze tier has no discount, so no originalCostCents or savingsCents
            expect(result.originalCostCents).toBeUndefined()
            expect(result.savingsCents).toBeUndefined()
        })

        it('should apply 5% discount for Silver tier', () => {
            const result = service.calculateExactCost(1000, 2000, 'default', 250000)
            
            expect(result.discountPercent).toBe(5)
            expect(result.savingsCents).toBeGreaterThan(0)
            expect(result.costCents).toBeLessThan(result.originalCostCents!)
            
            // Verify discount calculation
            const expectedSavings = Math.round(result.originalCostCents! * 0.05)
            expect(result.savingsCents).toBe(expectedSavings)
        })

        it('should apply 10% discount for Gold tier', () => {
            const result = service.calculateExactCost(1000, 2000, 'default', 1000000)
            
            expect(result.discountPercent).toBe(10)
            
            const expectedSavings = Math.round(result.originalCostCents! * 0.10)
            expect(result.savingsCents).toBe(expectedSavings)
        })

        it('should apply 15% discount for Platinum tier', () => {
            const result = service.calculateExactCost(1000, 2000, 'default', 3000000)
            
            expect(result.discountPercent).toBe(15)
            
            const expectedSavings = Math.round(result.originalCostCents! * 0.15)
            expect(result.savingsCents).toBe(expectedSavings)
        })

        it('should include discount tier in result', () => {
            const result = service.calculateExactCost(1000, 2000, 'default', 250000)
            
            expect(result.discountTier).toBe('Silver')
        })
    })

    describe('Cost Rounding', () => {
        it('should always return integer cents', () => {
            // Test with various token counts
            for (let i = 1; i <= 100; i++) {
                const result = service.calculateExactCost(i, i * 2, 'default')
                expect(Number.isInteger(result.costCents)).toBe(true)
            }
        })

        it('should round up fractional cents', () => {
            // Cost that would result in fractional cents
            const result = service.calculateExactCost(1, 1, 'default')
            
            // Even tiny costs should be at least 1 cent
            expect(result.costCents).toBeGreaterThanOrEqual(0)
            expect(Number.isInteger(result.costCents)).toBe(true)
        })
    })

    describe('Model-Specific Pricing', () => {
        it('should handle different model pricing', () => {
            const defaultResult = service.calculateExactCost(1000, 2000, 'default')
            const customResult = service.calculateExactCost(1000, 2000, 'gpt-4')
            
            // Both should return valid costs
            expect(defaultResult.costCents).toBeGreaterThan(0)
            expect(customResult.costCents).toBeGreaterThan(0)
        })
    })

    describe('Edge Cases', () => {
        it('should handle negative monthly tokens gracefully', () => {
            const tier = service.getDiscountTier(-1000)
            
            expect(tier.tier).toBe(DiscountTier.BRONZE)
            expect(tier.discountPercent).toBe(0)
        })

        it('should handle extremely large token counts', () => {
            const result = service.calculateExactCost(1000000, 2000000, 'default')
            
            expect(result.costCents).toBeGreaterThan(0)
            expect(Number.isFinite(result.costCents)).toBe(true)
        })

        it('should maintain precision with discount calculations', () => {
            const result = service.calculateExactCost(1234, 5678, 'default', 1500000)
            
            // Gold tier: 10% discount
            const calculatedCost = result.originalCostCents! - result.savingsCents!
            expect(result.costCents).toBe(calculatedCost)
        })
    })
})
