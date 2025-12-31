/**
 * M.A.T.E. Tour System - TourOverlay
 * 
 * Overlay-Komponente die den aktuellen Tour-Schritt anzeigt.
 * Positioniert sich relativ zum Ziel-Element oder zentral.
 */

import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Box,
    Paper,
    Typography,
    Button,
    IconButton,
    Stack,
    LinearProgress,
    Fade,
    Backdrop,
    useTheme
} from '@mui/material'
import {
    IconX,
    IconArrowLeft,
    IconArrowRight,
    IconCheck,
    IconSparkles
} from '@tabler/icons-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTour } from './TourProvider'

/**
 * TourOverlay - Zeigt den aktuellen Tour-Schritt an
 */
const TourOverlay = () => {
    const theme = useTheme()
    const navigate = useNavigate()
    const {
        isActive,
        currentStep,
        totalSteps,
        currentStepData,
        nextStep,
        prevStep,
        dismissTour,
        completeTour
    } = useTour()
    
    const [position, setPosition] = useState({ top: '50%', left: '50%' })
    const [targetRect, setTargetRect] = useState(null)
    const tooltipRef = useRef(null)
    
    // Positionierung basierend auf Ziel-Element
    useEffect(() => {
        if (!isActive || !currentStepData) return
        
        // Navigation zur Ziel-Seite wenn definiert
        if (currentStepData.action) {
            navigate(currentStepData.action)
            // Warte kurz auf Navigation
            setTimeout(() => calculatePosition(), 300)
        } else {
            calculatePosition()
        }
    }, [isActive, currentStep, currentStepData, navigate])
    
    const calculatePosition = () => {
        if (!currentStepData?.target) {
            // Zentriert anzeigen
            setPosition({ top: '50%', left: '50%' })
            setTargetRect(null)
            return
        }
        
        const targetEl = document.querySelector(currentStepData.target)
        if (!targetEl) {
            setPosition({ top: '50%', left: '50%' })
            setTargetRect(null)
            return
        }
        
        const rect = targetEl.getBoundingClientRect()
        setTargetRect(rect)
        
        const placement = currentStepData.placement || 'bottom'
        const tooltipHeight = 200 // Geschätzte Höhe
        const tooltipWidth = 360 // Feste Breite
        const gap = 16
        
        let top, left
        
        switch (placement) {
            case 'top':
                top = rect.top - tooltipHeight - gap
                left = rect.left + rect.width / 2 - tooltipWidth / 2
                break
            case 'bottom':
                top = rect.bottom + gap
                left = rect.left + rect.width / 2 - tooltipWidth / 2
                break
            case 'left':
                top = rect.top + rect.height / 2 - tooltipHeight / 2
                left = rect.left - tooltipWidth - gap
                break
            case 'right':
                top = rect.top + rect.height / 2 - tooltipHeight / 2
                left = rect.right + gap
                break
            default:
                top = window.innerHeight / 2 - tooltipHeight / 2
                left = window.innerWidth / 2 - tooltipWidth / 2
        }
        
        // Grenzen prüfen
        top = Math.max(gap, Math.min(top, window.innerHeight - tooltipHeight - gap))
        left = Math.max(gap, Math.min(left, window.innerWidth - tooltipWidth - gap))
        
        setPosition({ top: `${top}px`, left: `${left}px` })
    }
    
    // Window-Resize-Listener
    useEffect(() => {
        const handleResize = () => {
            if (isActive) calculatePosition()
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [isActive, currentStepData])
    
    if (!isActive || !currentStepData) return null
    
    const progress = ((currentStep + 1) / totalSteps) * 100
    const isLastStep = currentStep === totalSteps - 1
    const isFirstStep = currentStep === 0
    
    return (
        <>
            {/* Backdrop */}
            <Backdrop
                open={isActive}
                sx={{
                    zIndex: theme.zIndex.modal - 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)'
                }}
            />
            
            {/* Highlight-Bereich um das Ziel-Element */}
            {targetRect && currentStepData.highlight && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: targetRect.top - 8,
                        left: targetRect.left - 8,
                        width: targetRect.width + 16,
                        height: targetRect.height + 16,
                        border: `3px solid ${theme.palette.primary.main}`,
                        borderRadius: 2,
                        zIndex: theme.zIndex.modal,
                        pointerEvents: 'none',
                        boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.5)`,
                        animation: 'pulse 2s infinite'
                    }}
                />
            )}
            
            {/* Tour-Tooltip */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -20 }}
                    transition={{ duration: 0.3 }}
                    style={{
                        position: 'fixed',
                        top: position.top,
                        left: position.left,
                        transform: targetRect ? 'none' : 'translate(-50%, -50%)',
                        zIndex: theme.zIndex.modal + 1
                    }}
                    ref={tooltipRef}
                >
                    <Paper
                        elevation={8}
                        sx={{
                            width: 360,
                            maxWidth: '90vw',
                            borderRadius: 3,
                            overflow: 'hidden'
                        }}
                    >
                        {/* Progress-Leiste */}
                        <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{ height: 4 }}
                        />
                        
                        {/* Header */}
                        <Box sx={{ p: 2, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <IconSparkles size={20} color={theme.palette.primary.main} />
                                <Typography variant="caption" color="primary">
                                    Schritt {currentStep + 1} von {totalSteps}
                                </Typography>
                            </Stack>
                            <IconButton size="small" onClick={dismissTour}>
                                <IconX size={18} />
                            </IconButton>
                        </Box>
                        
                        {/* Inhalt */}
                        <Box sx={{ px: 2, pb: 2 }}>
                            <Typography variant="h5" fontWeight="bold" gutterBottom>
                                {currentStepData.title}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ lineHeight: 1.7 }}>
                                {currentStepData.content}
                            </Typography>
                        </Box>
                        
                        {/* Aktionen */}
                        <Box sx={{ px: 2, pb: 2, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                            <Button
                                variant="text"
                                color="inherit"
                                onClick={dismissTour}
                                size="small"
                            >
                                Überspringen
                            </Button>
                            
                            <Stack direction="row" spacing={1}>
                                {!isFirstStep && (
                                    <Button
                                        variant="outlined"
                                        onClick={prevStep}
                                        startIcon={<IconArrowLeft size={16} />}
                                        size="small"
                                    >
                                        Zurück
                                    </Button>
                                )}
                                <Button
                                    variant="contained"
                                    onClick={isLastStep ? completeTour : nextStep}
                                    endIcon={isLastStep ? <IconCheck size={16} /> : <IconArrowRight size={16} />}
                                    size="small"
                                >
                                    {isLastStep ? 'Fertig' : 'Weiter'}
                                </Button>
                            </Stack>
                        </Box>
                    </Paper>
                </motion.div>
            </AnimatePresence>
            
            {/* Pulse Animation CSS */}
            <style>{`
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 ${theme.palette.primary.main}40; }
                    70% { box-shadow: 0 0 0 10px ${theme.palette.primary.main}00; }
                    100% { box-shadow: 0 0 0 0 ${theme.palette.primary.main}00; }
                }
            `}</style>
        </>
    )
}

export default TourOverlay
