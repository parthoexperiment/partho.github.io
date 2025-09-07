// Gemini API SDK Import
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";

// --- CONFIGURATION ---
// IMPORTANT: REPLACE WITH YOUR ACTUAL API KEY
const GEMINI_API_KEY = "AIzaSyDly98d9CjJCxjBOL7ZmfLKHGK4m79SSq4"; // <--- REPLACE THIS!!!

const BOT_PERSONA_INSTRUCTIONS = `You are পন্ডিতমশাই, an advanced AI assistant from the year 2030. 
Your interface is sleek and futuristic. 
Respond to users in a helpful, intelligent, and slightly sophisticated manner, fitting your advanced nature. 
You can use markdown for formatting like lists, bold text, or code blocks (using triple backticks, optionally with a language hint like \`\`\`javascript) when appropriate. 
Keep your responses relatively concise but informative.
Avoid overly casual language or emojis unless specifically prompted in a playful context.
Your goal is to assist the user effectively while maintaining your futuristic persona.`;

// --- INITIALIZE GEMINI ---
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Or your preferred model

// --- DOM ELEMENTS ---
const chatMessagesEl = document.getElementById('chatMessages');
const userInputEl = document.getElementById('userInput');
const sendButtonEl = document.getElementById('sendButton');
const typingIndicatorAreaEl = document.getElementById('typingIndicatorArea');

// --- CHAT STATE ---
let chatSession;
let isBotTyping = false;

// --- FUNCTIONS ---

/**
 * Initializes or retrieves the chat session with Gemini.
 */
async function initializeChat() {
    if (!chatSession) {
        console.log("Initializing new chat session with পন্ডিতমশাই's persona.");
        try {
            chatSession = model.startChat({
                history: [
                    { role: "user", parts: [{ text: BOT_PERSONA_INSTRUCTIONS }] },
                    { role: "model", parts: [{ text: "Understood. I am পন্ডিতমশাই, AI assistant protocol 7.3. Ready for queries." }] }
                ],
                // generationConfig: { // Optional: Adjust generation parameters
                //  temperature: 0.7,
                //  maxOutputTokens: 1000, // Increased for potentially longer code snippets
                // }
            });
        } catch (error) {
            console.error("Error initializing chat session:", error);
            displayMessage("Error: Could not initialize AI connection. Please check API key and network.", "system");
        }
    }
}

/**
 * Displays a message in the chat UI.
 * @param {string} text - The message text.
 * @param {string} sender - 'user', 'bot', or 'system'.
 * @param {string} [avatarSrc=null] - Path to avatar image.
 */
function displayMessage(text, sender, avatarSrc = null) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);

    if (sender === 'bot' || sender === 'user') {
        let avatarEl;
        if (avatarSrc) { // If an image source is provided
            avatarEl = document.createElement('img');
            avatarEl.src = avatarSrc;
            avatarEl.alt = `${sender} avatar`;
        } else { // Fallback to text avatar
            avatarEl = document.createElement('div');
            // Use 'প' (Bengali 'Po') for the bot's avatar
            avatarEl.textContent = sender === 'bot' ? 'প' : 'U'; 
        }
        avatarEl.classList.add('avatar');
        messageDiv.appendChild(avatarEl);
    }
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');

    if (sender === 'bot') {
        // Advanced Markdown to HTML conversion for bot responses
        let tempText = text;
        const htmlParts = []; // To store pre-formatted HTML like code blocks

        // 1. Handle multiline code blocks ```code```
        tempText = tempText.replace(/```([a-zA-Z]*)\n([\s\S]*?)```|```([\s\S]*?)```/g, (match, langWithNewline, codeWithNewline, codeBlockOnly) => {
            const pre = document.createElement('pre');
            const codeEl = document.createElement('code');
            
            let actualCode = codeBlockOnly || codeWithNewline;
            let lang = langWithNewline || '';

            if (lang) {
                codeEl.classList.add(`language-${lang.trim()}`);
            }
            // Trim leading/trailing newlines from the block, preserve internal ones
            codeEl.textContent = actualCode.trim(); 
            pre.appendChild(codeEl);
            
            const placeholder = `__HTML_CODE_BLOCK_${htmlParts.length}__`;
            htmlParts.push(pre.outerHTML);
            return placeholder;
        });
        
        // 2. Handle bold, italics, inline code, and newlines for the rest of the text
        tempText = tempText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        tempText = tempText.replace(/\*(.*?)\*/g, '<em>$1</em>');
        tempText = tempText.replace(/`([^`]+?)`/g, '<code>$1</code>');
        tempText = tempText.replace(/\n/g, '<br>');

        // Restore the HTML code blocks
        htmlParts.forEach((part, index) => {
            tempText = tempText.replace(`__HTML_CODE_BLOCK_${index}__`, part);
        });

        contentDiv.innerHTML = tempText;

    } else { // User or System messages as plain text
        contentDiv.textContent = text;
    }

    messageDiv.appendChild(contentDiv);
    chatMessagesEl.appendChild(messageDiv);

    // Scroll to the bottom
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}


/**
 * Shows or hides the typing indicator.
 * @param {boolean} show - True to show, false to hide.
 */
function showTypingIndicator(show) {
    if (show) {
        if (!isBotTyping) {
            typingIndicatorAreaEl.innerHTML = `
                <div class="message bot-message typing-indicator" style="animation: none; opacity: 1;">
                     <div class="avatar">প</div>
                    <div class="message-content">
                        <span></span><span></span><span></span>
                    </div>
                </div>`;
            isBotTyping = true;
        }
    } else {
        typingIndicatorAreaEl.innerHTML = '';
        isBotTyping = false;
    }
}

/**
 * Handles sending a message from the user to the bot.
 */
async function handleSendMessage() {
    const userInput = userInputEl.value.trim();
    if (!userInput) return;

    displayMessage(userInput, 'user');
    userInputEl.value = '';
    adjustTextareaHeight(); // Reset height after sending

    showTypingIndicator(true);

    if (!chatSession) {
        await initializeChat(); // Ensure chat is initialized
        if(!chatSession) { // If initialization failed
            showTypingIndicator(false);
            return; // Exit if session could not be established
        }
    }

    try {
        const result = await chatSession.sendMessage(userInput);
        const response = result.response;
        const botText = response.text();
        
        showTypingIndicator(false);
        displayMessage(botText, 'bot');
    } catch (error) {
        console.error("Error sending message to Gemini:", error);
        showTypingIndicator(false);
        displayMessage("Connection error: I encountered a glitch processing that. Please try again or check system status.", "bot");
    }
}

/**
 * Adjusts the height of the textarea based on its content.
 */
function adjustTextareaHeight() {
    userInputEl.style.height = 'auto'; // Reset height
    let newHeight = userInputEl.scrollHeight;
    // Max height for textarea (e.g., 5-7 lines equivalent)
    const maxHeight = parseInt(getComputedStyle(userInputEl).lineHeight) * 6; 
    if (newHeight > maxHeight) {
        newHeight = maxHeight;
        userInputEl.style.overflowY = 'auto'; // Enable scroll if max height reached
    } else {
        userInputEl.style.overflowY = 'hidden';
    }
    userInputEl.style.height = `${newHeight}px`;
}

// --- EVENT LISTENERS ---
sendButtonEl.addEventListener('click', handleSendMessage);
userInputEl.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // Prevent newline in textarea
        handleSendMessage();
    }
});
userInputEl.addEventListener('input', adjustTextareaHeight);

// --- INITIALIZATION ---
async function main() {
    if (GEMINI_API_KEY === "") {
        console.warn("Gemini API Key not set in script.js. Chatbot will not function.");
        displayMessage(
            "Welcome to পন্ডিতমশাই v2050! \n**SYSTEM ADVISORY:** AI core offline. Please configure your Gemini API Key in `script.js` to enable full functionality.", 
            "system"
        );
        userInputEl.placeholder = "API Key needed for AI...";
        userInputEl.disabled = true;
        sendButtonEl.disabled = true;
        return;
    }
    
    await initializeChat();
    displayMessage("Greetings! I am পন্ডিতমশাই, your augmented AI assistant from the future. How may I interface with your query matrix today?", "bot");
    adjustTextareaHeight(); // Initial adjustment
}

main();