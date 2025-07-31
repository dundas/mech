"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiProcessingWorker = aiProcessingWorker;
const openai_1 = require("openai");
const config_1 = require("../config");
const logger_1 = __importDefault(require("../utils/logger"));
const openai = config_1.config.services.openaiApiKey
    ? new openai_1.OpenAI({ apiKey: config_1.config.services.openaiApiKey })
    : null;
async function aiProcessingWorker(job) {
    const { type, model, prompt, input, options } = job.data;
    const applicationId = job.data._metadata?.applicationId;
    logger_1.default.info(`Processing AI job ${job.id} (${type}) for application ${applicationId}`);
    if (!openai) {
        throw new Error('OpenAI API key not configured');
    }
    try {
        let result;
        switch (type) {
            case 'completion':
                result = await processCompletion(prompt, model, options);
                break;
            case 'embedding':
                result = await processEmbedding(input, model);
                break;
            case 'moderation':
                result = await processModeration(input);
                break;
            case 'image-generation':
                result = await processImageGeneration(prompt, options);
                break;
            default:
                throw new Error(`Unknown AI processing type: ${type}`);
        }
        logger_1.default.info(`AI job ${job.id} completed successfully`);
        return result;
    }
    catch (error) {
        logger_1.default.error(`AI job ${job.id} failed:`, error);
        throw error;
    }
}
async function processCompletion(prompt, model, options) {
    const completion = await openai.chat.completions.create({
        model: model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        ...options,
    });
    return {
        content: completion.choices[0].message.content,
        usage: completion.usage,
        model: completion.model,
    };
}
async function processEmbedding(input, model) {
    const response = await openai.embeddings.create({
        model: model || 'text-embedding-3-small',
        input,
    });
    return {
        embeddings: response.data.map(d => d.embedding),
        usage: response.usage,
        model: response.model,
    };
}
async function processModeration(input) {
    const response = await openai.moderations.create({
        input,
    });
    return {
        results: response.results,
        model: response.model,
    };
}
async function processImageGeneration(prompt, options) {
    const response = await openai.images.generate({
        prompt,
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'standard',
        n: 1,
        ...options,
    });
    return {
        images: response.data,
        created: response.created,
    };
}
//# sourceMappingURL=ai-processing.js.map