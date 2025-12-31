/**
 * M.A.T.E. Tour System - TourStartButton
 * 
 * Button-Komponente zum manuellen Starten der Tour.
 * Kann in der Sidebar oder an anderen Stellen platziert werden.
 */

import { Tooltip, IconButton, Button, Chip, useTheme } from '@mui/material'
import { IconHelp, IconSparkles } from '@tabler/icons-react'
import { useTour } from './TourProvider'

/**
 * TourStartButton - Startet die Tour manuell
 */
export const TourStartButton = ({ variant = 'icon', size = 'medium' }) => {
    const theme = useTheme()
    const { startTour, hasCompleted, isActive } = useTour()
    
    if (isActive) return null
    
    if (variant === 'chip') {
        return (
            <Chip
                icon={<IconSparkles size={16} />}
                label="Tour starten"
                onClick={startTour}
                color="primary"
                size="small"
                sx={{ cursor: 'pointer' }}
            />
        )
    }
    
    if (variant === 'button') {
        return (
            <Button
                variant="outlined"
                startIcon={<IconSparkles size={18} />}
                onClick={startTour}
                size={size}
            >
                Tour starten
            </Button>
        )
    }
    
    // Default: Icon-Button
    return (
        <Tooltip title="Plattform-Tour starten">
            <IconButton
                onClick={startTour}
                size={size}
                sx={{
                    color: hasCompleted ? 'text.secondary' : 'primary.main'
                }}
            >
                <IconHelp size={size === 'small' ? 18 : 22} />
            </IconButton>
        </Tooltip>
    )
}

export default TourStartButton
