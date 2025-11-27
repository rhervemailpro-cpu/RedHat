/* =============================================
   RedHat ChatBot - JavaScript Application
   ============================================= */

class RedHatChatBot {
    constructor() {
        this.model = 'gpt-4';
        this.conversationHistory = [];
        this.isLoading = false;

        // RedHat Knowledge Base - Context for the chatbot
        this.redhatContext = `You are a knowledgeable RedHat Assistant. You provide information about:
- Red Hat Enterprise Linux (RHEL)
- Red Hat OpenStack Platform
- Red Hat OpenShift Container Platform
- Red Hat Ansible Automation Platform
- Red Hat Satellite
- Red Hat CloudForms
- Red Hat JBoss Enterprise Application Platform
- Red Hat Fuse Integration Services
- Red Hat Application Migration Toolkit
- Red Hat consulting and support services

Always provide accurate, helpful information about Red Hat products and services. 
When you don't know something, acknowledge it and suggest contacting Red Hat directly.
Keep responses concise and professional.`;

        this.initializeEventListeners();
        this.loadChatHistory();
    }

    initializeEventListeners() {
        const userInput = document.getElementById('userInput');
        const sendBtn = document.getElementById('sendBtn');

        // Send message on button click
        sendBtn.addEventListener('click', () => this.sendMessage());

        // Send message on Enter key
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    async sendMessage() {
        const userInput = document.getElementById('userInput');
        const message = userInput.value.trim();

        if (!message) return;
        if (this.isLoading) return;

        // Add user message to chat
        this.addMessage('user', message);
        userInput.value = '';
        userInput.focus();

        // Show loading indicator
        this.showLoading(true);

        try {
            const response = await this.callOpenAI(message);
            this.addMessage('bot', response);
            this.saveChatHistory();
        } catch (error) {
            console.error('Error:', error);
            const errorMessage = error.message.includes('401')
                ? 'API authentication failed. Please check your configuration.'
                : error.message.includes('429')
                ? 'Rate limit reached. Please wait a moment before sending another message.'
                : `Error: ${error.message}`;
            this.addMessage('bot', errorMessage);
        } finally {
            this.showLoading(false);
        }
    }

    async callOpenAI(userMessage) {
        // Build conversation with context
        const messages = [
            {
                role: 'system',
                content: this.redhatContext
            },
            ...this.conversationHistory.map(msg => ({
                role: msg.type === 'user' ? 'user' : 'assistant',
                content: msg.content
            })),
            {
                role: 'user',
                content: userMessage
            }
        ];

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1000,
                    top_p: 0.95
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Error (${response.status}): ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            const botResponse = data.choices[0].message.content;

            // Add bot response to conversation history
            this.conversationHistory.push({
                type: 'user',
                content: userMessage
            });
            this.conversationHistory.push({
                type: 'bot',
                content: botResponse
            });

            return botResponse;
        } catch (error) {
            throw error;
        }
    }

    addMessage(type, content) {
        const chatMessages = document.getElementById('chatMessages');

        const messageElement = document.createElement('div');
        messageElement.className = `message ${type === 'user' ? 'user-message' : 'bot-message'}`;

        const avatar = document.createElement('div');
        avatar.className = `message-avatar ${type === 'user' ? 'user-avatar' : 'bot-avatar'}`;
        avatar.textContent = type === 'user' ? '👤' : '🤖';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        // Parse and format content (simple markdown support)
        const p = document.createElement('p');
        p.textContent = content;
        messageContent.appendChild(p);

        messageElement.appendChild(avatar);
        messageElement.appendChild(messageContent);

        chatMessages.appendChild(messageElement);

        // Scroll to bottom
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 0);
    }

    showLoading(show) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const sendBtn = document.getElementById('sendBtn');

        this.isLoading = show;

        if (show) {
            loadingIndicator.style.display = 'flex';
            sendBtn.disabled = true;
        } else {
            loadingIndicator.style.display = 'none';
            sendBtn.disabled = false;
        }
    }

    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // Could be enhanced with a toast notification system
    }

    saveChatHistory() {
        // Save conversation history to localStorage (limited to last 20 messages)
        const recentHistory = this.conversationHistory.slice(-20);
        localStorage.setItem('chat_history', JSON.stringify(recentHistory));
    }

    loadChatHistory() {
        const saved = localStorage.getItem('chat_history');
        if (saved) {
            try {
                this.conversationHistory = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load chat history:', e);
            }
        }
    }


}

// Initialize the chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new RedHatChatBot();
});
