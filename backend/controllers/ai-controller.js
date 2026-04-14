import { getAIResponse, saveAIChat } from '../services/aiService.js';
import { analyzeBrand, generateCampaign } from '../services/geminiService.js';

// @desc    Chat with AI
// @route   POST /api/ai/chat
export const chatWithAI = async (req, res) => {
    const { message } = req.body;
    const userId = req.user ? req.user.id : 1; // Default to ID 1 for testing if not authenticated
    const db = req.db;

    if (!message) return res.status(400).json({ message: 'Message is required' });

    try {
        const response = await getAIResponse(message);
        await saveAIChat(db, userId, message, response);
        // We return both formats to satisfy both the Official Site (which expects top-level) 
        // and the CRM (which expects it nested in 'data' based on its current frontend logic)
        res.json({
            message,
            response,
            data: { response }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Get chat history
// @route   GET /api/ai/chat
export const getChatHistory = async (req, res) => {
    const db = req.db;
    const userId = req.user ? req.user.id : 1;
    try {
        const history = await db.all('SELECT * FROM ai_chats WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// @desc    Analyze brand DNA
// @route   POST /api/ai/brand/analyze
export const analyzeBrandDNA = async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Text is required' });
    try {
        const analysis = await analyzeBrand(text);
        res.json({ analysis });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Generate campaign
// @route   POST /api/ai/brand/campaign
export const generateBrandCampaign = async (req, res) => {
    const { brandData, objective } = req.body;
    if (!brandData || !objective) return res.status(400).json({ message: 'Brand data and objective are required' });
    try {
        const campaign = await generateCampaign(brandData, objective);
        res.json({ campaign });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
