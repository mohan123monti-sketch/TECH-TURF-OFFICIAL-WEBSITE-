import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const NEXUS_API_KEY = "nx_1d284ac51863a365befd56663228376e96b14f3308ec9a29";
const NEXUS_AI_URL = 'http://192.168.1.6:8000/api/chat';

const askNexus = async (prompt) => {
    try {
        const response = await axios.post(NEXUS_AI_URL, { message: prompt }, {
            headers: {
                'x-api-key': NEXUS_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        return response.data.response || response.data.reply || "";
    } catch (error) {
        console.error('Nexus AI Service Error:', error.response?.data || error.message);
        throw new Error("AI generation failed via Nexus.");
    }
};

export const analyzeBrand = async (text) => {
    const prompt = `Analyze this brand: ${text}. Extract: tone, voice Archetype, values, keywords, audience. Return as JSON.`;
    return await askNexus(prompt);
};

export const generateCampaign = async (brandData, objective) => {
    const prompt = `Create a multi-channel campaign for ${brandData.name}. Objective: ${objective}. Include Instagram, LinkedIn, Twitter, and Email content. Return as JSON.`;
    return await askNexus(prompt);
};
