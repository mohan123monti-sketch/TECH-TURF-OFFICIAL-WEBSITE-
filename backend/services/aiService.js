import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const NEXUS_API_KEY = "nx_1d284ac51863a365befd56663228376e96b14f3308ec9a29";
const NEXUS_AI_URL = 'http://192.168.1.6:8000/api/chat';

export const getAIResponse = async (message) => {
    try {
        const response = await axios.post(NEXUS_AI_URL, {
            message: message,
            options: {}
        }, {
            headers: {
                'x-api-key': NEXUS_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        return response.data.response || response.data.reply || 'No response from AI';
    } catch (error) {
        console.error('Nexus AI Service Error:', error.response?.data || error.message);
        throw error;
    }
};

export const saveAIChat = async (db, userId, message, response) => {
    try {
        await db.run('INSERT INTO ai_chats (user_id, message, response) VALUES (?, ?, ?)', [userId, message, response]);
    } catch (error) {
        console.error('Error saving AI chat history:', error);
        throw error;
    }
};
