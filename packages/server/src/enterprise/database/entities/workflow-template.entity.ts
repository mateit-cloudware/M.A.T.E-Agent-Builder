/**
 * M.A.T.E. Workflow Template Entity
 * 
 * Phase 3.3.1: Template-Datenstruktur
 * 
 * Speichert vorgefertigte Workflow-Templates für schnellen Start
 */

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export enum TemplateCategory {
    VOICE_AGENT = 'voice_agent',
    CHATBOT = 'chatbot',
    SUPPORT = 'support',
    DATA_COLLECTION = 'data_collection',
    AUTOMATION = 'automation',
    CUSTOM = 'custom'
}

export enum TemplateComplexity {
    BEGINNER = 'beginner',      // 1-3 nodes, simple linear flow
    INTERMEDIATE = 'intermediate', // 4-6 nodes, some branching
    ADVANCED = 'advanced'         // 7+ nodes, complex logic
}

@Entity('workflow_templates')
export class WorkflowTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 255 })
    name: string

    @Column({ type: 'text' })
    description: string

    @Column({
        type: 'enum',
        enum: TemplateCategory,
        default: TemplateCategory.CUSTOM
    })
    category: TemplateCategory

    @Column({
        type: 'enum',
        enum: TemplateComplexity,
        default: TemplateComplexity.BEGINNER
    })
    complexity: TemplateComplexity

    /**
     * Template icon (emoji or icon name)
     */
    @Column({ type: 'varchar', length: 50, nullable: true })
    icon: string

    /**
     * Template color for UI
     */
    @Column({ type: 'varchar', length: 20, nullable: true })
    color: string

    /**
     * ReactFlow workflow data (nodes + edges as JSON)
     * Same format as chatflow.flowData
     */
    @Column({ type: 'text' })
    flowData: string

    /**
     * Tags for search/filtering
     */
    @Column({ type: 'simple-array', nullable: true })
    tags: string[]

    /**
     * Use case description (German)
     */
    @Column({ type: 'text', nullable: true })
    useCase: string

    /**
     * Setup instructions (German)
     */
    @Column({ type: 'text', nullable: true })
    setupInstructions: string

    /**
     * Required node types (to check if all nodes are available)
     */
    @Column({ type: 'simple-array', nullable: true })
    requiredNodeTypes: string[]

    /**
     * Estimated setup time in minutes
     */
    @Column({ type: 'int', nullable: true })
    estimatedSetupMinutes: number

    /**
     * Is this a featured template?
     */
    @Column({ type: 'boolean', default: false })
    isFeatured: boolean

    /**
     * Is this template active/published?
     */
    @Column({ type: 'boolean', default: true })
    isActive: boolean

    /**
     * Number of times this template was used
     */
    @Column({ type: 'int', default: 0 })
    usageCount: number

    /**
     * Average rating (1-5)
     */
    @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
    averageRating: number

    /**
     * Preview image URL
     */
    @Column({ type: 'varchar', length: 500, nullable: true })
    previewImageUrl: string

    /**
     * Created by user (null = system template)
     */
    @Column({ type: 'uuid', nullable: true })
    createdBy: string

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date
}
