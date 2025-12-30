/**
 * M.A.T.E. Voice Nodes for Flowise
 * 
 * Custom nodes for voice AI integration including:
 * - VAPI Voice Trigger: Receives webhooks from VAPI voice calls
 * - VAPI Voice Response: Sends responses back to VAPI
 * - Deepgram Transcription: Speech-to-text conversion
 * - Text-to-Speech: Multiple TTS provider support
 * - M.A.T.E. Billing: Integrated billing for voice/LLM usage
 * - Haystack Pipeline: Connect to Haystack for advanced RAG
 * 
 * Pricing Model:
 * - Voice: €1.50 per minute (2.5 cents per second)
 * - LLM: €0.03 per 1000 tokens
 * - Minimum top-up: €10
 */

// Node exports
export * from './VAPIVoiceTrigger'
export * from './VAPIVoiceResponse'
export * from './DeepgramTranscription'
export * from './TextToSpeech'
export * from './MATEBilling'
export * from './HaystackPipeline'
