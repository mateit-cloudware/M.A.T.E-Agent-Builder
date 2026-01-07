/**
 * M.A.T.E. Workflow Template Service
 * 
 * Phase 3.3.1: Template Storage und Management
 * 
 * Handles CRUD operations for workflow templates
 */

import { DataSource, Repository } from 'typeorm'
import { WorkflowTemplate, TemplateCategory, TemplateComplexity } from '../database/entities/workflow-template.entity'
import logger from '../../utils/logger'

// Using default logger instance

export class TemplateService {
    private templateRepository: Repository<WorkflowTemplate>

    constructor(private dataSource: DataSource) {
        this.templateRepository = this.dataSource.getRepository(WorkflowTemplate)
    }

    /**
     * Get all active templates
     */
    async getAllTemplates(filters?: {
        category?: TemplateCategory
        complexity?: TemplateComplexity
        tags?: string[]
        featuredOnly?: boolean
    }): Promise<WorkflowTemplate[]> {
        try {
            const query = this.templateRepository
                .createQueryBuilder('template')
                .where('template.isActive = :isActive', { isActive: true })
                .orderBy('template.isFeatured', 'DESC')
                .addOrderBy('template.usageCount', 'DESC')
                .addOrderBy('template.createdAt', 'DESC')

            if (filters?.category) {
                query.andWhere('template.category = :category', { category: filters.category })
            }

            if (filters?.complexity) {
                query.andWhere('template.complexity = :complexity', { complexity: filters.complexity })
            }

            if (filters?.featuredOnly) {
                query.andWhere('template.isFeatured = :isFeatured', { isFeatured: true })
            }

            if (filters?.tags && filters.tags.length > 0) {
                // Tags are stored as simple-array, so we need to check if any tag matches
                const tagConditions = filters.tags.map((tag, index) => 
                    `template.tags LIKE :tag${index}`
                ).join(' OR ')
                
                const tagParams: Record<string, string> = {}
                filters.tags.forEach((tag, index) => {
                    tagParams[`tag${index}`] = `%${tag}%`
                })

                query.andWhere(`(${tagConditions})`, tagParams)
            }

            return await query.getMany()
        } catch (error) {
            logger.error('Error getting templates:', error)
            throw error
        }
    }

    /**
     * Get template by ID
     */
    async getTemplateById(id: string): Promise<WorkflowTemplate | null> {
        try {
            return await this.templateRepository.findOne({
                where: { id, isActive: true }
            })
        } catch (error) {
            logger.error(`Error getting template ${id}:`, error)
            throw error
        }
    }

    /**
     * Create new template
     */
    async createTemplate(templateData: Partial<WorkflowTemplate>): Promise<WorkflowTemplate> {
        try {
            const template = this.templateRepository.create(templateData)
            return await this.templateRepository.save(template)
        } catch (error) {
            logger.error('Error creating template:', error)
            throw error
        }
    }

    /**
     * Update template
     */
    async updateTemplate(id: string, updateData: Partial<WorkflowTemplate>): Promise<WorkflowTemplate> {
        try {
            await this.templateRepository.update(id, updateData)
            const updated = await this.getTemplateById(id)
            if (!updated) {
                throw new Error(`Template ${id} not found after update`)
            }
            return updated
        } catch (error) {
            logger.error(`Error updating template ${id}:`, error)
            throw error
        }
    }

    /**
     * Delete template (soft delete by setting isActive = false)
     */
    async deleteTemplate(id: string): Promise<void> {
        try {
            await this.templateRepository.update(id, { isActive: false })
            logger.info(`Template ${id} deactivated`)
        } catch (error) {
            logger.error(`Error deleting template ${id}:`, error)
            throw error
        }
    }

    /**
     * Increment usage count when template is used
     */
    async incrementUsageCount(id: string): Promise<void> {
        try {
            await this.templateRepository.increment({ id }, 'usageCount', 1)
            logger.info(`Incremented usage count for template ${id}`)
        } catch (error) {
            logger.error(`Error incrementing usage count for ${id}:`, error)
            throw error
        }
    }

    /**
     * Update template rating
     */
    async updateRating(id: string, newRating: number): Promise<void> {
        try {
            const template = await this.getTemplateById(id)
            if (!template) {
                throw new Error(`Template ${id} not found`)
            }

            // Simple average calculation (can be improved with actual rating storage)
            const currentRating = template.averageRating || 0
            const usageCount = template.usageCount || 1
            const updatedRating = ((currentRating * usageCount) + newRating) / (usageCount + 1)

            await this.templateRepository.update(id, {
                averageRating: updatedRating
            })

            logger.info(`Updated rating for template ${id}: ${updatedRating}`)
        } catch (error) {
            logger.error(`Error updating rating for ${id}:`, error)
            throw error
        }
    }

    /**
     * Get featured templates
     */
    async getFeaturedTemplates(limit: number = 6): Promise<WorkflowTemplate[]> {
        try {
            return await this.templateRepository.find({
                where: { isFeatured: true, isActive: true },
                order: { usageCount: 'DESC', createdAt: 'DESC' },
                take: limit
            })
        } catch (error) {
            logger.error('Error getting featured templates:', error)
            throw error
        }
    }

    /**
     * Get popular templates (by usage count)
     */
    async getPopularTemplates(limit: number = 10): Promise<WorkflowTemplate[]> {
        try {
            return await this.templateRepository.find({
                where: { isActive: true },
                order: { usageCount: 'DESC', averageRating: 'DESC' },
                take: limit
            })
        } catch (error) {
            logger.error('Error getting popular templates:', error)
            throw error
        }
    }

    /**
     * Search templates by name or description
     */
    async searchTemplates(searchQuery: string): Promise<WorkflowTemplate[]> {
        try {
            return await this.templateRepository
                .createQueryBuilder('template')
                .where('template.isActive = :isActive', { isActive: true })
                .andWhere(
                    '(template.name LIKE :query OR template.description LIKE :query OR template.useCase LIKE :query)',
                    { query: `%${searchQuery}%` }
                )
                .orderBy('template.usageCount', 'DESC')
                .getMany()
        } catch (error) {
            logger.error(`Error searching templates for "${searchQuery}":`, error)
            throw error
        }
    }

    /**
     * Get templates by category with stats
     */
    async getTemplatesByCategory(): Promise<Record<string, { count: number; templates: WorkflowTemplate[] }>> {
        try {
            const allTemplates = await this.getAllTemplates()
            
            const categorized: Record<string, { count: number; templates: WorkflowTemplate[] }> = {}

            for (const category of Object.values(TemplateCategory)) {
                const categoryTemplates = allTemplates.filter(t => t.category === category)
                categorized[category] = {
                    count: categoryTemplates.length,
                    templates: categoryTemplates
                }
            }

            return categorized
        } catch (error) {
            logger.error('Error getting templates by category:', error)
            throw error
        }
    }

    /**
     * Validate template flow data
     * Checks if all required node types are present in flowData
     */
    validateTemplateFlowData(template: WorkflowTemplate): { valid: boolean; missingNodes: string[] } {
        try {
            const flowData = JSON.parse(template.flowData)
            const actualNodeTypes = flowData.nodes?.map((node: any) => node.data?.name) || []
            
            const missingNodes = (template.requiredNodeTypes || []).filter(
                required => !actualNodeTypes.includes(required)
            )

            return {
                valid: missingNodes.length === 0,
                missingNodes
            }
        } catch (error) {
            logger.error('Error validating template flow data:', error)
            return { valid: false, missingNodes: [] }
        }
    }
}

export default TemplateService
