import { Job } from 'bullmq';
import { OpenAI } from 'openai';
import { config } from '../config';
import logger from '../utils/logger';

interface AIProcessingJobData {
  type: 'completion' | 'embedding' | 'moderation' | 'image-generation';
  model?: string;
  prompt?: string;
  input?: string | string[];
  options?: any;
  _metadata?: any;
}

const openai = config.services.openaiApiKey
  ? new OpenAI({ apiKey: config.services.openaiApiKey })
  : null;

export async function aiProcessingWorker(job: Job<AIProcessingJobData>) {
  const { type, model, prompt, input, options } = job.data;
  const applicationId = job.data._metadata?.applicationId;

  logger.info(`Processing AI job ${job.id} (${type}) for application ${applicationId}`);

  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    let result;

    switch (type) {
      case 'completion':
        result = await processCompletion(prompt!, model, options);
        break;

      case 'embedding':
        result = await processEmbedding(input!, model);
        break;

      case 'moderation':
        result = await processModeration(input!);
        break;

      case 'image-generation':
        result = await processImageGeneration(prompt!, options);
        break;

      default:
        throw new Error(`Unknown AI processing type: ${type}`);
    }

    logger.info(`AI job ${job.id} completed successfully`);
    return result;

  } catch (error) {
    logger.error(`AI job ${job.id} failed:`, error);
    throw error;
  }
}

async function processCompletion(prompt: string, model?: string, options?: any) {
  const completion = await openai!.chat.completions.create({
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

async function processEmbedding(input: string | string[], model?: string) {
  const response = await openai!.embeddings.create({
    model: model || 'text-embedding-3-small',
    input,
  });

  return {
    embeddings: response.data.map(d => d.embedding),
    usage: response.usage,
    model: response.model,
  };
}

async function processModeration(input: string | string[]) {
  const response = await openai!.moderations.create({
    input,
  });

  return {
    results: response.results,
    model: response.model,
  };
}

async function processImageGeneration(prompt: string, options?: any) {
  const response = await openai!.images.generate({
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