/**
 * M.A.T.E. Tour System - TourProvider
 * 
 * Context-basiertes Onboarding-System für neue Benutzer.
 * Zeigt Schritt-für-Schritt-Anleitungen für die wichtigsten Features.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'

// Tour Context
const TourContext = createContext(null)

// Custom Hook zum Zugriff auf Tour
export const useTour = () => {
    const context = useContext(TourContext)
    if (!context) {
        throw new Error('useTour muss innerhalb eines TourProvider verwendet werden')
    }
    return context
}

// LocalStorage Key für Tour-Status
const TOUR_STORAGE_KEY = 'mate_tour_completed'
const TOUR_DISMISSED_KEY = 'mate_tour_dismissed'

/**
 * TourProvider - Stellt Tour-Funktionalität bereit
 */
export const TourProvider = ({ children, steps = [] }) => {
    const [isActive, setIsActive] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [hasCompleted, setHasCompleted] = useState(false)
    const [hasDismissed, setHasDismissed] = useState(false)
    
    // Prüfe beim Start, ob Tour bereits abgeschlossen wurde
    useEffect(() => {
        const completed = localStorage.getItem(TOUR_STORAGE_KEY)
        const dismissed = localStorage.getItem(TOUR_DISMISSED_KEY)
        
        if (completed) {
            setHasCompleted(true)
        }
        if (dismissed) {
            setHasDismissed(true)
        }
    }, [])
    
    // Tour starten
    const startTour = useCallback(() => {
        setCurrentStep(0)
        setIsActive(true)
    }, [])
    
    // Tour beenden und als abgeschlossen markieren
    const completeTour = useCallback(() => {
        setIsActive(false)
        setHasCompleted(true)
        localStorage.setItem(TOUR_STORAGE_KEY, 'true')
    }, [])
    
    // Tour abbrechen (nicht als abgeschlossen markieren)
    const dismissTour = useCallback(() => {
        setIsActive(false)
        setHasDismissed(true)
        localStorage.setItem(TOUR_DISMISSED_KEY, 'true')
    }, [])
    
    // Zum nächsten Schritt
    const nextStep = useCallback(() => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1)
        } else {
            completeTour()
        }
    }, [currentStep, steps.length, completeTour])
    
    // Zum vorherigen Schritt
    const prevStep = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1)
        }
    }, [currentStep])
    
    // Zu bestimmtem Schritt springen
    const goToStep = useCallback((stepIndex) => {
        if (stepIndex >= 0 && stepIndex < steps.length) {
            setCurrentStep(stepIndex)
        }
    }, [steps.length])
    
    // Tour-Status zurücksetzen (für Tests oder erneutes Anzeigen)
    const resetTour = useCallback(() => {
        localStorage.removeItem(TOUR_STORAGE_KEY)
        localStorage.removeItem(TOUR_DISMISSED_KEY)
        setHasCompleted(false)
        setHasDismissed(false)
        setCurrentStep(0)
    }, [])
    
    const value = {
        // Status
        isActive,
        currentStep,
        totalSteps: steps.length,
        hasCompleted,
        hasDismissed,
        currentStepData: steps[currentStep] || null,
        
        // Aktionen
        startTour,
        completeTour,
        dismissTour,
        nextStep,
        prevStep,
        goToStep,
        resetTour,
        
        // Alle Steps
        steps
    }
    
    return (
        <TourContext.Provider value={value}>
            {children}
        </TourContext.Provider>
    )
}

TourProvider.propTypes = {
    children: PropTypes.node.isRequired,
    steps: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            title: PropTypes.string.isRequired,
            content: PropTypes.string.isRequired,
            target: PropTypes.string, // CSS-Selektor für das Ziel-Element
            placement: PropTypes.oneOf(['top', 'bottom', 'left', 'right', 'center']),
            action: PropTypes.string, // URL zu der navigiert werden soll
            highlight: PropTypes.bool // Ob das Ziel-Element hervorgehoben werden soll
        })
    )
}

export default TourProvider
