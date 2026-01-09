import { useSelector } from 'react-redux'

import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline, StyledEngineProvider } from '@mui/material'

// routing
import Routes from '@/routes'

// defaultTheme
import themes from '@/themes'

// project imports
import NavigationScroll from '@/layout/NavigationScroll'
import { ErrorBoundary } from '@/ui-component/error'

// tour system
import { TourProvider, TourOverlay, tourSteps } from '@/ui-component/tour'

// ==============================|| APP ||============================== //

const App = () => {
    const customization = useSelector((state) => state.customization)

    return (
        <ErrorBoundary level="root">
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={themes(customization)}>
                    <CssBaseline />
                    <TourProvider steps={tourSteps}>
                        <NavigationScroll>
                            <Routes />
                        </NavigationScroll>
                        <TourOverlay />
                    </TourProvider>
                </ThemeProvider>
            </StyledEngineProvider>
        </ErrorBoundary>
    )
}

export default App
