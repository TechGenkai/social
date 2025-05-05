// Utility functions for sanitizing user input to prevent XSS attacks

/**
 * Sanitizes a string by escaping HTML
 * 
 * @param {string} text - The input text to sanitize
 * @returns {string} - Sanitized text
 */
function sanitizeText(text) {
    if (!text) return '';
    
    // Create a text node and extract its content
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Sanitizes text while preserving line breaks (converts \n to <br>)
 * 
 * @param {string} text - The input text to sanitize
 * @returns {string} - Sanitized text with line breaks
 */
function sanitizeWithLineBreaks(text) {
    if (!text) return '';
    
    // First sanitize the text
    const sanitized = sanitizeText(text);
    
    // Replace line breaks with <br> tags
    return sanitized.replace(/\n/g, '<br>');
}

/**
 * Sanitizes text while preserving common emoticons
 * 
 * @param {string} text - The input text to sanitize
 * @returns {string} - Sanitized text with emoticons intact
 */
function sanitizeWithEmoticons(text) {
    if (!text) return '';
    
    // Store emoticons temporarily with unique markers
    const emoticonMap = new Map();
    let counter = 0;
    
    // Regular expression to match common emoticons
    const emoticonRegex = /(?:>\.<?|<\.>?|>\.<|<\w<|>\w>|>\.<|<\.<|>\.>|=\.=|\^\.\^|;\.|;\)|:\)|:\(|:D|:P|:O|:\/|:\\|:'\(|XD|x_x|o_O|O_o|0_0|-_-|\^_\^|\._\.|T_T)/g;
    
    // Replace emoticons with markers
    const markedText = text.replace(emoticonRegex, (match) => {
        const marker = `__EMOTICON_${counter}__`;
        emoticonMap.set(marker, match);
        counter++;
        return marker;
    });
    
    // Sanitize the text
    const div = document.createElement('div');
    div.textContent = markedText;
    let sanitized = div.innerHTML;
    
    // Restore emoticons
    emoticonMap.forEach((emoticon, marker) => {
        sanitized = sanitized.replace(marker, emoticon);
    });
    
    return sanitized;
}

/**
 * Sanitizes text preserving both emoticons and line breaks
 * 
 * @param {string} text - The input text to sanitize
 * @returns {string} - Sanitized text with emoticons and line breaks
 */
function sanitizeWithEmoticonsAndLineBreaks(text) {
    if (!text) return '';
    
    // First sanitize with emoticons preserved
    const sanitized = sanitizeWithEmoticons(text);
    
    // Replace line breaks with <br> tags
    return sanitized.replace(/\n/g, '<br>');
}

// Make functions available globally
window.sanitizeText = sanitizeText;
window.sanitizeWithLineBreaks = sanitizeWithLineBreaks;
window.sanitizeWithEmoticons = sanitizeWithEmoticons;
window.sanitizeWithEmoticonsAndLineBreaks = sanitizeWithEmoticonsAndLineBreaks; 