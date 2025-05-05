// Emoji picker initialization
document.addEventListener('DOMContentLoaded', function() {
    function initializeEmojiPicker() {
        const emojiBtn = document.getElementById('emoji-button');
        const messageInput = document.getElementById('message-input');
        const emojiPickerContainer = document.getElementById('emoji-picker');
        
        if (!emojiBtn || !messageInput || !emojiPickerContainer) {
            console.error('Required elements not found for emoji picker');
            return;
        }

        // Create emoji picker element
        const picker = document.createElement('em-emoji-picker');
        picker.classList.add('emoji-picker-element');
        picker.setAttribute('theme', 'dark');
        emojiPickerContainer.appendChild(picker);

        // Handle emoji selection
        picker.addEventListener('emoji-click', event => {
            const emoji = event.detail.unicode;
            const cursorPos = messageInput.selectionStart;
            const textBefore = messageInput.value.substring(0, cursorPos);
            const textAfter = messageInput.value.substring(cursorPos);
            messageInput.value = textBefore + emoji + textAfter;
            messageInput.focus();
            messageInput.selectionStart = cursorPos + emoji.length;
            messageInput.selectionEnd = cursorPos + emoji.length;
            emojiPickerContainer.style.display = 'none';
        });

        // Toggle emoji picker
        emojiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = emojiPickerContainer.style.display === 'block';
            
            if (!isVisible) {
                // Position the picker near the emoji button
                const rect = emojiBtn.getBoundingClientRect();
                emojiPickerContainer.style.top = `${rect.bottom + 5}px`;
                emojiPickerContainer.style.left = `${rect.left}px`;
                emojiPickerContainer.style.display = 'block';
            } else {
                emojiPickerContainer.style.display = 'none';
            }
        });

        // Close picker when clicking outside
        document.addEventListener('click', (e) => {
            if (!emojiPickerContainer.contains(e.target) && e.target !== emojiBtn) {
                emojiPickerContainer.style.display = 'none';
            }
        });

        // Close picker when pressing Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && emojiPickerContainer.style.display === 'block') {
                emojiPickerContainer.style.display = 'none';
            }
        });
    }

    // Wait for emoji picker script to load
    function waitForEmojiPicker() {
        if (window.customElements.get('em-emoji-picker')) {
            initializeEmojiPicker();
        } else {
            setTimeout(waitForEmojiPicker, 100);
        }
    }

    // Start waiting for emoji picker
    waitForEmojiPicker();
}); 