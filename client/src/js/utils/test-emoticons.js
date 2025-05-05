// Test emoticon sanitization
const input1 = 'Hello >.<';
const input2 = 'Test <.> emoticon';
const input3 = '<script>alert("XSS");</script>';
const input4 = 'Mixed >_< with <script>alert("XSS");</script>';

// Load the sanitize.js functions
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Create a mock window object
const window = {};

// Load and execute the sanitize.js content
const sanitizeJsPath = path.join(__dirname, 'sanitize.js');
const sanitizeJsContent = fs.readFileSync(sanitizeJsPath, 'utf8');
const context = { window };
vm.createContext(context);
vm.runInContext(sanitizeJsContent, context);

// Extract the functions from the window object
const { sanitizeText, sanitizeWithEmoticons } = context.window;

// Test regular sanitization vs emoticon sanitization
console.log('Regular sanitize:');
console.log('Input:', input1);
console.log('Output:', sanitizeText(input1));
console.log();

console.log('Emoticon sanitize:');
console.log('Input:', input1);
console.log('Output:', sanitizeWithEmoticons(input1));
console.log();

console.log('Regular sanitize:');
console.log('Input:', input2);
console.log('Output:', sanitizeText(input2));
console.log();

console.log('Emoticon sanitize:');
console.log('Input:', input2);
console.log('Output:', sanitizeWithEmoticons(input2));
console.log();

console.log('Script tag test:');
console.log('Input:', input3);
console.log('Regular Output:', sanitizeText(input3));
console.log('Emoticon Output:', sanitizeWithEmoticons(input3));
console.log();

console.log('Mixed content test:');
console.log('Input:', input4);
console.log('Regular Output:', sanitizeText(input4));
console.log('Emoticon Output:', sanitizeWithEmoticons(input4)); 