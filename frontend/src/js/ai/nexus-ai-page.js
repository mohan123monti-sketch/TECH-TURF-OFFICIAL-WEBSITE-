/**
 * Nexus AI Page Logic
 * Specifically for within the nexus-ai.html page/iframe
 */

document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatWindow = document.getElementById('chat-window');
    
    if (!chatForm || !userInput || !chatWindow) return;

    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000/api';

    const addMessage = (text, sender) => {
        const div = document.createElement('div');
        div.className = `flex gap-6 message-bubble ${sender === 'user' ? 'justify-end' : ''}`;
        
        const avatar = sender === 'ai' 
            ? `<div class="w-12 h-12 rounded-xl iphone-glass flex-shrink-0 flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-xl">
                <i data-lucide="bot" class="w-6 h-6"></i>
               </div>`
            : `<div class="w-12 h-12 rounded-xl iphone-glass flex-shrink-0 flex items-center justify-center border border-blue-500/20 text-blue-400 shadow-xl">
                <i data-lucide="user" class="w-6 h-6"></i>
               </div>`;

        const content = `
            <div class="iphone-glass rounded-[2.5rem] ${sender === 'ai' ? 'rounded-tl-none' : 'rounded-tr-none'} px-10 py-8 text-white text-sm font-medium leading-[1.9] border border-white/5 shadow-xl max-w-[85%]">
                ${text}
            </div>
        `;

        if (sender === 'ai') {
            div.innerHTML = avatar + content;
        } else {
            div.innerHTML = content + avatar;
        }

        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        if (window.lucide) lucide.createIcons();
    };

    const showTyping = () => {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'flex gap-6 message-bubble';
        typingDiv.innerHTML = `
            <div class="w-12 h-12 rounded-xl iphone-glass flex-shrink-0 flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-xl">
                <i data-lucide="bot" class="w-6 h-6"></i>
            </div>
            <div class="iphone-glass rounded-[2.5rem] rounded-tl-none px-10 py-8 text-white/50 text-sm font-black tracking-widest border border-white/5 shadow-xl">
                ANALYZING NEURAL STREAM...
            </div>
        `;
        chatWindow.appendChild(typingDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        if (window.lucide) lucide.createIcons();
    };

    const hideTyping = () => {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) typingIndicator.remove();
    };

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = userInput.value.trim();
        if (!message) return;

        userInput.value = '';
        addMessage(message, 'user');
        showTyping();

        try {
            const token = localStorage.getItem('tt_token');
            const response = await fetch(`${API_BASE_URL}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ message })
            });

            const data = await response.json();
            hideTyping();

            if (data.success && data.reply) {
                addMessage(data.reply, 'ai');
            } else {
                addMessage("I'm having trouble connecting to the neural core. Please ensure the backend is running.", 'ai');
            }
        } catch (error) {
            console.error('Chat error:', error);
            hideTyping();
            addMessage("Protocol error: Unable to transmit to the neural hub.", 'ai');
        }
    });
});
