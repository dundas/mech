"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexingWorker = indexingWorker;
const logger_1 = __importDefault(require("../utils/logger"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
async function indexingWorker(job) {
    const { fileId, applicationId, tenantId, filePath, fileType, contentType, options, metadata } = job.data;
    logger_1.default.info(`Processing indexing job ${job.id} for file ${fileId} (${filePath})`);
    try {
        // Update job progress
        await job.updateProgress(10);
        // Validate file exists
        await validateFile(filePath);
        await job.updateProgress(20);
        // Process based on content type
        let result;
        switch (contentType) {
            case 'plain_text':
            case 'markdown':
            case 'source_code':
                result = await processTextFile(filePath, options);
                break;
            case 'json_data':
                result = await processJsonFile(filePath, options);
                break;
            case 'image':
                result = await processImageFile(filePath, options);
                break;
            case 'pdf':
                result = await processPdfFile(filePath, options);
                break;
            default:
                result = await processGenericFile(filePath, options);
        }
        await job.updateProgress(80);
        // Store results in database
        await storeIndexingResults(fileId, applicationId, tenantId, result);
        await job.updateProgress(100);
        logger_1.default.info(`Indexing job ${job.id} completed successfully for file ${fileId}`);
        return {
            fileId,
            status: 'completed',
            result,
            metrics: {
                processingTimeMs: Date.now() - job.processedOn,
                fileSize: result.fileSize,
                textLength: result.textContent?.length || 0,
                embeddingCount: result.embeddings?.length || 0
            }
        };
    }
    catch (error) {
        logger_1.default.error(`Indexing job ${job.id} failed for file ${fileId}:`, error);
        // Store error in database
        await storeIndexingError(fileId, applicationId, tenantId, error);
        throw error;
    }
}
async function validateFile(filePath) {
    try {
        const stats = await promises_1.default.stat(filePath);
        if (!stats.isFile()) {
            throw new Error(`Path is not a file: ${filePath}`);
        }
        // Check file size limits (100MB max)
        if (stats.size > 100 * 1024 * 1024) {
            throw new Error(`File too large: ${stats.size} bytes`);
        }
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            throw new Error(`File not found: ${filePath}`);
        }
        throw error;
    }
}
async function processTextFile(filePath, options) {
    const content = await promises_1.default.readFile(filePath, 'utf-8');
    const stats = await promises_1.default.stat(filePath);
    const result = {
        fileSize: stats.size,
        textContent: content,
        contentHash: generateHash(content),
        language: detectLanguage(filePath, content),
        metadata: {
            lineCount: content.split('\n').length,
            wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
            characterCount: content.length
        }
    };
    if (options.extractText) {
        result.textContent = cleanText(content);
    }
    if (options.generateEmbeddings) {
        result.embeddings = await generateEmbeddings(result.textContent, options.embeddingModel);
    }
    if (options.analyzeStructure) {
        result.structure = analyzeTextStructure(content);
    }
    return result;
}
async function processJsonFile(filePath, options) {
    const content = await promises_1.default.readFile(filePath, 'utf-8');
    const stats = await promises_1.default.stat(filePath);
    try {
        const jsonData = JSON.parse(content);
        const result = {
            fileSize: stats.size,
            textContent: JSON.stringify(jsonData, null, 2),
            contentHash: generateHash(content),
            jsonData,
            metadata: {
                keys: extractJsonKeys(jsonData),
                depth: calculateJsonDepth(jsonData),
                size: Object.keys(jsonData).length
            }
        };
        if (options.generateEmbeddings) {
            // Generate embeddings for the JSON structure
            const textForEmbedding = JSON.stringify(jsonData, null, 2);
            result.embeddings = await generateEmbeddings(textForEmbedding, options.embeddingModel);
        }
        return result;
    }
    catch (error) {
        throw new Error(`Invalid JSON file: ${error}`);
    }
}
async function processImageFile(filePath, options) {
    const stats = await promises_1.default.stat(filePath);
    const content = await promises_1.default.readFile(filePath);
    const result = {
        fileSize: stats.size,
        contentHash: generateHash(content),
        mimeType: getMimeType(filePath),
        metadata: await extractImageMetadata(content)
    };
    if (options.generateThumbnails) {
        result.thumbnails = await generateThumbnails(content);
    }
    if (options.extractText) {
        // OCR processing would go here
        result.ocrText = await performOcr(content);
        if (result.ocrText && options.generateEmbeddings) {
            result.embeddings = await generateEmbeddings(result.ocrText, options.embeddingModel);
        }
    }
    return result;
}
async function processPdfFile(filePath, options) {
    const stats = await promises_1.default.stat(filePath);
    const content = await promises_1.default.readFile(filePath);
    const result = {
        fileSize: stats.size,
        contentHash: generateHash(content),
        mimeType: 'application/pdf'
    };
    if (options.extractText) {
        result.textContent = await extractPdfText(content);
        if (result.textContent && options.generateEmbeddings) {
            result.embeddings = await generateEmbeddings(result.textContent, options.embeddingModel);
        }
    }
    if (options.generateThumbnails) {
        result.thumbnails = await generatePdfThumbnails(content);
    }
    return result;
}
async function processGenericFile(filePath, options) {
    const stats = await promises_1.default.stat(filePath);
    const content = await promises_1.default.readFile(filePath);
    return {
        fileSize: stats.size,
        contentHash: generateHash(content),
        mimeType: getMimeType(filePath),
        metadata: {
            fileName: path_1.default.basename(filePath),
            extension: path_1.default.extname(filePath),
            directory: path_1.default.dirname(filePath)
        }
    };
}
async function storeIndexingResults(fileId, applicationId, tenantId, result) {
    // This would store results in MongoDB or another database
    logger_1.default.info(`Storing indexing results for file ${fileId} in application ${applicationId}`);
    // Mock implementation - in real system, this would use MongoDB or similar
    const document = {
        fileId,
        applicationId,
        tenantId,
        ...result,
        indexedAt: new Date(),
        status: 'completed'
    };
    // await mongoCollection.insertOne(document);
    logger_1.default.debug('Indexing results stored', { fileId, applicationId });
}
async function storeIndexingError(fileId, applicationId, tenantId, error) {
    logger_1.default.info(`Storing indexing error for file ${fileId} in application ${applicationId}`);
    const document = {
        fileId,
        applicationId,
        tenantId,
        status: 'failed',
        error: error.message || String(error),
        indexedAt: new Date()
    };
    // await mongoCollection.insertOne(document);
    logger_1.default.debug('Indexing error stored', { fileId, applicationId });
}
// Utility functions
function generateHash(content) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
}
function detectLanguage(filePath, content) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    const languageMap = {
        '.js': 'javascript',
        '.ts': 'typescript',
        '.py': 'python',
        '.rb': 'ruby',
        '.go': 'go',
        '.java': 'java',
        '.c': 'c',
        '.cpp': 'cpp',
        '.cs': 'csharp',
        '.php': 'php'
    };
    return languageMap[ext];
}
function cleanText(text) {
    return text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();
}
function analyzeTextStructure(content) {
    const lines = content.split('\n');
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    return {
        lineCount: lines.length,
        paragraphCount: paragraphs.length,
        averageLineLength: lines.reduce((sum, line) => sum + line.length, 0) / lines.length
    };
}
function extractJsonKeys(data, prefix = '') {
    const keys = [];
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        for (const key of Object.keys(data)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            keys.push(fullKey);
            if (typeof data[key] === 'object' && data[key] !== null) {
                keys.push(...extractJsonKeys(data[key], fullKey));
            }
        }
    }
    return keys;
}
function calculateJsonDepth(data, currentDepth = 0) {
    if (typeof data !== 'object' || data === null) {
        return currentDepth;
    }
    let maxDepth = currentDepth;
    if (Array.isArray(data)) {
        for (const item of data) {
            maxDepth = Math.max(maxDepth, calculateJsonDepth(item, currentDepth + 1));
        }
    }
    else {
        for (const value of Object.values(data)) {
            maxDepth = Math.max(maxDepth, calculateJsonDepth(value, currentDepth + 1));
        }
    }
    return maxDepth;
}
function getMimeType(filePath) {
    const mime = require('mime-types');
    return mime.lookup(filePath) || 'application/octet-stream';
}
async function generateEmbeddings(text, model) {
    // Mock implementation - in real system, this would call OpenAI or similar
    logger_1.default.debug('Generating embeddings', { textLength: text.length, model });
    // Return mock embedding vector
    return Array.from({ length: 1536 }, () => Math.random());
}
async function extractImageMetadata(content) {
    // Mock implementation - would use exif-reader or similar
    return {
        format: 'unknown',
        width: 0,
        height: 0,
        hasExif: false
    };
}
async function generateThumbnails(content) {
    // Mock implementation - would use sharp or similar
    return [];
}
async function performOcr(content) {
    // Mock implementation - would use tesseract.js or similar
    return '';
}
async function extractPdfText(content) {
    // Mock implementation - would use pdf-parse or similar
    return '';
}
async function generatePdfThumbnails(content) {
    // Mock implementation - would use pdf2pic or similar
    return [];
}
//# sourceMappingURL=indexing.js.map