/**
 * M.A.T.E. Tour Steps
 * 
 * Definition der Onboarding-Tour-Schritte für neue Benutzer.
 */

export const tourSteps = [
    {
        id: 'welcome',
        title: 'Willkommen bei M.A.T.E.!',
        content: 'M.A.T.E. ist deine Plattform für intelligente KI-Agenten. Diese kurze Tour zeigt dir die wichtigsten Funktionen.',
        placement: 'center',
        highlight: false
    },
    {
        id: 'wizard',
        title: 'Agent erstellen',
        content: 'Mit unserem KI-gestützten Wizard kannst du in wenigen Schritten einen neuen Agenten erstellen. Beschreibe einfach, was dein Agent tun soll - die KI kümmert sich um den Rest.',
        target: '[href="/wizard"]',
        placement: 'right',
        action: '/wizard',
        highlight: true
    },
    {
        id: 'chatflows',
        title: 'Chat-Agenten',
        content: 'Hier findest du alle deine Chat-Agenten. Du kannst sie bearbeiten, testen und veröffentlichen.',
        target: '[href="/chatflows"]',
        placement: 'right',
        highlight: true
    },
    {
        id: 'transcriptions',
        title: 'Anrufe & Transkripte',
        content: 'Alle Voice-Anrufe werden automatisch transkribiert und mit KI-Zusammenfassungen versehen. So behältst du den Überblick über alle Gespräche.',
        target: '[href="/transcriptions"]',
        placement: 'right',
        highlight: true
    },
    {
        id: 'wallet',
        title: 'Guthaben & Abrechnung',
        content: 'Hier siehst du dein aktuelles Guthaben und kannst Credits aufladen. Jede KI-Nutzung wird transparent abgerechnet.',
        target: '[href="/wallet"]',
        placement: 'right',
        highlight: true
    },
    {
        id: 'resources',
        title: 'Ressourcen',
        content: 'Unter "Werkzeuge" und "Zugangsdaten" kannst du externe APIs und Services einbinden, die deine Agenten nutzen können.',
        target: '[href="/tools"]',
        placement: 'right',
        highlight: true
    },
    {
        id: 'complete',
        title: 'Los geht\'s!',
        content: 'Du bist bereit, deinen ersten KI-Agenten zu erstellen! Klicke auf "Agent erstellen" im Menü und beschreibe, was dein Agent können soll.',
        placement: 'center',
        highlight: false
    }
]

export default tourSteps
