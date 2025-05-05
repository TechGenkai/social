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
 * Sanitizes text while preserving emoticons like <3, :>, etc.
 * 
 * @param {string} text - The input text to sanitize
 * @returns {string} - Sanitized text with emoticons preserved
 */
function sanitizeWithEmoticons(text) {
    if (!text) return '';
    
    // First, temporarily replace common emoticons with placeholders
    const emoticonMap = {
        '&lt;3': '❤️',        // <3 heart
        '&lt;&gt;': '◊',       // <> diamond
        '&lt;/&gt;': '⚡',      // </> code/lightning
        '&gt;:)': '😈',        // >:) evil smile
        '&gt;:(': '😠',        // >:( angry face
        '&lt;:)': '🤔',        // <:) thinking face
        ':&gt;': '😊',         // :> happy face
        ':&lt;': '😢',         // :< sad face
        '&lt;(' : '😭',        // <( crying face
        '&gt;)' : '😏',        // >) smirk face
    };
    
    // Sanitize the text first
    let sanitized = sanitizeText(text);
    
    // Replace common emoticon patterns with actual emoticons or HTML entities
    Object.keys(emoticonMap).forEach(emoticon => {
        sanitized = sanitized.replace(new RegExp(emoticon, 'g'), emoticonMap[emoticon]);
    });
    
    return sanitized;
}

/**
 * Sanitizes text with emoticons and line breaks
 * 
 * @param {string} text - The input text to sanitize
 * @returns {string} - Sanitized text with emoticons and line breaks
 */
function sanitizeWithEmoticonsAndLineBreaks(text) {
    if (!text) return '';
    
    // First sanitize with emoticons
    const sanitized = sanitizeWithEmoticons(text);
    
    // Then replace line breaks with <br> tags
    return sanitized.replace(/\n/g, '<br>');
}

// Make functions available globally
window.sanitizeText = sanitizeText;
window.sanitizeWithLineBreaks = sanitizeWithLineBreaks;
window.sanitizeWithEmoticons = sanitizeWithEmoticons;
window.sanitizeWithEmoticonsAndLineBreaks = sanitizeWithEmoticonsAndLineBreaks; 