/**
 * Multi-Language Constants for Google AI Mode MCP Server
 * Supports: DE, EN, NL, ES, FR, IT
 */

// Citation button selectors - Multi-language fallback chain
export const CITATION_SELECTORS = [
  // English
  '[aria-label="View related links"]',
  '[aria-label*="Related links"]',
  '[aria-label*="Sources"]',
  // German
  '[aria-label="Zugehörige Links anzeigen"]',
  '[aria-label*="Zugehörige Links"]',
  '[aria-label*="Quellen"]',
  // French
  '[aria-label*="Liens associés"]',
  '[aria-label*="Sources"]',
  // Spanish
  '[aria-label*="Enlaces relacionados"]',
  '[aria-label*="Fuentes"]',
  // Dutch
  '[aria-label*="Gerelateerde links"]',
  '[aria-label*="Bronnen"]',
  // Italian
  '[aria-label*="Link correlati"]',
  '[aria-label*="Fonti"]',
  // Generic fallback (case-insensitive)
  'button[aria-label*="links" i]',
];

// AI Completion Detection - Button-based (language-independent!)
export const AI_COMPLETION_BUTTON_SVG = 'button svg[viewBox="3 3 18 18"]'; // Thumbs-up SVG
export const AI_COMPLETION_BUTTON_ARIA = '[aria-label*="feedback" i]'; // Aria-label fallback
export const AI_COMPLETION_TIMEOUT = 15000; // 15 seconds per method
export const OVERALL_COMPLETION_TIMEOUT = 40000; // 40 seconds total

// Text-based completion indicators (fallback)
export const AI_COMPLETION_TEXT_INDICATORS = [
  // English
  'AI-generated',
  'AI Overview',
  'Generative AI is experimental',
  // German
  'KI-Antworten',
  'KI-generiert',
  'Generative KI',
  // Dutch
  'AI-gegenereerd',
  'AI-overzicht',
  // Spanish
  'Las respuestas de la IA',
  'Resumen de IA',
  'Información general de IA',
  // French
  'Réponses IA',
  "Aperçu de l'IA",
  "Vue d'ensemble de l'IA",
  // Italian
  'Risposte IA',
  'Panoramica IA',
  "Panoramica dell'IA",
];

// Disclaimer cutoff markers (remove everything after these)
export const CUTOFF_MARKERS = [
  // German
  'KI-Antworten können Fehler enthalten',
  'Öffentlicher Link wird erstellt',
  // English
  'AI-generated answers may contain mistakes',
  'AI can make mistakes',
  'Generative AI is experimental',
  'AI overviews are experimental',
  // Dutch
  'AI-reacties kunnen fouten bevatten',
  // Spanish
  'Las respuestas de la IA pueden contener errores',
  'pueden contener errores',
  'Más información',
  // French
  "Les réponses de l'IA peuvent contenir des erreurs",
  'peuvent contenir des erreurs',
  "Plus d'informations",
  // Italian
  "Le risposte dell'IA possono contenere errori",
  'possono contenere errori',
  'Ulteriori informazioni',
];

// AI Mode not available indicators (region/language restrictions)
export const AI_MODE_NOT_AVAILABLE = [
  // French
  "Le Mode IA n'est pas disponible dans votre pays ou votre langue",
  "Mode IA n'est pas disponible",
  'Découvrez le Mode IA',
  // English
  'AI Mode is not available in your country or language',
  "AI Mode isn't available",
  // German
  'Der KI-Modus ist in Ihrem Land oder Ihrer Sprache nicht verfügbar',
  'KI-Modus ist nicht verfügbar',
  // Spanish
  'El modo de IA no está disponible en tu país o idioma',
  // Italian
  'La modalità IA non è disponibile nel tuo Paese o nella tua lingua',
  // Dutch
  'AI-modus is niet beschikbaar in uw land of taal',
];

// CAPTCHA error messages (language-aware)
export const CAPTCHA_ERROR_MESSAGES = [
  // English (primary)
  'Our systems have detected unusual traffic',
  'unusual traffic',
  'About this page',
  // German
  'Unsere Systeme haben ungewöhnlichen Datenverkehr',
  'Über diese Seite',
  // French
  'Nos systèmes ont détecté un trafic inhabituel',
  'À propos de cette page',
  // Spanish
  'Nuestros sistemas han detectado tráfico inusual',
  'Acerca de esta página',
  // Dutch
  'Onze systemen hebben ongebruikelijk verkeer gedetecteerd',
  'Over deze pagina',
  // Italian
  'I nostri sistemi hanno rilevato traffico insolito',
  'Informazioni su questa pagina',
  // Generic
  'CAPTCHA',
  'reCAPTCHA',
];
