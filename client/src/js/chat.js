// Chat functionality using Socket.io
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const username = localStorage.getItem('username');
    if (!username) {
        window.location.href = '/login';
        return;
    }

    // Get DOM elements
    const messagesContainer = document.getElementById('messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-message');
    
    // For compatibility with both pages
    const attachmentButton = document.getElementById('attachment-btn') || document.getElementById('media-upload');
    const emojiButton = document.getElementById('emoji-btn') || document.getElementById('emoji-button');
    const fileInput = document.getElementById('file-input') || document.getElementById('media-input');
    const emojiPicker = document.getElementById('emoji-picker');
    
    // Keep track of the current reply-to message
    let replyToMessage = null;
    
    // Create a reaction menu element
    const reactionMenu = document.createElement('div');
    reactionMenu.className = 'reaction-menu';
    reactionMenu.innerHTML = `
        <div class="reaction-emoji-list">
            <span class="reaction-emoji" data-emoji="👍">👍</span>
            <span class="reaction-emoji" data-emoji="❤️">❤️</span>
            <span class="reaction-emoji" data-emoji="😂">😂</span>
            <span class="reaction-emoji" data-emoji="😮">😮</span>
            <span class="reaction-emoji" data-emoji="😢">😢</span>
            <span class="reaction-emoji" data-emoji="👏">👏</span>
            <span class="reaction-emoji" data-emoji="🔥">🔥</span>
            <span class="reaction-emoji" data-emoji="🙏">🙏</span>
        </div>
    `;
    document.body.appendChild(reactionMenu);
    
    // Add event listeners to reaction emojis
    reactionMenu.querySelectorAll('.reaction-emoji').forEach(emoji => {
        emoji.addEventListener('click', function(e) {
            e.stopPropagation();
            const menuMessageId = reactionMenu.dataset.messageId;
            
            // Verify messageId is not undefined
            if (!menuMessageId) {
                console.error("Cannot send reaction: missing messageId");
                if (typeof notifications !== 'undefined') {
                    notifications.error('Error', 'Cannot react to this message');
                }
                closeReactionMenu();
                return;
            }
            
            console.log("Sending reaction for message ID:", menuMessageId);
            const emojiValue = this.dataset.emoji;
            
            // Send the reaction to the server
            socket.emit('message reaction', {
                messageId: menuMessageId,
                emoji: emojiValue
            });
            
            // Close the menu
            closeReactionMenu();
        });
    });
    
    // Add CSS for reply and reaction features
    const styleTag = document.createElement('style');
    styleTag.textContent = `
        /* Message container styles to match DM styles */
        .message-container {
            margin-bottom: 10px;
            width: 100%;
            clear: both;
        }
        
        .message-wrapper {
            display: flex;
            max-width: 80%;
            margin-bottom: 4px;
        }
        
        .message-wrapper.own {
            margin-left: auto;
            flex-direction: row-reverse;
        }
        
        .message-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        
        /* Ensure messages are displayed correctly */
        .message {
            position: relative;
            padding: 8px 12px;
            margin: 2px 0;
            max-width: fit-content;
            word-wrap: break-word;
            box-sizing: border-box;
            display: flex !important;
            flex-direction: column !important;
            background-color: #1a1a1a;
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .message.message-own {
            background-color: #1a1a1a;
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.1);
            margin-left: auto;
            float: right;
            clear: both;
        }
        
        .message.message-other {
            background-color: #1a1a1a;
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.1);
            margin-right: auto;
            float: left;
            clear: both;
        }
        
        /* First message in a group */
        .message-content .message:first-child {
            border-radius: 18px 18px 18px 18px;
        }
        
        .message-content .message.message-own:first-child {
            border-radius: 18px 18px 0 18px;
        }
        
        .message-content .message.message-other:first-child {
            border-radius: 18px 18px 18px 0;
        }
        
        /* Middle messages in a group */
        .message-content .message:not(:first-child):not(:last-child) {
            border-radius: 5px;
        }
        
        .message-content .message.message-own:not(:first-child):not(:last-child) {
            border-radius: 5px;
        }
        
        .message-content .message.message-other:not(:first-child):not(:last-child) {
            border-radius: 5px;
        }
        
        /* Last message in a group */
        .message-content .message:last-child {
            border-radius: 5px;
        }
        
        .message-content .message.message-own:last-child {
            border-radius: 5px 5px 0 5px;
        }
        
        .message-content .message.message-other:last-child {
            border-radius: 5px 5px 5px 0;
        }
        
        /* Single message (both first and last) */
        .message-content .message:first-child:last-child {
            border-radius: 18px;
        }
        
        .message-content .message.message-own:first-child:last-child {
            border-radius: 18px 18px 0 18px;
        }
        
        .message-content .message.message-other:first-child:last-child {
            border-radius: 18px 18px 18px 0;
        }
        
        .consecutive-message {
            margin-top: 2px;
            clear: both;
            border-radius: 5px !important;
        }
        
        .consecutive-message.message-own {
            border-radius: 5px 5px 0 5px !important;
        }
        
        .consecutive-message.message-other {
            border-radius: 5px 5px 5px 0 !important;
        }
        
        /* Message time styling */
        .message-time {
            font-size: 0.75em;
            color: rgba(255, 255, 255, 0.5);
            margin-top: 4px;
            text-align: right;
            padding-right: 4px;
            align-self: flex-end;
            opacity: 0.8;
            transition: opacity 0.2s ease;
        }
        
        .message:hover .message-time {
            opacity: 1;
        }
        
        .message-wrapper.own .message-time {
            text-align: right;
        }
        
        .message-wrapper:not(.own) .message-time {
            text-align: left;
        }
        
        /* Message header styling */
        .message-header {
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            font-size: 0.85em;
            padding: 0 4px;
        }
        
        .message-sender {
            color: #f218d9;
            text-decoration: none;
            font-weight: 500;
        }
        
        .message-sender:hover {
            text-decoration: underline;
        }
        
        /* Message text styling */
        .message-text {
            line-height: 1.4;
            white-space: pre-wrap;
            word-break: break-word;
            padding: 0 4px;
        }
        
        /* Profile picture styling */
        .message-profile-pic {
            width: 32px;
            height: 32px;
            margin: 0 8px;
            flex-shrink: 0;
        }
        
        .message-profile-pic img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(242, 24, 217, 0.3);
        }
        
        /* Online indicator styling */
        .online-indicator {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 10px;
            height: 10px;
            background-color: #4CAF50;
            border-radius: 50%;
            border: 2px solid #1a1a1a;
        }
        
        /* Message actions styling */
        .message-actions {
            display: none;
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background-color: rgba(30, 30, 40, 0.6);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            border-radius: 20px;
            padding: 4px 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            z-index: 10;
            transition: all 0.2s ease;
            border: 1px solid rgba(242, 24, 217, 0.3);
            pointer-events: auto;
        }
        
        /* Show action buttons when hovering over message */
        .message:hover .message-actions {
            display: flex !important;
        }
        
        /* Specifically target consecutive messages to show actions on hover */
        .consecutive-message:hover .message-actions {
            display: flex !important;
        }
        
        /* Maintain visibility when hovering over the actions themselves */
        .message-actions:hover {
            display: flex !important;
        }
        
        .message-wrapper:hover .message-actions,
        .message-content:hover .message-actions {
            display: none;
        }
        
        /* Position for own messages - on the left side */
        .message-own .message-actions {
            left: -80px;
            right: auto;
        }
        
        /* Position for other users' messages - on the right side */
        .message-other .message-actions {
            right: -80px;
            left: auto;
        }
        
        /* Responsive adjustment for mobile */
        @media (max-width: 768px) {
            .message-own .message-actions {
                left: -70px;
            }
            
            .message-other .message-actions {
                right: -70px;
            }
        }
        
        /* For very small screens */
        @media (max-width: 480px) {
            .message-own .message-actions {
                left: -55px;
            }
            
            .message-other .message-actions {
                right: -55px;
            }
        }
        
        .action-button {
            background: transparent;
            border: none;
            color: rgba(242, 242, 242, 0.85);
            font-size: 14px;
            padding: 4px 8px;
            cursor: pointer;
            margin: 0 2px;
            border-radius: 15px;
            transition: all 0.2s;
        }
        
        .action-button:hover {
            background-color: rgba(242, 24, 217, 0.3);
            color: white;
            transform: scale(1.1);
            box-shadow: 0 0 8px rgba(242, 24, 217, 0.5);
        }
        
        /* Reply container styling */
        .reply-container {
            background-color: rgba(30, 30, 40, 0.8);
            border-left: 3px solid #f218d9;
            padding: 6px 10px;
            margin-bottom: 6px;
            border-radius: 4px;
            font-size: 0.9em;
            position: relative;
        }
        
        .reply-username {
            color: #f218d9;
            font-weight: bold;
            margin-right: 5px;
        }
        
        .reply-text {
            color: #ccc;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 90%;
        }
        
        .reply-close {
            position: absolute;
            right: 5px;
            top: 5px;
            background: transparent;
            border: none;
            color: #999;
            cursor: pointer;
            font-size: 14px;
        }
        
        /* Reaction menu styling */
        .reaction-menu {
            display: none;
            position: fixed;
            background-color: rgba(30, 30, 40, 0.95);
            border-radius: 20px;
            padding: 4px 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            border: 1px solid rgba(242, 24, 217, 0.3);
        }
        
        .reaction-emoji-list {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2px;
        }
        
        .reaction-emoji {
            font-size: 18px;
            padding: 5px;
            cursor: pointer;
            border-radius: 50%;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 26px;
            height: 26px;
        }
        
        .reaction-emoji:hover {
            background-color: rgba(242, 24, 217, 0.3);
            transform: scale(1.2);
        }
        
        /* Reply info styling */
        .reply-info {
            background-color: rgba(30, 30, 40, 0.5);
            border-left: 3px solid rgba(242, 24, 217, 0.7);
            padding: 4px 8px;
            margin-bottom: 6px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85em;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            transition: background-color 0.2s;
        }
        
        .reply-info:hover {
            background-color: rgba(30, 30, 40, 0.8);
        }
        
        .reply-username {
            color: #f218d9;
            font-weight: bold;
        }
        
        .reply-text {
            color: rgba(255, 255, 255, 0.7);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 200px;
        }
        
        /* Message reactions styling */
        .message-reactions {
            display: inline-flex;  /* Changed from flex to inline-flex */
            flex-wrap: nowrap;     /* Changed from wrap to nowrap */
            gap: 4px;
            margin-top: 4px;
            padding: 0 4px;
            width: auto;           /* Added to prevent full width */
            min-width: min-content; /* Added to ensure content fits */
        }
        
        .reaction-badge {
            display: inline-flex;  /* Changed from flex to inline-flex */
            align-items: center;
            gap: 2px;
            background-color: rgba(30, 30, 40, 0.6);
            border-radius: 12px;
            padding: 2px 6px;
            font-size: 0.85em;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;   /* Added to prevent wrapping */
        }
        
        /* Fix consecutive message bubble shapes */
        .message-wrapper .message:first-child {
            border-radius: 18px !important;
        }
        
        .message-wrapper .message.message-own:first-child {
            border-radius: 18px 18px 0 18px !important;
        }
        
        .message-wrapper .message.message-other:first-child {
            border-radius: 18px 18px 18px 0 !important;
        }
        
        /* Highlight animation for original message */
        @keyframes highlight-pulse {
            0% { background-color: rgba(242, 24, 217, 0.1); }
            50% { background-color: rgba(242, 24, 217, 0.3); }
            100% { background-color: rgba(242, 24, 217, 0.1); }
        }
        
        .highlight-message {
            animation: highlight-pulse 1s ease-in-out 3;
        }
    `;
    document.head.appendChild(styleTag);
    
    // Create reply indicator element (initially hidden)
    const replyIndicator = document.createElement('div');
    replyIndicator.id = 'reply-indicator';
    replyIndicator.className = 'reply-container';
    replyIndicator.style.display = 'none';
    replyIndicator.innerHTML = `
        <span class="reply-username"></span>
        <span class="reply-text"></span>
        <button class="reply-close"><i class="bi bi-x"></i></button>
    `;
    
    // Insert reply indicator before the input area
    const chatInputContainer = document.querySelector('.chat-input-container');
    chatInputContainer.parentNode.insertBefore(replyIndicator, chatInputContainer);
    
    // Add event listener for closing reply
    const replyCloseButton = replyIndicator.querySelector('.reply-close');
    replyCloseButton.addEventListener('click', function() {
        clearReply();
    });
    
    // Function to clear the current reply
    function clearReply() {
        replyToMessage = null;
        replyIndicator.style.display = 'none';
        replyIndicator.querySelector('.reply-username').textContent = '';
        replyIndicator.querySelector('.reply-text').textContent = '';
    }
    
    // Function to set up reply
    function setupReply(message) {
        replyToMessage = message;
        
        // Set the reply indicator content
        replyIndicator.querySelector('.reply-username').textContent = 
            message.username === username ? 'You' : (message.displayName || message.username);
        
        // Truncate text if it's too long
        let replyText = message.text || 'Media message';
        if (replyText.length > 50) {
            replyText = replyText.substring(0, 47) + '...';
        }
        
        replyIndicator.querySelector('.reply-text').textContent = replyText;
        replyIndicator.style.display = 'block';
        
        // Focus on message input
        messageInput.focus();
    }
    
    // Emoji categories and data
    const emojiCategories = {
        'smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🫣', '🤗', '🫡', '🤔', '🫢', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🫨', '🫠', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🫥', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠'],
        'people': ['👶', '👧', '🧒', '👦', '👩', '🧑', '👨', '👩‍🦱', '👨‍🦱', '👩‍🦰', '👨‍🦰', '👱‍♀️', '👱‍♂️', '👩‍🦳', '👨‍🦳', '👩‍🦲', '👨‍🦲', '🧔', '👵', '🧓', '👴', '👲', '👳‍♀️', '👳‍♂️', '🧕', '👮‍♀️', '👮‍♂️', '👷‍♀️', '👷‍♂️', '💂‍♀️', '💂‍♂️', '🕵️‍♀️', '🕵️‍♂️', '👨‍⚕️', '👩‍⚕️', '👨‍🌾', '👩‍🌾', '👨‍🍳', '👩‍🍳', '👨‍🎓', '👩‍🎓', '👨‍🎤', '👩‍🎤', '👨‍🏫', '👩‍🏫', '👨‍🏭', '👩‍🏭', '👨‍💻', '👩‍💻', '👨‍💼', '👩‍💼', '👨‍🔧', '👩‍🔧', '👨‍🔬', '👩‍🔬', '👨‍🎨', '👩‍🎨', '👨‍🚀', '👩‍🚀', '👨‍⚖️', '👨‍⚖️', '👰‍♀️', '👰‍♂️', '🤵‍♀️', '🤵‍♂️', '🫃', '🫄', '🤰', '🤱', '👼', '🎅', '🤶', '🦸‍♀️', '🦸‍♂️', '🦹‍♀️', '🦹‍♂️', '🧙‍♀️', '🧙‍♂️', '🧚‍♀️', '🧚‍♂️', '🧚‍♀️', '🧛‍♂️', '🧜‍♀️', '🧜‍♂️', '🧝‍♀️', '🧝‍♂️', '🧞‍♀️', '🧞‍♂️', '🧟‍♀️', '🧟‍♂️', '🧌', '💆‍♀️', '💆‍♂️', '💇‍♀️', '💇‍♂️', '🚶‍♀️', '🚶‍♂️', '🧍‍♀️', '🧍‍♂️', '🧎‍♀️', '🧎‍♂️', '🏃‍♀️', '🏃‍♂️', '💃', '🕺', '👯‍♀️', '👯‍♂️', '🧖‍♀️', '🧖‍♂️', '🧗‍♀️', '🧗‍♂️', '🤺', '🏇', '⛷️', '🏂', '🏌️‍♀️', '🏌️‍♂️', '🏄‍♀️', '🏄‍♂️', '🚣‍♀️', '🚣‍♂️', '🏊‍♀️', '🏊‍♂️', '⛹️‍♀️', '⛹️‍♂️', '🏋️‍♀️', '🏋️‍♂️', '🚴‍♀️', '🚴‍♂️', '🚵‍♀️', '🚵‍♂️', '🤸‍♀️', '🤸‍♂️', '🤼‍♀️', '🤼‍♂️', '🤽‍♀️', '🤽‍♂️', '🤾‍♀️', '🤾‍♂️', '🤹‍♀️', '🤹‍♂️', '🧘‍♀️', '🧘‍♂️', '🛀', '🛌'],
        'gestures': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '🫦', '💋', '🩺'],
        'love': ['💘', '💝', '💖', '💗', '💓', '💞', '💕', '💟', '❣️', '💔', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤'],
        'animals': ['🐵', '🐒', '🦍', '🦧', '🐶', '🐕', '🦮', '🐕‍🦺', '🐩', '🐺', '🦊', '🦝', '🐱', '🐈', '🐈‍⬛', '🦁', '🐯', '🐅', '🐆', '🐴', '🐎', '🦄', '🦓', '🦌', '🦬', '🐮', '🐂', '🐃', '🐄', '🐷', '🐖', '🐗', '🐽', '🐏', '🐑', '🐐', '🐪', '🐫', '🦙', '🦒', '🐘', '🦣', '🦏', '🦛', '🐭', '🐁', '🐀', '🐹', '🐰', '🐇', '🐿️', '🦫', '🦔', '🦇', '🐻', '🐻‍❄️', '🐨', '🐼', '🦥', '🦦', '🦨', '🦘', '🦡', '🐾', '🦃', '🐔', '🐓', '🐣', '🐤', '🐥', '🐦', '🐧', '🕊️', '🦅', '🦆', '🦢', '🦉', '🦤', '🪶', '🦩', '🦚', '🦜', '🐸', '🐊', '🐢', '🦎', '🐍', '🐲', '🐉', '🦕', '🦖', '🐳', '🐋', '🐬', '🦭', '🐟', '🐠', '🐡', '🦈', '🐙', '🐚', '🪸', '🐌', '🦋', '🐛', '🐜', '🐝', '🪲', '🐞', '🦗', '🪳', '🕷️', '🕸️', '🦂', '🦟', '🪰', '🪱', '🦠'],
        'nature': ['🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🪴', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🪹', '🪺', '🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🫐', '🥝', '🍅', '🫒', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🫑', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🫘', '🌰'],
        'food': ['🍞', '🥐', '🥖', '🫓', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🫕', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦀', '🦞', '🦐', '🦑', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🫖', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🫗', '🥤', '🧋', '🧃', '🧉', '🧊'],
        'activities': ['🎪', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩', '🎪', '🎭', '🖼️', '🎨', '🧵', '🪡', '🧶', '🪢'],
        'travel': ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🛵', '🏍️', '🛺', '🚲', '🛴', '🛹', '🛼', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝', '🚞', '🚋', '🚌', '🚍', '🚎', '🚐', '🚑', '🚒', '🚓', '🚔', '🚕', '🚖', '🚗', '🚘', '🚙', '🚚', '🚛', '🚜', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚥', '🚦', '🛑', '🚧'],
        'objects': ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🪠', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🪥', '🪒', '🧽', '🪣', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🪆', '🖼️', '🪞', '🪟', '🛍️', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '🗑️', '📇', '🗃️', '🗳️', '🗄️', '📋', '📁', '📂', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇️', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊️', '🖋️', '✒️', '🖌️', '🖍️', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓'],
        'symbols': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🛗', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '⚧', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧']
    };

    // Category icons for tabs
    const categoryIcons = {
        'smileys': '😊',
        'people': '👥',
        'gestures': '👋',
        'love': '❤️',
        'animals': '🐱',
        'nature': '🌸',
        'food': '🍔',
        'activities': '⚽',
        'travel': '✈️',
        'objects': '💡',
        'symbols': '💠'
    };

    // Add auto-resize functionality to the message input
    messageInput.addEventListener('input', function() {
        // Reset height to auto to get the right scrollHeight
        this.style.height = 'auto';
        // Set new height based on content (with a max)
        const newHeight = Math.min(this.scrollHeight, 120);
        this.style.height = newHeight + 'px';
    });
    
    // Track last message sender for grouping
    let lastMessageSender = null;
    let lastMessageTime = null;
    let lastMessageWrapper = null;
    
    // Connect to Socket.io with username from localStorage
    const socket = io({
        auth: { 
            username: username
        }
    });

    // Store incoming messages until we're ready to display them
    let pendingMessages = [];
    let initialLoadComplete = false;
    
    // Track online users
    const onlineUsers = new Set();

    // Handle connection
    socket.on('connect', () => {
        console.log('Connected to chat server');
        
        // Reset message container and add loading indicator
        messagesContainer.innerHTML = `
            <div class="loading-messages">
                <div class="loading-spinner">
                    <i class="bi bi-arrow-repeat"></i> Loading messages...
                </div>
            </div>
        `;
        
        // Reset variables for new connection
        pendingMessages = [];
        initialLoadComplete = false;
        
        // Add a class to force scroll position to bottom without animation
        messagesContainer.classList.add('loading-messages-no-scroll');
        
        // Start sending heartbeats every minute to keep online status
        setInterval(() => {
            socket.emit('heartbeat');
        }, 60 * 1000); // every minute
    });

    // Handle connection errors
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        notifications.error('Connection Error', 'Failed to connect to chat server');
    });

    // Handle incoming messages
    socket.on('chat message', (msg) => {
        // Log for debugging
        console.log(`Received message with ID: ${msg._id || 'undefined'}`);
        
        // If we're still loading initial messages, store this for later
        if (!initialLoadComplete) {
            pendingMessages.push({type: 'chat', data: msg});
            return;
        }
        
        // Otherwise add the message immediately (normal case)
        addMessage(msg);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Disconnected from chat server');
        // Reset message grouping on disconnect
        lastMessageSender = null;
        lastMessageTime = null;
        lastMessageWrapper = null;
    });

    // Handle system messages from server
    socket.on('system message', (data) => {
        // System messages break the conversation flow
        lastMessageSender = null;
        lastMessageTime = null;
        lastMessageWrapper = null;
        
        // If we're still loading initial messages, store this for later
        if (!initialLoadComplete) {
            pendingMessages.push({type: 'system', data});
            return;
        }
        
        addSystemMessage(data.text);
    });

    // Handle online users list
    socket.on('online users', (users) => {
        console.log('Received online users list with', users.length, 'users');
        onlineUsers.clear();
        users.forEach(user => onlineUsers.add(user));
        
        // Update message containers with online status
        updateOnlineStatusInMessages();
    });
    
    // Handle user status updates
    socket.on('user status', (data) => {
        console.log('User status update:', data.username, data.status);
        
        if (data.status === 'online') {
            onlineUsers.add(data.username);
        } else {
            onlineUsers.delete(data.username);
        }
        
        // Update message containers for this specific user
        updateOnlineStatusInMessages(data.username);
    });
    
    // Handle reaction updates from server
    socket.on('message reaction update', (data) => {
        console.log('Reaction update received:', data);
        
        // Find the message element by ID
        const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
        if (messageElement) {
            // Update reactions UI
            updateReactions(messageElement, data.reactions);
        } else {
            console.warn('Could not find message element with ID:', data.messageId);
        }
    });
    
    // Handle history complete event
    socket.on('history complete', () => {
        console.log('Chat history loading complete');
        
        // Remove loading indicator
        const loadingIndicator = messagesContainer.querySelector('.loading-messages');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
        
        // Set flag to allow incoming messages to be added normally
        initialLoadComplete = true;
        
        // Process any pending messages received during loading
        if (pendingMessages.length > 0) {
            console.log(`Processing ${pendingMessages.length} pending messages`);
            
            // Create document fragment for better performance
            const fragment = document.createDocumentFragment();
            
            // Temporarily store references to track message grouping
            const originalSender = lastMessageSender;
            const originalTime = lastMessageTime;
            const originalWrapper = lastMessageWrapper;
            
            // Process all pending messages
            pendingMessages.forEach(item => {
                if (item.type === 'chat') {
                    // Create the message and append to the document fragment
                    const messageElement = createMessageElement(item.data);
                    if (messageElement) {
                        fragment.appendChild(messageElement);
                    }
                } else if (item.type === 'system') {
                    // Create system message
                    const systemMessage = document.createElement('div');
                    systemMessage.className = 'system-message';
                    systemMessage.innerHTML = sanitizeWithEmoticons(item.data.text);
                    fragment.appendChild(systemMessage);
                }
            });
            
            // Append the fragment to the messages container
            messagesContainer.appendChild(fragment);
            
            // Restore original message tracking
            lastMessageSender = originalSender;
            lastMessageTime = originalTime;
            lastMessageWrapper = originalWrapper;
            
            // Clear pending messages
            pendingMessages = [];
        }
        
        // Scroll to bottom
        scrollToBottom(false);
        
        // Re-enable smooth scrolling after a short delay
        setTimeout(() => {
            messagesContainer.classList.remove('loading-messages-no-scroll');
        }, 100);
    });

    // Send message when button is clicked
    sendButton.addEventListener('click', sendMessage);

    // Send message when Enter key is pressed (without Shift)
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Function to send a message
    function sendMessage() {
        const messageText = messageInput.value.trim();
        if (messageText || replyToMessage) { // Allow empty message if it's a reply
            // Create the message data
            const messageData = { text: messageText };
            
            // Add reply information if replying to a message
            if (replyToMessage) {
                messageData.replyTo = {
                    messageId: replyToMessage._id,
                    text: replyToMessage.text,
                    username: replyToMessage.username,
                    timestamp: replyToMessage.timestamp
                };
            }
            
            // Send the message to the server
            socket.emit('chat message', messageData);
            
            // Clear input field and reset its size
            messageInput.value = '';
            messageInput.style.height = 'auto';
            
            // Clear reply if any
            clearReply();
            
            // Focus on input field
            messageInput.focus();
        }
    }

    // Function to check if messages should be grouped
    function shouldGroupMessages(currentSender, currentTime) {
        // If no previous message or different sender, don't group
        if (!lastMessageSender || lastMessageSender !== currentSender) {
            return false;
        }
        
        // Check if messages are within 2 minutes of each other
        if (currentTime && lastMessageTime) {
            const timeDiff = Math.abs(new Date(currentTime) - new Date(lastMessageTime));
            const twoMinutesInMs = 2 * 60 * 1000;
            return timeDiff < twoMinutesInMs;
        }
        
        return true;
    }

    // Function to format message text for display
    function formatMessageText(text) {
        // Use the new function that preserves emoticons and handles line breaks
        return sanitizeWithEmoticonsAndLineBreaks(text);
    }

    // Function to add a message to the chat
    function addMessage(msg, noScroll = false) {
        // Log message data for debugging
        console.log(`Adding message to DOM, ID: ${msg._id || 'undefined'}`);
        
        const currentSender = msg.username;
        const currentTime = msg.timestamp;
        const isOwnMessage = currentSender === username;
        
        // Create message container
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message-container';
        
        // Check if message should be grouped with previous messages
        const shouldGroup = shouldGroupMessages(currentSender, currentTime);
        
        if (!shouldGroup || !lastMessageWrapper) {
            // Create new message wrapper for standalone or first in a series
            const messageWrapper = document.createElement('div');
            messageWrapper.className = isOwnMessage ? 'message-wrapper own' : 'message-wrapper';
            
            // Add profile picture if not our own message or not consecutive
            if (!isOwnMessage) {
                const profilePic = document.createElement('div');
                profilePic.className = 'message-profile-pic';
                
                const profilePicLink = document.createElement('a');
                profilePicLink.href = `/user/${msg.username}`;
                profilePicLink.title = `View ${msg.displayName || msg.username}'s profile`;
                
                const profileImg = document.createElement('img');
                profileImg.src = msg.profilePic || '/images/default-profile.png';
                profileImg.alt = msg.displayName || msg.username;
                profileImg.loading = 'lazy';
                
                profilePicLink.appendChild(profileImg);
                profilePic.appendChild(profilePicLink);
                messageWrapper.appendChild(profilePic);
            }
            
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            
            // Add header only for standalone messages
            const header = document.createElement('div');
            header.className = 'message-header';
            
            const sender = document.createElement('a');
            sender.className = 'message-sender';
            sender.textContent = isOwnMessage ? 'You' : (msg.displayName || msg.username);
            sender.href = isOwnMessage ? '/profile' : `/user/${msg.username}`;
            
            const timestamp = document.createElement('span');
            timestamp.className = 'message-time';
            timestamp.textContent = formatTime(new Date(currentTime));
            
            if (isOwnMessage) {
                header.style.flexDirection = 'row-reverse';
                header.style.textAlign = 'right';
                header.appendChild(timestamp);
                header.appendChild(sender);
            } else {
                header.appendChild(sender);
                header.appendChild(timestamp);
            }
            
            messageContent.appendChild(header);
            
            // Create message bubble
            const messageBubble = document.createElement('div');
            messageBubble.className = 'message ' + (isOwnMessage ? 'message-own' : 'message-other');
            messageBubble.dataset.messageId = msg._id || '';
            
            // Store reactions data for immediate UI updates
            if (msg.reactions && msg.reactions.length > 0) {
                messageBubble.dataset.reactions = JSON.stringify(msg.reactions);
            }
            
            // Create message actions
            const actionsDiv = createMessageActions(messageBubble, msg);
            messageBubble.appendChild(actionsDiv);
            
            // Create message text container
            const textSpan = document.createElement('span');
            textSpan.className = 'message-text';
            
            // Add reply info if this is a reply
            if (msg.replyTo && (msg.replyTo.messageId || msg.replyTo.id)) {
                const replyToId = msg.replyTo.messageId || msg.replyTo.id;
                
                const replyInfo = document.createElement('div');
                replyInfo.className = 'reply-info';
                replyInfo.dataset.replyToId = replyToId;
                
                replyInfo.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    scrollToOriginalMessage(replyToId);
                });
                
                const replyIcon = document.createElement('span');
                replyIcon.className = 'reply-icon';
                replyIcon.innerHTML = '↩ ';
                replyIcon.style.color = '#f218d9';
                replyIcon.style.marginRight = '4px';
                replyIcon.style.fontWeight = 'bold';
                replyInfo.appendChild(replyIcon);
                
                const replyUsername = document.createElement('span');
                replyUsername.className = 'reply-username';
                replyUsername.textContent = msg.replyTo.username || "Unknown user";
                
                const replyText = document.createElement('span');
                replyText.className = 'reply-text';
                replyText.textContent = msg.replyTo.text || 'Media message';
                
                replyInfo.appendChild(replyUsername);
                replyInfo.appendChild(replyText);
                textSpan.appendChild(replyInfo);
                
                messageBubble.dataset.isReply = "true";
                messageBubble.classList.add('has-reply');
            }
            
            // Add media if present
            if (msg.media && typeof msg.media === 'object' && msg.media.url) {
                const mediaElement = createMediaElement(msg.media);
                if (mediaElement) {
                    textSpan.appendChild(mediaElement);
                }
            }
            
            // Add message text if present
            if (msg.text && msg.text.trim()) {
                const textNode = document.createElement('span');
                textNode.innerHTML = formatMessageText(msg.text);
                textSpan.appendChild(textNode);
            }
            
            // Add text span to message
            messageBubble.appendChild(textSpan);
            
            // Add message time
            const messageTime = document.createElement('div');
            messageTime.className = 'message-time';
            const formattedTime = formatTime(new Date(currentTime));
            messageTime.textContent = formattedTime;
            messageBubble.appendChild(messageTime);
            
            // Add reactions if present
            if (msg.reactions && msg.reactions.length > 0) {
                updateReactions(messageBubble, msg.reactions);
            }
            
            messageContent.appendChild(messageBubble);
            messageWrapper.appendChild(messageContent);
            messageContainer.appendChild(messageWrapper);
            
            // Update last message tracking variables
            lastMessageSender = currentSender;
            lastMessageTime = currentTime;
            lastMessageWrapper = messageWrapper;
        } else {
            // This is a consecutive message, append to existing wrapper
            const messageBubble = document.createElement('div');
            messageBubble.className = 'message ' + 
                (isOwnMessage ? 'message-own' : 'message-other') + ' consecutive-message';
            messageBubble.dataset.messageId = msg._id || '';
            
            // Add message actions
            const actionsDiv = createMessageActions(messageBubble, msg);
            messageBubble.appendChild(actionsDiv);
            
            // Create message text
            const textSpan = document.createElement('span');
            textSpan.className = 'message-text';
            
            // Add reply info if this is a reply
            if (msg.replyTo && (msg.replyTo.messageId || msg.replyTo.id)) {
                const replyToId = msg.replyTo.messageId || msg.replyTo.id;
                
                const replyInfo = document.createElement('div');
                replyInfo.className = 'reply-info';
                replyInfo.dataset.replyToId = replyToId;
                
                replyInfo.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    scrollToOriginalMessage(replyToId);
                });
                
                const replyIcon = document.createElement('span');
                replyIcon.className = 'reply-icon';
                replyIcon.innerHTML = '↩ ';
                replyIcon.style.color = '#f218d9';
                replyIcon.style.marginRight = '4px';
                replyIcon.style.fontWeight = 'bold';
                replyInfo.appendChild(replyIcon);
                
                const replyUsername = document.createElement('span');
                replyUsername.className = 'reply-username';
                replyUsername.textContent = msg.replyTo.username || "Unknown user";
                
                const replyText = document.createElement('span');
                replyText.className = 'reply-text';
                replyText.textContent = msg.replyTo.text || 'Media message';
                
                replyInfo.appendChild(replyUsername);
                replyInfo.appendChild(replyText);
                textSpan.appendChild(replyInfo);
                
                messageBubble.dataset.isReply = "true";
                messageBubble.classList.add('has-reply');
            }
            
            // Add media if present
            if (msg.media && typeof msg.media === 'object' && msg.media.url) {
                const mediaElement = createMediaElement(msg.media);
                if (mediaElement) {
                    textSpan.appendChild(mediaElement);
                }
            }
            
            // Add message text if present
            if (msg.text && msg.text.trim()) {
                const textNode = document.createElement('span');
                textNode.innerHTML = formatMessageText(msg.text);
                textSpan.appendChild(textNode);
            }
            
            // Add text span to message
            messageBubble.appendChild(textSpan);
            
            // Add message time
            const messageTime = document.createElement('div');
            messageTime.className = 'message-time';
            const formattedTime = formatTime(new Date(currentTime));
            messageTime.textContent = formattedTime;
            messageBubble.appendChild(messageTime);
            
            // Add reactions if present
            if (msg.reactions && msg.reactions.length > 0) {
                updateReactions(messageBubble, msg.reactions);
            }
            
            // Find the message content in the last message wrapper
            const messageContent = lastMessageWrapper.querySelector('.message-content');
            messageContent.appendChild(messageBubble);
            
            // Update tracking variables
            lastMessageTime = currentTime;
        }
        
        // Add the container to the messages area
        messagesContainer.appendChild(messageContainer);
        
        // Scroll to the bottom if needed
        if (!noScroll) {
            scrollToBottom();
        }
    }

    // Function to add a system message
    function addSystemMessage(text, targetContainer = null) {
        // Create a system message element
        const systemMessage = document.createElement('div');
        systemMessage.className = 'system-message';
        
        // Sanitize the text to prevent XSS attacks but preserve emoticons
        const sanitizedText = sanitizeWithEmoticons(text);
        
        systemMessage.innerHTML = sanitizedText;
        
        // Add to the specified container or default messagesContainer
        (targetContainer || messagesContainer).appendChild(systemMessage);
        
        // Only scroll to bottom if we're not using a fragment
        if (!targetContainer) {
            scrollToBottom();
        }
    }

    // Function to format time
    function formatTime(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // Function to scroll to the bottom of messages
    function scrollToBottom(smooth = true) {
        if (!smooth) {
            messagesContainer.classList.add('loading-messages-no-scroll');
        }
        
        // Use requestAnimationFrame to ensure the DOM has updated
        requestAnimationFrame(() => {
            // Ensure we're at the very bottom by using a large value
            messagesContainer.scrollTop = messagesContainer.scrollHeight + 1000;
            
            // Re-enable smooth scrolling after a short delay if it was disabled
            if (!smooth) {
                setTimeout(() => {
                    messagesContainer.classList.remove('loading-messages-no-scroll');
                }, 50);
            }
        });
    }

    // Initialize emoji picker
    let picker = null;
    let isPickerVisible = false;

    // Initialize emoji picker
    function initializeEmojiPicker() {
        try {
            const container = document.createElement('div');
            container.className = 'emoji-picker-container';
            
            // Create category tabs
            const tabsContainer = document.createElement('div');
            tabsContainer.className = 'emoji-tabs';
            
            // Create emoji grid
            const gridContainer = document.createElement('div');
            gridContainer.className = 'emoji-grid-container';
            
            // Add category tabs
            Object.keys(emojiCategories).forEach(category => {
                const tab = document.createElement('button');
                tab.className = 'emoji-tab';
                tab.innerHTML = `${categoryIcons[category]} <span>${category.charAt(0).toUpperCase() + category.slice(1)}</span>`;
                tab.onclick = () => showEmojiCategory(category, gridContainer);
                tabsContainer.appendChild(tab);
            });
            
            container.appendChild(tabsContainer);
            container.appendChild(gridContainer);
            
            // Clear any existing content
            emojiPicker.innerHTML = '';
            emojiPicker.appendChild(container);
            
            // Show first category by default
            showEmojiCategory('smileys', gridContainer);
            
        } catch (error) {
            console.error('Error initializing emoji picker:', error);
        }
    }

    // Show emoji category
    function showEmojiCategory(category, container) {
        // Update active tab
        const tabs = document.querySelectorAll('.emoji-tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.textContent.toLowerCase() === category) {
                tab.classList.add('active');
            }
        });
        
        // Clear and populate grid
        container.innerHTML = '';
        
        const emojis = emojiCategories[category];
        emojis.forEach(emoji => {
            const button = document.createElement('button');
            button.className = 'emoji-button';
            button.textContent = emoji;
            button.onclick = () => {
                insertEmoji(emoji);
                toggleEmojiPicker();
            };
            container.appendChild(button);
        });
    }

    // Toggle emoji picker visibility
    function toggleEmojiPicker() {
        if (emojiPicker.style.display === 'block') {
            emojiPicker.style.display = 'none';
        } else {
                initializeEmojiPicker();
            
            // Position the emoji picker
            const inputRect = messageInput.getBoundingClientRect();
            emojiPicker.style.bottom = (window.innerHeight - inputRect.top + 10) + 'px';
            emojiPicker.style.left = (inputRect.left + inputRect.width / 2 - 200) + 'px';
            
            emojiPicker.style.display = 'block';
        }
    }

    // Insert emoji into message input
    function insertEmoji(emoji) {
        const start = messageInput.selectionStart;
        const end = messageInput.selectionEnd;
        const text = messageInput.value;
        messageInput.value = text.substring(0, start) + emoji + text.substring(end);
        messageInput.selectionStart = messageInput.selectionEnd = start + emoji.length;
        messageInput.focus();
    }

    // Handle file attachment
    if (attachmentButton) {
    attachmentButton.addEventListener('click', () => {
        fileInput.click();
    });
    }

    // Handle file input
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            handleFileUpload(this.files[0]);
        });
    }

    // Function to create media element
    function createMediaElement(media) {
        // Check if media object is valid and has a URL
        if (!media || typeof media !== 'object' || !media.url) {
            // Remove console warning that's causing log spam
            // Return an empty div instead of logging an error
            return document.createElement('div');
        }
        
        const container = document.createElement('div');
        container.className = 'media-container';
        container.style.border = 'none';
        container.style.outline = 'none';
        container.style.boxShadow = 'none';
        container.style.background = 'transparent';
        
        let mediaElement;
        
        // Check if media.type exists before using startsWith
        if (media.type && typeof media.type === 'string') {
            if (media.type.startsWith('image/')) {
                mediaElement = document.createElement('img');
                mediaElement.src = media.url;
                mediaElement.alt = 'Image';
                mediaElement.style.maxWidth = '100%';
                mediaElement.style.maxHeight = '400px';
                mediaElement.style.objectFit = 'contain';
                mediaElement.style.border = 'none';
                mediaElement.style.outline = 'none';
                mediaElement.style.boxShadow = 'none';
            } else if (media.type.startsWith('video/')) {
                mediaElement = document.createElement('video');
                mediaElement.src = media.url;
                mediaElement.controls = true;
                mediaElement.style.maxWidth = '100%';
                mediaElement.style.maxHeight = '400px';
                mediaElement.style.objectFit = 'contain';
                mediaElement.style.border = 'none';
                mediaElement.style.outline = 'none';
                mediaElement.style.boxShadow = 'none';
            }
        } else {
            // If media.type is missing, try to guess from URL
            const url = media.url.toLowerCase();
            if (url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || 
                url.endsWith('.gif') || url.endsWith('.webp')) {
                mediaElement = document.createElement('img');
                mediaElement.src = media.url;
                mediaElement.alt = 'Image';
                mediaElement.style.maxWidth = '100%';
                mediaElement.style.maxHeight = '400px';
                mediaElement.style.objectFit = 'contain';
                mediaElement.style.border = 'none';
                mediaElement.style.outline = 'none';
                mediaElement.style.boxShadow = 'none';
            } else if (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg')) {
                mediaElement = document.createElement('video');
                mediaElement.src = media.url;
                mediaElement.controls = true;
                mediaElement.style.maxWidth = '100%';
                mediaElement.style.maxHeight = '400px';
                mediaElement.style.objectFit = 'contain';
                mediaElement.style.border = 'none';
                mediaElement.style.outline = 'none';
                mediaElement.style.boxShadow = 'none';
            } else {
                // Create a link if we can't determine the type
                mediaElement = document.createElement('a');
                mediaElement.href = media.url;
                mediaElement.target = '_blank';
                mediaElement.textContent = media.name || 'View Media';
                mediaElement.className = 'media-link';
            }
        }
        
        if (mediaElement) {
            container.appendChild(mediaElement);
            
            // Add media actions
            const actions = document.createElement('div');
            actions.className = 'media-actions';
            
            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'download-btn';
            downloadBtn.innerHTML = '<i class="bi bi-download"></i>';
            downloadBtn.onclick = () => window.open(media.url, '_blank');
            
            const expandBtn = document.createElement('button');
            expandBtn.className = 'expand-btn';
            expandBtn.innerHTML = '<i class="bi bi-arrows-fullscreen"></i>';
            expandBtn.onclick = () => window.open(media.url, '_blank');
            
            actions.appendChild(downloadBtn);
            actions.appendChild(expandBtn);
            container.appendChild(actions);
        }
        
        return container;
    }

    // Function to handle file uploads
    function handleFileUpload(file) {
        if (!file) return;

        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            notifications.error('File Too Large', 'Maximum file size is 5MB');
            return;
        }

        // Check file type
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            notifications.error('Invalid File Type', 'Only images, GIFs, and videos are allowed');
            return;
        }

        // Create and show upload progress
        const progress = createUploadProgress();
        const progressFill = progress.querySelector('.upload-progress-fill');
        const progressInfo = progress.querySelector('.upload-info');
        const preview = progress.querySelector('.upload-preview');

        // Show preview
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.objectFit = 'contain';
            preview.appendChild(img);
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.controls = true;
            video.style.maxWidth = '100%';
            video.style.maxHeight = '100%';
            video.style.objectFit = 'contain';
            preview.appendChild(video);
        }

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('username', username);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/upload-media', true);

            // Track upload progress
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    progressFill.style.width = percentComplete + '%';
                    progressInfo.textContent = Math.round(percentComplete) + '%';
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) {
                    const data = JSON.parse(xhr.responseText);
                    socket.emit('chat message', {
                        text: messageInput.value.trim(),
                        media: {
                            url: data.url,
                            type: data.type,
                            name: file.name
                        }
                    });

                    messageInput.value = '';
                    messageInput.style.height = 'auto';
                    messageInput.focus();
                } else {
                    notifications.error('Upload Failed', 'Failed to upload media');
                }
                progress.remove();
            };

            xhr.onerror = () => {
                notifications.error('Upload Failed', 'Failed to upload media');
                progress.remove();
            };

            xhr.send(formData);
        } catch (error) {
            console.error('Upload error:', error);
            notifications.error('Upload Failed', 'Failed to upload media');
            progress.remove();
        }
    }

    // Create upload progress element
    function createUploadProgress() {
        const progress = document.createElement('div');
        progress.className = 'upload-progress';
        progress.innerHTML = `
            <div class="upload-progress-header">
                <h3 class="upload-progress-title">Uploading Media</h3>
                <button class="upload-progress-close">
                    <i class="bi bi-x"></i>
                </button>
            </div>
            <div class="upload-progress-bar">
                <div class="upload-progress-fill"></div>
            </div>
            <div class="upload-preview"></div>
            <p class="upload-info">0%</p>
        `;
        
        // Add close button functionality
        const closeBtn = progress.querySelector('.upload-progress-close');
        closeBtn.onclick = () => {
            progress.remove();
        };
        
        document.body.appendChild(progress);
        return progress;
    }

    // Function to update online status in message containers
    function updateOnlineStatusInMessages(specificUsername = null) {
        const messageContainers = document.querySelectorAll('.message-container');
        
        messageContainers.forEach(container => {
            const username = container.dataset.username;
            
            // If we only want to update a specific user, skip others
            if (specificUsername && username !== specificUsername) {
                return;
            }
            
            // Skip user's own messages
            if (username === localStorage.getItem('username')) {
                return;
            }
            
            // Only proceed if we have a username
            if (!username) return;
            
            const profilePic = container.querySelector('.message-profile-pic');
            if (!profilePic) return;
            
            // Remove existing indicator if any
            const existingIndicator = profilePic.querySelector('.online-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
            
            // Add indicator if user is online
            if (onlineUsers.has(username)) {
                const indicator = document.createElement('div');
                indicator.className = 'online-indicator';
                profilePic.appendChild(indicator);
            }
        });
    }

    // Helper function to check if a message is short
    function isShortMessage(text) {
        if (!text) return true;
        const trimmedText = text.trim();
        return trimmedText.length <= 30 && !trimmedText.includes('\n');
    }

    // Format timestamp for display
    function formatTimestamp(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // Initialize emoji picker
    initializeEmojiPicker();

    // Function to create message actions menu (reply/react)
    function createMessageActions(messageElement, msg) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        
        // Reply button
        const replyButton = document.createElement('button');
        replyButton.className = 'action-button reply-btn';
        replyButton.innerHTML = '<i class="bi bi-reply"></i>';
        replyButton.title = 'Reply';
        replyButton.addEventListener('click', function(e) {
            e.stopPropagation();
            setupReply(msg);
        });
        actionsDiv.appendChild(replyButton);
        
        // React button
        const reactButton = document.createElement('button');
        reactButton.className = 'action-button react-btn';
        reactButton.innerHTML = '<i class="bi bi-emoji-smile"></i>';
        reactButton.title = 'React';
        reactButton.addEventListener('click', function(e) {
            e.stopPropagation();
            // Check if the message has a valid ID before showing the reaction menu
            if (msg._id) {
                showReactionMenu(e, msg._id);
            } else {
                console.error("Cannot react to message: missing message ID");
                // Optional: show a notification to the user
                if (typeof notifications !== 'undefined') {
                    notifications.error('Error', 'Cannot react to this message');
                }
            }
        });
        actionsDiv.appendChild(reactButton);
        
        return actionsDiv;
    }
    
    // Function to show the reaction menu
    function showReactionMenu(event, messageId) {
        // Log the messageId for debugging
        console.log("Showing reaction menu for message ID:", messageId);
        
        // Verify messageId is not undefined
        if (!messageId) {
            console.error("Cannot show reaction menu: messageId is undefined");
            return;
        }
        
        // Get the message element itself for better positioning
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageElement) {
            console.error('Message element not found for ID:', messageId);
            return;
        }
        
        // Position the menu with respect to viewport boundaries
        const messageRect = messageElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Determine if it's the user's own message
        const isOwnMessage = messageElement.classList.contains('message-own');
        
        // Default positioning
        let top = messageRect.top + (messageRect.height / 2);
        
        // For own messages (left side), position on the left
        // For other messages (right side), position on the right
        let left;
        if (isOwnMessage) {
            left = messageRect.left - 40; // Position to the left of user's messages
            if (left < 60) left = 60; // Prevent from going off-screen
        } else {
            left = messageRect.right + 40; // Position to the right of other's messages
            if (left > viewportWidth - 60) left = viewportWidth - 60; // Prevent from going off-screen
        }
        
        // If message is near the top of the viewport, position the menu below
        if (top < 80) {
            top = 80; // Keep menu from going off top edge
        } else if (top > viewportHeight - 80) {
            top = viewportHeight - 80; // Keep menu from going off bottom edge
        }
        
        // Apply positioning
        reactionMenu.style.top = `${top}px`;
        reactionMenu.style.left = `${left}px`;
        reactionMenu.style.transform = 'none'; // Remove the horizontal centering transform
        reactionMenu.style.display = 'block';
        
        // Store the message ID as a data attribute
        reactionMenu.dataset.messageId = messageId;
        
        // Add click event to document to close menu when clicking elsewhere
        document.addEventListener('click', closeReactionMenu);
        
        // Prevent the click from immediately closing the menu
        event.stopPropagation();
    }
    
    // Function to close the reaction menu
    function closeReactionMenu() {
        if (reactionMenu) {
            reactionMenu.style.display = 'none';
            if (reactionMenu.dataset) {
                reactionMenu.dataset.messageId = '';
            }
        }
        document.removeEventListener('click', closeReactionMenu);
    }
    
    // Function to update reactions display on a message
    function updateReactions(messageElement, reactions) {
        if (!messageElement || !reactions) return;
        
        // Find existing reactions container or create one
        let reactionsContainer = messageElement.querySelector('.message-reactions');
        if (!reactionsContainer) {
            reactionsContainer = document.createElement('div');
            reactionsContainer.className = 'message-reactions';
            messageElement.appendChild(reactionsContainer);
        } else {
            // Clear existing reactions
            reactionsContainer.innerHTML = '';
        }
        
        // Skip if there are no reactions
        if (!reactions.length) {
            reactionsContainer.style.display = 'none';
            return;
        } else {
            reactionsContainer.style.display = 'block';
        }
        
        // Group reactions by emoji
        const emojiCounts = {};
        reactions.forEach(reaction => {
            const emoji = reaction.emoji;
            if (!emojiCounts[emoji]) {
                emojiCounts[emoji] = {
                    count: 0,
                    usernames: [],
                    userReacted: false
                };
            }
            emojiCounts[emoji].count++;
            
            const reactionUser = reaction.username || reaction.sender || 'Unknown';
            emojiCounts[emoji].usernames.push(reactionUser);
            
            // Check if current user reacted
            if (reactionUser === username) {
                emojiCounts[emoji].userReacted = true;
            }
        });
        
        // Create badge for each emoji
        for (const emoji in emojiCounts) {
            const badge = document.createElement('span');
            badge.className = 'reaction-badge';
            
            if (emojiCounts[emoji].userReacted) {
                badge.classList.add('user-reacted');
            }
            
            // Add emoji and count
            badge.innerHTML = `${emoji} <span class="reaction-count">${emojiCounts[emoji].count}</span>`;
            
            // Add tooltip showing who reacted
            const userList = emojiCounts[emoji].usernames.join(', ');
            badge.title = userList;
            
            // Add click listener to toggle this reaction
            badge.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                handleReactionClick(messageElement.dataset.messageId, emoji);
            });
            
            reactionsContainer.appendChild(badge);
        }
    }

    // Function to handle reaction click
    function handleReactionClick(messageId, emoji) {
        if (!messageId || !emoji) {
            console.error('Missing message ID or emoji for reaction');
            return;
        }
        
        console.log('Sending reaction:', { messageId, emoji });
        
        // Send the reaction to the server
        socket.emit('message reaction', {
            messageId,
            emoji
        });
    }

    // Function to scroll to original message that was replied to
    function scrollToOriginalMessage(messageId) {
        if (!messageId) return;
        
        console.log(`Attempting to scroll to original message with ID: ${messageId}`);
        
        // Find the message element by its message ID
        const originalMessageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!originalMessageElement) {
            console.log(`Original message with ID ${messageId} not found in the current chat`);
            if (typeof notifications !== 'undefined') {
                notifications.info('Message Not Found', 'The original message may have been deleted or is not in the current view');
            }
            return;
        }
        
        // Get the parent container
        const messageContainer = originalMessageElement.closest('.message-container');
        if (!messageContainer) return;
        
        // Scroll the message into view with a small offset from the top
        const scrollContainer = messagesContainer;
        const offset = 80; // pixels from the top
        const containerRect = scrollContainer.getBoundingClientRect();
        const messageRect = messageContainer.getBoundingClientRect();
        
        // Calculate scroll position
        const scrollPosition = messageContainer.offsetTop - scrollContainer.offsetTop - offset;
        
        // Smooth scroll to the message
        scrollContainer.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
        });
        
        // Add highlight effect
        originalMessageElement.classList.add('highlight-message');
        
        // Remove highlight after animation completes
        setTimeout(() => {
            originalMessageElement.classList.remove('highlight-message');
        }, 3000); // Increased duration to 3s to match the 3 pulses
    }

    // Function to create a message element without adding it to the DOM
    function createMessageElement(msg) {
        const currentSender = msg.username;
        const currentTime = msg.timestamp;
        const isOwnMessage = currentSender === username;
        
        // Create message container
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message-container';
        
        // Check if message should be grouped with previous messages
        const shouldGroup = shouldGroupMessages(currentSender, currentTime);
        
        if (!shouldGroup || !lastMessageWrapper) {
            // Create new message wrapper for standalone or first in a series
            const messageWrapper = document.createElement('div');
            messageWrapper.className = isOwnMessage ? 'message-wrapper own' : 'message-wrapper';
            
            // Add profile picture if not our own message or not consecutive
            if (!isOwnMessage) {
                const profilePic = document.createElement('div');
                profilePic.className = 'message-profile-pic';
                
                const profilePicLink = document.createElement('a');
                profilePicLink.href = `/user/${msg.username}`;
                profilePicLink.title = `View ${msg.displayName || msg.username}'s profile`;
                
                const profileImg = document.createElement('img');
                profileImg.src = msg.profilePic || '/images/default-profile.png';
                profileImg.alt = msg.displayName || msg.username;
                profileImg.loading = 'lazy';
                
                profilePicLink.appendChild(profileImg);
                profilePic.appendChild(profilePicLink);
                messageWrapper.appendChild(profilePic);
            }
            
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            
            // Add header only for standalone messages
            const header = document.createElement('div');
            header.className = 'message-header';
            
            const sender = document.createElement('a');
            sender.className = 'message-sender';
            sender.textContent = isOwnMessage ? 'You' : (msg.displayName || msg.username);
            sender.href = isOwnMessage ? '/profile' : `/user/${msg.username}`;
            
            const timestamp = document.createElement('span');
            timestamp.className = 'message-time';
            timestamp.textContent = formatTime(new Date(currentTime));
            
            if (isOwnMessage) {
                header.style.flexDirection = 'row-reverse';
                header.style.textAlign = 'right';
                header.appendChild(timestamp);
                header.appendChild(sender);
            } else {
                header.appendChild(sender);
                header.appendChild(timestamp);
            }
            
            messageContent.appendChild(header);
            
            // Create message bubble
            const messageBubble = document.createElement('div');
            messageBubble.className = 'message ' + (isOwnMessage ? 'message-own' : 'message-other');
            messageBubble.dataset.messageId = msg._id || '';
            
            // Store reactions data for immediate UI updates
            if (msg.reactions && msg.reactions.length > 0) {
                messageBubble.dataset.reactions = JSON.stringify(msg.reactions);
            }
            
            // Create message actions
            const actionsDiv = createMessageActions(messageBubble, msg);
            messageBubble.appendChild(actionsDiv);
            
            // Create message text container
            const textSpan = document.createElement('span');
            textSpan.className = 'message-text';
            
            // Add reply info if this is a reply
            if (msg.replyTo && (msg.replyTo.messageId || msg.replyTo.id)) {
                const replyToId = msg.replyTo.messageId || msg.replyTo.id;
                
                const replyInfo = document.createElement('div');
                replyInfo.className = 'reply-info';
                replyInfo.dataset.replyToId = replyToId;
                replyInfo.style.cursor = 'pointer'; // Added to show it's clickable
                
                // Make the entire reply info clickable
                replyInfo.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    scrollToOriginalMessage(replyToId);
                });
                
                const replyIcon = document.createElement('span');
                replyIcon.className = 'reply-icon';
                replyIcon.innerHTML = '↩ ';
                replyIcon.style.color = '#f218d9';
                replyIcon.style.marginRight = '4px';
                replyIcon.style.fontWeight = 'bold';
                replyInfo.appendChild(replyIcon);
                
                const replyUsername = document.createElement('span');
                replyUsername.className = 'reply-username';
                replyUsername.textContent = msg.replyTo.username || "Unknown user";
                
                const replyText = document.createElement('span');
                replyText.className = 'reply-text';
                replyText.textContent = msg.replyTo.text || 'Media message';
                
                replyInfo.appendChild(replyUsername);
                replyInfo.appendChild(replyText);
                textSpan.appendChild(replyInfo);
                
                messageBubble.dataset.isReply = "true";
                messageBubble.classList.add('has-reply');
            }
            
            // Add media if present
            if (msg.media && typeof msg.media === 'object' && msg.media.url) {
                const mediaElement = createMediaElement(msg.media);
                if (mediaElement) {
                    textSpan.appendChild(mediaElement);
                }
            }
            
            // Add message text if present
            if (msg.text && msg.text.trim()) {
                const textNode = document.createElement('span');
                textNode.innerHTML = formatMessageText(msg.text);
                textSpan.appendChild(textNode);
            }
            
            // Add text span to message
            messageBubble.appendChild(textSpan);
            
            // Add message time
            const messageTime = document.createElement('div');
            messageTime.className = 'message-time';
            const formattedTime = formatTime(new Date(currentTime));
            messageTime.textContent = formattedTime;
            messageBubble.appendChild(messageTime);
            
            // Add reactions if present
            if (msg.reactions && msg.reactions.length > 0) {
                updateReactions(messageBubble, msg.reactions);
            }
            
            messageContent.appendChild(messageBubble);
            messageWrapper.appendChild(messageContent);
            messageContainer.appendChild(messageWrapper);
            
            // Update last message tracking variables
            lastMessageSender = currentSender;
            lastMessageTime = currentTime;
            lastMessageWrapper = messageWrapper;
        } else {
            // This is a consecutive message, append to existing wrapper
            const messageBubble = document.createElement('div');
            messageBubble.className = 'message ' + 
                (isOwnMessage ? 'message-own' : 'message-other') + ' consecutive-message';
            messageBubble.dataset.messageId = msg._id || '';
            
            // Add message actions
            const actionsDiv = createMessageActions(messageBubble, msg);
            messageBubble.appendChild(actionsDiv);
            
            // Create message text
            const textSpan = document.createElement('span');
            textSpan.className = 'message-text';
            
            // Add reply info if this is a reply
            if (msg.replyTo && (msg.replyTo.messageId || msg.replyTo.id)) {
                const replyToId = msg.replyTo.messageId || msg.replyTo.id;
                
                const replyInfo = document.createElement('div');
                replyInfo.className = 'reply-info';
                replyInfo.dataset.replyToId = replyToId;
                
                replyInfo.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    scrollToOriginalMessage(replyToId);
                });
                
                const replyIcon = document.createElement('span');
                replyIcon.className = 'reply-icon';
                replyIcon.innerHTML = '↩ ';
                replyIcon.style.color = '#f218d9';
                replyIcon.style.marginRight = '4px';
                replyIcon.style.fontWeight = 'bold';
                replyInfo.appendChild(replyIcon);
                
                const replyUsername = document.createElement('span');
                replyUsername.className = 'reply-username';
                replyUsername.textContent = msg.replyTo.username || "Unknown user";
                
                const replyText = document.createElement('span');
                replyText.className = 'reply-text';
                replyText.textContent = msg.replyTo.text || 'Media message';
                
                replyInfo.appendChild(replyUsername);
                replyInfo.appendChild(replyText);
                textSpan.appendChild(replyInfo);
                
                messageBubble.dataset.isReply = "true";
                messageBubble.classList.add('has-reply');
            }
            
            // Add media if present
            if (msg.media && typeof msg.media === 'object' && msg.media.url) {
                const mediaElement = createMediaElement(msg.media);
                if (mediaElement) {
                    textSpan.appendChild(mediaElement);
                }
            }
            
            // Add message text if present
            if (msg.text && msg.text.trim()) {
                const textNode = document.createElement('span');
                textNode.innerHTML = formatMessageText(msg.text);
                textSpan.appendChild(textNode);
            }
            
            // Add text span to message
            messageBubble.appendChild(textSpan);
            
            // Add message time
            const messageTime = document.createElement('div');
            messageTime.className = 'message-time';
            const formattedTime = formatTime(new Date(currentTime));
            messageTime.textContent = formattedTime;
            messageBubble.appendChild(messageTime);
            
            // Add reactions if present
            if (msg.reactions && msg.reactions.length > 0) {
                updateReactions(messageBubble, msg.reactions);
            }
            
            // Find the message content in the last message wrapper
            const messageContent = lastMessageWrapper.querySelector('.message-content');
            messageContent.appendChild(messageBubble);
            
            // Update tracking variables
            lastMessageTime = currentTime;
        }
        
        return messageContainer;
    }
}); 