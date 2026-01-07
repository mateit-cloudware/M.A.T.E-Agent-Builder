/**
 * M.A.T.E. Validation Panel Component
 * 
 * Phase 3.2.3: Visuelle Hinweise für Workflow-Validierung
 * 
 * Zeigt Validierungsfehler, Warnungen und Hinweise in Echtzeit
 */

import React, { useState, useEffect } from 'react'
import {
    Box,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Chip,
    Collapse,
    IconButton,
    Badge,
    Tooltip,
    Button
} from '@mui/material'
import {
    IconChevronDown,
    IconChevronUp,
    IconAlertTriangle,
    IconAlertCircle,
    IconInfoCircle,
    IconCircleCheck,
    IconX
} from '@tabler/icons'
import {
    validateWorkflow,
    getValidationSummary,
    getValidationStatusText,
    getSeverityColor,
    getSeverityIcon,
    ValidationSeverity
} from '@/utils/workflowValidation'

/**
 * ValidationPanel Component
 * 
 * Shows real-time validation issues for the workflow
 * 
 * @param {Object} props
 * @param {Array} props.nodes - All nodes in workflow
 * @param {Array} props.edges - All edges in workflow
 * @param {Function} props.onIssueClick - Callback when clicking on issue
 * @param {Function} props.onFixClick - Callback when clicking fix button
 * @param {boolean} props.show - Whether to show panel
 */
export const ValidationPanel = ({
    nodes,
    edges,
    onIssueClick,
    onFixClick,
    show = true
}) => {
    const [issues, setIssues] = useState([])
    const [summary, setSummary] = useState(null)
    const [expanded, setExpanded] = useState(true)
    const [filter, setFilter] = useState('all') // 'all', 'errors', 'warnings', 'infos'
    
    useEffect(() => {
        const validationIssues = validateWorkflow(nodes, edges)
        const validationSummary = getValidationSummary(validationIssues)
        
        setIssues(validationIssues)
        setSummary(validationSummary)
        
        // Auto-expand if there are errors
        if (validationSummary.errors > 0) {
            setExpanded(true)
        }
    }, [nodes, edges])
    
    if (!show) return null
    
    // Filter issues based on selected filter
    const filteredIssues = filter === 'all' 
        ? issues 
        : issues.filter(issue => {
            if (filter === 'errors') return issue.severity === ValidationSeverity.ERROR
            if (filter === 'warnings') return issue.severity === ValidationSeverity.WARNING
            if (filter === 'infos') return issue.severity === ValidationSeverity.INFO
            return true
        })
    
    const statusColor = summary && summary.errors > 0 
        ? getSeverityColor(ValidationSeverity.ERROR)
        : summary && summary.warnings > 0
        ? getSeverityColor(ValidationSeverity.WARNING)
        : '#22c55e' // Green 500
    
    return (
        <Paper
            elevation={3}
            sx={{
                position: 'absolute',
                left: 20,
                top: 100,
                width: 340,
                maxHeight: '70vh',
                overflow: 'auto',
                zIndex: 1000,
                backgroundColor: 'background.paper',
                borderRadius: 2,
                border: '2px solid',
                borderColor: statusColor
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: statusColor,
                    color: 'white',
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {summary && summary.errors === 0 ? (
                        <IconCircleCheck size={20} />
                    ) : (
                        <IconAlertTriangle size={20} />
                    )}
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Workflow-Validierung
                    </Typography>
                </Box>
                
                <IconButton
                    size="small"
                    onClick={() => setExpanded(!expanded)}
                    sx={{ color: 'white' }}
                >
                    {expanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                </IconButton>
            </Box>
            
            <Collapse in={expanded}>
                <Box sx={{ p: 2 }}>
                    {/* Summary */}
                    {summary && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                {getValidationStatusText(summary)}
                            </Typography>
                            
                            {/* Filter Chips */}
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip
                                    label={`Alle (${summary.total})`}
                                    size="small"
                                    onClick={() => setFilter('all')}
                                    color={filter === 'all' ? 'primary' : 'default'}
                                />
                                {summary.errors > 0 && (
                                    <Chip
                                        label={`Fehler (${summary.errors})`}
                                        size="small"
                                        onClick={() => setFilter('errors')}
                                        color={filter === 'errors' ? 'error' : 'default'}
                                    />
                                )}
                                {summary.warnings > 0 && (
                                    <Chip
                                        label={`Warnungen (${summary.warnings})`}
                                        size="small"
                                        onClick={() => setFilter('warnings')}
                                        color={filter === 'warnings' ? 'warning' : 'default'}
                                    />
                                )}
                                {summary.infos > 0 && (
                                    <Chip
                                        label={`Hinweise (${summary.infos})`}
                                        size="small"
                                        onClick={() => setFilter('infos')}
                                        color={filter === 'infos' ? 'info' : 'default'}
                                    />
                                )}
                            </Box>
                        </Box>
                    )}
                    
                    {/* Issues List */}
                    {filteredIssues.length > 0 ? (
                        <List dense sx={{ py: 0 }}>
                            {filteredIssues.map((issue, index) => (
                                <ValidationIssueItem
                                    key={index}
                                    issue={issue}
                                    onClick={() => onIssueClick && onIssueClick(issue)}
                                    onFixClick={() => onFixClick && onFixClick(issue)}
                                />
                            ))}
                        </List>
                    ) : (
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                Keine {filter === 'all' ? 'Probleme' : filter} gefunden
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Collapse>
        </Paper>
    )
}

/**
 * Single Validation Issue Item
 */
const ValidationIssueItem = ({ issue, onClick, onFixClick }) => {
    const severityColor = getSeverityColor(issue.severity)
    const severityIcon = getSeverityIcon(issue.severity)
    
    return (
        <ListItem
            disablePadding
            sx={{
                mb: 1,
                '&:last-child': { mb: 0 }
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    width: '100%',
                    p: 1.5,
                    border: '1px solid',
                    borderColor: severityColor,
                    borderLeft: `4px solid ${severityColor}`,
                    borderRadius: 1,
                    cursor: onClick ? 'pointer' : 'default',
                    '&:hover': onClick ? {
                        backgroundColor: `${severityColor}10`
                    } : {}
                }}
                onClick={onClick}
            >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ fontSize: '1rem', mt: 0.5 }}>
                        {severityIcon}
                    </Box>
                    
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {issue.message}
                        </Typography>
                        
                        {issue.fix && (
                            <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ display: 'block', mt: 0.5 }}
                            >
                                💡 {issue.fix}
                            </Typography>
                        )}
                        
                        {issue.nodeIds && issue.nodeIds.length > 0 && (
                            <Box sx={{ mt: 0.5 }}>
                                <Chip
                                    label={`${issue.nodeIds.length} Node${issue.nodeIds.length > 1 ? 's' : ''}`}
                                    size="small"
                                    sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        backgroundColor: `${severityColor}20`,
                                        color: severityColor
                                    }}
                                />
                            </Box>
                        )}
                    </Box>
                    
                    {onFixClick && issue.fix && (
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation()
                                onFixClick()
                            }}
                            sx={{ ml: 1 }}
                        >
                            <IconX size={16} />
                        </IconButton>
                    )}
                </Box>
            </Paper>
        </ListItem>
    )
}

/**
 * Compact Validation Badge
 * 
 * Shows a small badge with validation status
 * Floats on canvas, clicking opens full panel
 */
export const ValidationBadge = ({ nodes, edges, onClick }) => {
    const [summary, setSummary] = useState(null)
    
    useEffect(() => {
        const issues = validateWorkflow(nodes, edges)
        const validationSummary = getValidationSummary(issues)
        setSummary(validationSummary)
    }, [nodes, edges])
    
    if (!summary) return null
    
    const hasIssues = summary.total > 0
    const color = summary.errors > 0
        ? '#ef4444' // Red
        : summary.warnings > 0
        ? '#f59e0b' // Amber
        : '#22c55e' // Green
    
    return (
        <Tooltip 
            title={getValidationStatusText(summary)}
            placement="left"
            arrow
        >
            <Badge
                badgeContent={summary.errors + summary.warnings}
                color={summary.errors > 0 ? 'error' : 'warning'}
                sx={{
                    position: 'absolute',
                    left: 20,
                    bottom: 20,
                    zIndex: 999,
                    cursor: 'pointer'
                }}
                onClick={onClick}
            >
                <Paper
                    elevation={3}
                    sx={{
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: 'background.paper',
                        border: '2px solid',
                        borderColor: color,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                    }}
                >
                    {summary.errors === 0 && summary.warnings === 0 ? (
                        <IconCircleCheck size={20} color={color} />
                    ) : summary.errors > 0 ? (
                        <IconAlertCircle size={20} color={color} />
                    ) : (
                        <IconAlertTriangle size={20} color={color} />
                    )}
                    
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {summary.errors === 0 && summary.warnings === 0 
                            ? 'OK' 
                            : `${summary.errors + summary.warnings}`
                        }
                    </Typography>
                </Paper>
            </Badge>
        </Tooltip>
    )
}

export default ValidationPanel
