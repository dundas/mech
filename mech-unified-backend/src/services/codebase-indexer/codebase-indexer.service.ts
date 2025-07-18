/**
 * Codebase Indexer Service
 * Handles code indexing, embedding generation, and vector search
 */

import { Collection } from 'mongodb';
import { database } from '../../config/database';
import { logger } from '../../utils/logger';
import { 
  ICodeEmbedding, 
  IIndexingJob, 
  IndexingJobStatus,
  ICodeSearchQuery,
  ICodeSearchResult,
  DEFAULT_CHUNK_CONFIG
} from '../../models/codebase-indexer.model';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

export class CodebaseIndexerService {
  private codeEmbeddings: Collection<ICodeEmbedding>;
  private indexingJobs: Collection<IIndexingJob>;
  private openai: OpenAI;

  constructor() {
    const collections = database.getCollections();
    this.codeEmbeddings = collections.codeEmbeddings;
    this.indexingJobs = collections.indexingJobs;
    
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Start a new indexing job
   */
  async startIndexingJob(config: {
    projectId: string;
    repositoryId?: string;
    repositoryName: string;
    branch?: string;
    filePath?: string;
    options?: Partial<IIndexingJob['options']>;
  }): Promise<{ jobId: string; status: string }> {
    const jobId = `idx_${uuidv4()}`;
    
    const job: IIndexingJob = {
      jobId,
      projectId: config.projectId,
      repositoryId: config.repositoryId,
      repositoryName: config.repositoryName,
      branch: config.branch || 'main',
      filePath: config.filePath,
      status: IndexingJobStatus.PENDING,
      progress: {
        totalFiles: 0,
        processedFiles: 0,
        totalChunks: 0,
        processedChunks: 0
      },
      options: {
        incremental: false,
        maxFiles: 1000,
        chunkSize: DEFAULT_CHUNK_CONFIG.chunkSize,
        chunkOverlap: DEFAULT_CHUNK_CONFIG.chunkOverlap,
        ...config.options
      },
      stats: {
        filesIndexed: 0,
        chunksCreated: 0,
        tokensProcessed: 0
      },
      timestamps: {
        created: new Date(),
        lastUpdate: new Date()
      }
    };

    await this.indexingJobs.insertOne(job);
    
    // TODO: Trigger async indexing process
    // For now, we'll implement synchronous indexing in a separate method
    
    logger.info(`Indexing job created: ${jobId}`, {
      projectId: config.projectId,
      repository: config.repositoryName
    });

    return {
      jobId,
      status: 'started'
    };
  }

  /**
   * Get indexing job status
   */
  async getJobStatus(jobId: string): Promise<IIndexingJob | null> {
    return await this.indexingJobs.findOne({ jobId });
  }

  /**
   * Cancel an indexing job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const result = await this.indexingJobs.updateOne(
      { jobId, status: { $in: [IndexingJobStatus.PENDING, IndexingJobStatus.IN_PROGRESS] } },
      { 
        $set: { 
          status: IndexingJobStatus.CANCELLED,
          'timestamps.lastUpdate': new Date()
        }
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Search code embeddings
   */
  async searchCode(query: ICodeSearchQuery): Promise<ICodeSearchResult[]> {
    const { query: searchQuery, projectId, filters, options } = query;
    const limit = options?.limit || 10;
    const scoreThreshold = options?.scoreThreshold || 0.7;

    try {
      // Generate embedding for search query
      const queryEmbedding = await this.generateEmbedding(searchQuery);

      // Build filter
      const filter: any = { projectId };
      if (filters?.repositoryName) {
        filter['metadata.repositoryName'] = filters.repositoryName;
      }
      if (filters?.language) {
        filter['metadata.language'] = filters.language;
      }
      if (filters?.filePath) {
        filter['metadata.filePath'] = { $regex: filters.filePath, $options: 'i' };
      }

      // Perform vector search
      const pipeline = [
        {
          $vectorSearch: {
            index: 'code_vector_index',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: limit * 10,
            limit: limit,
            filter: filter
          }
        },
        {
          $project: {
            _id: 1,
            content: 1,
            metadata: 1,
            score: { $meta: 'vectorSearchScore' }
          }
        },
        {
          $match: {
            score: { $gte: scoreThreshold }
          }
        }
      ];

      const results = await this.codeEmbeddings.aggregate(pipeline).toArray();

      return results.map(doc => ({
        _id: doc._id.toString(),
        content: doc.content,
        score: doc.score,
        metadata: {
          filePath: doc.metadata.filePath,
          repositoryName: doc.metadata.repositoryName,
          language: doc.metadata.language,
          startLine: doc.metadata.startLine,
          endLine: doc.metadata.endLine
        }
      }));
    } catch (error) {
      logger.error('Error searching code embeddings:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: text,
        dimensions: 3072
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Get indexed repositories for a project
   */
  async getIndexedRepositories(projectId: string): Promise<{
    repositories: Array<{
      name: string;
      fileCount: number;
      lastIndexed: Date;
    }>;
  }> {
    const pipeline = [
      { $match: { 'metadata.projectId': projectId } },
      {
        $group: {
          _id: '$metadata.repositoryName',
          fileCount: { $addToSet: '$metadata.filePath' },
          lastIndexed: { $max: '$timestamps.indexed' }
        }
      },
      {
        $project: {
          name: '$_id',
          fileCount: { $size: '$fileCount' },
          lastIndexed: 1,
          _id: 0
        }
      },
      { $sort: { name: 1 } }
    ];

    const repositories = await this.codeEmbeddings.aggregate<{
      name: string;
      fileCount: number;
      lastIndexed: Date;
    }>(pipeline).toArray();

    return { repositories };
  }

  /**
   * Get indexing statistics
   */
  async getIndexingStats(projectId: string): Promise<{
    totalFiles: number;
    totalChunks: number;
    totalRepositories: number;
    languageBreakdown: Record<string, number>;
    lastIndexedAt?: Date;
  }> {
    const [stats] = await this.codeEmbeddings.aggregate([
      { $match: { 'metadata.projectId': projectId } },
      {
        $group: {
          _id: null,
          totalChunks: { $sum: 1 },
          files: { $addToSet: '$metadata.filePath' },
          repositories: { $addToSet: '$metadata.repositoryName' },
          lastIndexed: { $max: '$timestamps.indexed' },
          languages: { $push: '$metadata.language' }
        }
      },
      {
        $project: {
          totalFiles: { $size: '$files' },
          totalChunks: 1,
          totalRepositories: { $size: '$repositories' },
          lastIndexedAt: '$lastIndexed',
          languages: 1
        }
      }
    ]).toArray();

    if (!stats) {
      return {
        totalFiles: 0,
        totalChunks: 0,
        totalRepositories: 0,
        languageBreakdown: {},
        lastIndexedAt: undefined
      };
    }

    // Calculate language breakdown
    const languageBreakdown: Record<string, number> = {};
    stats.languages.forEach((lang: string) => {
      if (lang) {
        languageBreakdown[lang] = (languageBreakdown[lang] || 0) + 1;
      }
    });

    return {
      totalFiles: stats.totalFiles,
      totalChunks: stats.totalChunks,
      totalRepositories: stats.totalRepositories,
      languageBreakdown,
      lastIndexedAt: stats.lastIndexedAt
    };
  }

  /**
   * Delete embeddings for a repository
   */
  async deleteRepositoryEmbeddings(projectId: string, repositoryName: string): Promise<number> {
    const result = await this.codeEmbeddings.deleteMany({
      'metadata.projectId': projectId,
      'metadata.repositoryName': repositoryName
    });

    logger.info(`Deleted ${result.deletedCount} embeddings for repository`, {
      projectId,
      repositoryName
    });

    return result.deletedCount;
  }

  /**
   * Create vector search index if it doesn't exist
   */
  async ensureVectorSearchIndex(): Promise<void> {
    try {
      const indexes = await this.codeEmbeddings.listSearchIndexes().toArray();
      const indexExists = indexes.some(idx => idx.name === 'code_vector_index');

      if (!indexExists) {
        await this.codeEmbeddings.createSearchIndex({
          name: 'code_vector_index',
          type: 'vectorSearch',
          definition: {
            fields: [{
              type: 'vector',
              path: 'embedding',
              numDimensions: 3072,
              similarity: 'cosine'
            }]
          }
        });

        logger.info('Created vector search index: code_vector_index');
      }
    } catch (error) {
      logger.error('Error ensuring vector search index:', error);
      // Non-fatal error - index might already exist
    }
  }

  /**
   * Get similar code snippets
   */
  async getSimilarCode(
    projectId: string, 
    codeSnippet: string, 
    options?: {
      limit?: number;
      excludeFile?: string;
      minScore?: number;
    }
  ): Promise<ICodeSearchResult[]> {
    const query: ICodeSearchQuery = {
      query: codeSnippet,
      projectId,
      options: {
        limit: options?.limit || 5,
        scoreThreshold: options?.minScore || 0.8
      }
    };

    if (options?.excludeFile) {
      query.filters = {
        filePath: { $ne: options.excludeFile } as any
      };
    }

    return this.searchCode(query);
  }
}

// Export singleton instance
export const codebaseIndexerService = new CodebaseIndexerService();