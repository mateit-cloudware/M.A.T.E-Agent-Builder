/**
 * M.A.T.E. AI Agent Builder Wizard
 * 
 * Ein geführter Wizard für die KI-gestützte Erstellung von Agenten.
 * Benutzer beschreiben ihr Ziel, die KI generiert einen passenden Agenten.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Stepper,
    Step,
    StepLabel,
    Grid,
    Paper,
    CircularProgress,
    Alert,
    Chip,
    IconButton,
    Fade,
    LinearProgress
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
    IconPhone,
    IconMessageCircle,
    IconWand,
    IconArrowRight,
    IconArrowLeft,
    IconCheck,
    IconSparkles,
    IconBuildingStore,
    IconHeartbeat,
    IconCut,
    IconHome,
    IconTools,
    IconDots,
    IconRocket,
    IconBulb
} from '@tabler/icons-react'

import MainCard from '@/ui-component/cards/MainCard'
import agentGeneratorApi from '@/api/agentGenerator'

// Wizard Steps
const steps = [
    { id: 'welcome', label: 'Start' },
    { id: 'describe', label: 'Beschreibung' },
    { id: 'type', label: 'Typ wählen' },
    { id: 'industry', label: 'Branche' },
    { id: 'generate', label: 'Erstellen' }
]

// Agent Types
const agentTypes = [
    {
        id: 'voice',
        label: 'Voice / Telefon',
        description: 'Für Telefonanrufe und Sprachassistenten',
        icon: IconPhone
    },
    {
        id: 'chat',
        label: 'Chat / Website',
        description: 'Für Website-Chat und Messaging',
        icon: IconMessageCircle
    },
    {
        id: 'auto',
        label: 'Automatisch wählen',
        description: 'KI wählt den besten Typ basierend auf deiner Beschreibung',
        icon: IconWand
    }
]

// Industries
const industries = [
    { id: 'healthcare', label: 'Gesundheitswesen', icon: IconHeartbeat },
    { id: 'retail', label: 'Einzelhandel', icon: IconBuildingStore },
    { id: 'hospitality', label: 'Gastronomie / Hotel', icon: IconCut },
    { id: 'services', label: 'Dienstleistungen', icon: IconTools },
    { id: 'real-estate', label: 'Immobilien', icon: IconHome },
    { id: 'other', label: 'Andere', icon: IconDots }
]

// Example Prompts
const examplePrompts = [
    'Ein Telefonassistent für meine Zahnarztpraxis, der Termine vereinbart',
    'Ein Chat-Bot der häufige Fragen zu meinem Online-Shop beantwortet',
    'Ein Voice-Agent für meinen Friseursalon, der Verfügbarkeiten prüft',
    'Ein Support-Agent der technische Probleme löst und Tickets erstellt'
]

const AIAgentWizard = () => {
    const theme = useTheme()
    const navigate = useNavigate()
    
    const [activeStep, setActiveStep] = useState(0)
    const [description, setDescription] = useState('')
    const [selectedType, setSelectedType] = useState('auto')
    const [selectedIndustry, setSelectedIndustry] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [generatedAgent, setGeneratedAgent] = useState(null)
    const [error, setError] = useState(null)
    const [progress, setProgress] = useState(0)

    // Handle next step
    const handleNext = () => {
        if (activeStep === steps.length - 2) {
            // Start generation
            generateAgent()
        } else {
            setActiveStep((prev) => prev + 1)
        }
    }

    // Handle back step
    const handleBack = () => {
        setActiveStep((prev) => prev - 1)
        setError(null)
    }

    // Check if can proceed
    const canProceed = () => {
        switch (activeStep) {
            case 0:
                return true
            case 1:
                return description.trim().length >= 10
            case 2:
                return !!selectedType
            case 3:
                return !!selectedIndustry
            default:
                return false
        }
    }

    // Generate agent via API
    const generateAgent = async () => {
        setActiveStep(steps.length - 1)
        setIsGenerating(true)
        setError(null)
        setProgress(0)

        // Simulate progress
        const progressInterval = setInterval(() => {
            setProgress((prev) => Math.min(prev + 10, 90))
        }, 500)

        try {
            const response = await agentGeneratorApi.generateAgent({
                description,
                preferredType: selectedType,
                language: 'de',
                industry: selectedIndustry
            })

            clearInterval(progressInterval)
            setProgress(100)
            
            if (response.data?.success) {
                setGeneratedAgent(response.data.data)
            } else {
                throw new Error(response.data?.message || 'Generierung fehlgeschlagen')
            }
        } catch (err) {
            clearInterval(progressInterval)
            console.error('Generation error:', err)
            setError(err.response?.data?.message || err.message || 'Ein Fehler ist aufgetreten')
        } finally {
            setIsGenerating(false)
        }
    }

    // Save and redirect to canvas
    const handleSaveAndEdit = async () => {
        if (!generatedAgent) return
        
        try {
            const response = await agentGeneratorApi.saveAgent({ agent: generatedAgent })
            if (response.data?.success) {
                const { id, type } = response.data.data
                // Redirect to canvas
                navigate(type === 'agentflow' ? `/agentcanvas/${id}` : `/canvas/${id}`)
            }
        } catch (err) {
            setError('Speichern fehlgeschlagen: ' + (err.message || 'Unbekannter Fehler'))
        }
    }

    // Use example prompt
    const useExample = (example) => {
        setDescription(example)
    }

    // Render welcome step
    const renderWelcomeStep = () => (
        <Fade in={activeStep === 0}>
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <IconSparkles size={64} stroke={1.5} color={theme.palette.primary.main} />
                <Typography variant="h2" sx={{ mt: 3, mb: 2, fontWeight: 600 }}>
                    Willkommen beim Agent-Builder
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
                    Erstelle deinen persönlichen KI-Agenten in wenigen Minuten.
                    Beschreibe einfach, was dein Agent können soll – die KI erledigt den Rest.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap', mb: 4 }}>
                    <Chip icon={<IconPhone size={16} />} label="Voice-Agenten" variant="outlined" />
                    <Chip icon={<IconMessageCircle size={16} />} label="Chat-Bots" variant="outlined" />
                    <Chip icon={<IconWand size={16} />} label="KI-generiert" variant="outlined" />
                </Box>
                <Button
                    variant="contained"
                    size="large"
                    endIcon={<IconArrowRight />}
                    onClick={handleNext}
                    sx={{ px: 6, py: 1.5 }}
                >
                    Los geht's
                </Button>
            </Box>
        </Fade>
    )

    // Render description step
    const renderDescribeStep = () => (
        <Fade in={activeStep === 1}>
            <Box sx={{ py: 2 }}>
                <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
                    Was soll dein Agent können?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Beschreibe in eigenen Worten, welche Aufgaben dein Agent übernehmen soll.
                </Typography>
                
                <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="z.B. Ein Telefonassistent der Termine für mein Restaurant bucht, Öffnungszeiten nennt und Reservierungen entgegennimmt..."
                    sx={{ mb: 3 }}
                    helperText={`${description.length}/10+ Zeichen`}
                />

                <Typography variant="subtitle2" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconBulb size={18} />
                    Beispiele zur Inspiration:
                </Typography>
                <Grid container spacing={1}>
                    {examplePrompts.map((example, index) => (
                        <Grid item xs={12} sm={6} key={index}>
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 1.5,
                                    cursor: 'pointer',
                                    '&:hover': {
                                        bgcolor: 'action.hover',
                                        borderColor: 'primary.main'
                                    }
                                }}
                                onClick={() => useExample(example)}
                            >
                                <Typography variant="body2">{example}</Typography>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            </Box>
        </Fade>
    )

    // Render type selection step
    const renderTypeStep = () => (
        <Fade in={activeStep === 2}>
            <Box sx={{ py: 2 }}>
                <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
                    Wie soll dein Agent kommunizieren?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Wähle den Kommunikationskanal für deinen Agenten.
                </Typography>
                
                <Grid container spacing={2}>
                    {agentTypes.map((type) => {
                        const Icon = type.icon
                        const isSelected = selectedType === type.id
                        return (
                            <Grid item xs={12} sm={4} key={type.id}>
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 3,
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        borderColor: isSelected ? 'primary.main' : 'divider',
                                        bgcolor: isSelected ? 'primary.lighter' : 'background.paper',
                                        borderWidth: isSelected ? 2 : 1,
                                        '&:hover': {
                                            borderColor: 'primary.main',
                                            bgcolor: 'action.hover'
                                        }
                                    }}
                                    onClick={() => setSelectedType(type.id)}
                                >
                                    <Icon 
                                        size={40} 
                                        stroke={1.5} 
                                        color={isSelected ? theme.palette.primary.main : theme.palette.text.secondary} 
                                    />
                                    <Typography variant="h6" sx={{ mt: 2, mb: 0.5 }}>
                                        {type.label}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {type.description}
                                    </Typography>
                                </Paper>
                            </Grid>
                        )
                    })}
                </Grid>
            </Box>
        </Fade>
    )

    // Render industry step
    const renderIndustryStep = () => (
        <Fade in={activeStep === 3}>
            <Box sx={{ py: 2 }}>
                <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
                    In welcher Branche bist du tätig?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Hilft uns, den Agenten besser an deine Bedürfnisse anzupassen.
                </Typography>
                
                <Grid container spacing={2}>
                    {industries.map((industry) => {
                        const Icon = industry.icon
                        const isSelected = selectedIndustry === industry.id
                        return (
                            <Grid item xs={6} sm={4} key={industry.id}>
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 2,
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        borderColor: isSelected ? 'primary.main' : 'divider',
                                        bgcolor: isSelected ? 'primary.lighter' : 'background.paper',
                                        borderWidth: isSelected ? 2 : 1,
                                        '&:hover': {
                                            borderColor: 'primary.main',
                                            bgcolor: 'action.hover'
                                        }
                                    }}
                                    onClick={() => setSelectedIndustry(industry.id)}
                                >
                                    <Icon 
                                        size={32} 
                                        stroke={1.5} 
                                        color={isSelected ? theme.palette.primary.main : theme.palette.text.secondary} 
                                    />
                                    <Typography variant="subtitle1" sx={{ mt: 1 }}>
                                        {industry.label}
                                    </Typography>
                                </Paper>
                            </Grid>
                        )
                    })}
                </Grid>
            </Box>
        </Fade>
    )

    // Render generation step
    const renderGenerateStep = () => (
        <Fade in={activeStep === 4}>
            <Box sx={{ py: 4, textAlign: 'center' }}>
                {isGenerating ? (
                    <>
                        <CircularProgress size={60} thickness={3} />
                        <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
                            Dein Agent wird erstellt...
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Die KI analysiert deine Anforderungen und erstellt einen maßgeschneiderten Agenten.
                        </Typography>
                        <LinearProgress variant="determinate" value={progress} sx={{ maxWidth: 400, mx: 'auto' }} />
                    </>
                ) : error ? (
                    <>
                        <Alert severity="error" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
                            {error}
                        </Alert>
                        <Button variant="outlined" onClick={() => setActiveStep(1)}>
                            Nochmal versuchen
                        </Button>
                    </>
                ) : generatedAgent ? (
                    <>
                        <IconCheck size={60} color={theme.palette.success.main} />
                        <Typography variant="h4" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
                            {generatedAgent.config?.name || 'Agent erstellt!'}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                            {generatedAgent.config?.description}
                        </Typography>
                        
                        <Box sx={{ 
                            bgcolor: 'grey.50', 
                            p: 3, 
                            borderRadius: 2, 
                            maxWidth: 500, 
                            mx: 'auto',
                            mb: 3,
                            textAlign: 'left'
                        }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Empfehlung:
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                <strong>Typ:</strong> {generatedAgent.recommendation?.type?.toUpperCase()}
                                {' • '}
                                <strong>Konfidenz:</strong> {Math.round((generatedAgent.recommendation?.confidence || 0) * 100)}%
                            </Typography>
                            <Typography variant="body2">
                                {generatedAgent.recommendation?.reasoning}
                            </Typography>
                        </Box>

                        {generatedAgent.quickStartTips?.length > 0 && (
                            <Box sx={{ mb: 3, maxWidth: 500, mx: 'auto', textAlign: 'left' }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Nächste Schritte:
                                </Typography>
                                {generatedAgent.quickStartTips.map((tip, index) => (
                                    <Typography key={index} variant="body2" sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                                        <span>•</span> {tip}
                                    </Typography>
                                ))}
                            </Box>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                            <Button variant="outlined" onClick={() => navigate('/agentflows')}>
                                Zur Übersicht
                            </Button>
                            <Button
                                variant="contained"
                                endIcon={<IconRocket size={18} />}
                                onClick={handleSaveAndEdit}
                            >
                                Agent bearbeiten
                            </Button>
                        </Box>
                    </>
                ) : null}
            </Box>
        </Fade>
    )

    // Render current step content
    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return renderWelcomeStep()
            case 1:
                return renderDescribeStep()
            case 2:
                return renderTypeStep()
            case 3:
                return renderIndustryStep()
            case 4:
                return renderGenerateStep()
            default:
                return null
        }
    }

    return (
        <MainCard>
            <Box sx={{ maxWidth: 900, mx: 'auto', py: 2 }}>
                {/* Stepper */}
                {activeStep > 0 && activeStep < steps.length - 1 && (
                    <Stepper activeStep={activeStep - 1} sx={{ mb: 4 }}>
                        {steps.slice(1, -1).map((step) => (
                            <Step key={step.id}>
                                <StepLabel>{step.label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                )}

                {/* Step Content */}
                {renderStepContent()}

                {/* Navigation Buttons */}
                {activeStep > 0 && activeStep < steps.length - 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                        <Button
                            variant="outlined"
                            startIcon={<IconArrowLeft />}
                            onClick={handleBack}
                        >
                            Zurück
                        </Button>
                        <Button
                            variant="contained"
                            endIcon={activeStep === steps.length - 2 ? <IconSparkles /> : <IconArrowRight />}
                            onClick={handleNext}
                            disabled={!canProceed()}
                        >
                            {activeStep === steps.length - 2 ? 'Agent erstellen' : 'Weiter'}
                        </Button>
                    </Box>
                )}
            </Box>
        </MainCard>
    )
}

export default AIAgentWizard
