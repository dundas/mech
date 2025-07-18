import { Router, Request, Response } from 'express';
import { dbAnalyzerService } from '../../services/db-analyzer/db-analyzer.service';
import { asyncHandler } from '../../middleware/async-handler';
import { DB_ANALYZER_API_DOCS } from './api-docs';

export const dbAnalyzerRouter = Router();

/**
 * Get API documentation
 */
dbAnalyzerRouter.get('/api-docs', (_req: Request, res: Response) => {
  res.json(DB_ANALYZER_API_DOCS);
});

/**
 * Explain the Database Analyzer service
 */
dbAnalyzerRouter.get('/explain', (_req: Request, res: Response) => {
  res.json({
    service: "Database Analyzer",
    version: "1.0.0",
    description: "The Database Analyzer service provides comprehensive tools for understanding and optimizing MongoDB databases",
    capabilities: [
      {
        name: "Schema Discovery",
        description: "Automatically infer collection schemas from document samples",
        features: [
          "Type detection for all fields",
          "Nullable field identification",
          "Nested object analysis",
          "Array type detection",
          "Example value extraction"
        ]
      },
      {
        name: "Relationship Detection",
        description: "Identify references between collections",
        features: [
          "ObjectId reference detection",
          "Naming convention analysis",
          "Many-to-many relationship inference",
          "Relationship verification"
        ]
      },
      {
        name: "Performance Analysis",
        description: "Get optimization suggestions based on collection patterns",
        features: [
          "Index coverage analysis",
          "Large document detection",
          "Array field optimization hints",
          "Query pattern suggestions"
        ]
      },
      {
        name: "Data Search",
        description: "Perform text searches across multiple collections",
        features: [
          "Global text search",
          "Collection-specific search",
          "Regex pattern matching",
          "Field-level search"
        ]
      },
      {
        name: "Export Functionality",
        description: "Export data in various formats",
        features: [
          "JSON export",
          "CSV export with proper escaping",
          "Filtered exports",
          "Pagination support"
        ]
      }
    ],
    useCases: [
      {
        title: "Database Documentation",
        description: "Generate comprehensive documentation of your database schema",
        example: "GET /api/db-analyzer/collections/users"
      },
      {
        title: "Performance Optimization",
        description: "Identify missing indexes and optimization opportunities",
        example: "GET /api/db-analyzer/collections/users/suggestions"
      },
      {
        title: "Data Quality Assessment",
        description: "Analyze field consistency and data types across documents",
        example: "GET /api/db-analyzer/collections/users/fields"
      },
      {
        title: "Schema Migration Planning",
        description: "Understand current schema before planning migrations",
        example: "GET /api/db-analyzer/collections"
      },
      {
        title: "Relationship Mapping",
        description: "Generate ERD-style relationship diagrams",
        example: "GET /api/db-analyzer/collections/users/relationships"
      }
    ],
    quickStart: {
      step1: "Get database overview: GET /api/db-analyzer/overview",
      step2: "List all collections: GET /api/db-analyzer/collections",
      step3: "Analyze a collection: GET /api/db-analyzer/collections/{name}",
      step4: "Get optimization hints: GET /api/db-analyzer/collections/{name}/suggestions"
    },
    apiDocumentation: "/api/db-analyzer/api-docs"
  });
});

/**
 * Get database overview
 */
dbAnalyzerRouter.get('/overview', asyncHandler(async (_req: Request, res: Response) => {
  const overview = await dbAnalyzerService.getDatabaseOverview();
  res.json(overview);
}));

/**
 * List all collections with basic info
 */
dbAnalyzerRouter.get('/collections', asyncHandler(async (_req: Request, res: Response) => {
  const collections = await dbAnalyzerService.listCollections();
  res.json(collections);
}));

/**
 * Analyze a specific collection
 */
dbAnalyzerRouter.get('/collections/:name', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.params;
  const { 
    sampleSize = 100, 
    includeIndexes = true, 
    includeRelationships = true 
  } = req.query;
  
  const schema = await dbAnalyzerService.analyzeCollection(name, {
    sampleSize: Number(sampleSize),
    includeIndexes: includeIndexes === 'true',
    includeRelationships: includeRelationships === 'true'
  });
  
  res.json(schema);
}));

/**
 * Get optimization suggestions for a collection
 */
dbAnalyzerRouter.get('/collections/:name/suggestions', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.params;
  const suggestions = await dbAnalyzerService.getOptimizationSuggestions(name);
  res.json({ collection: name, suggestions });
}));

/**
 * Execute a custom query
 */
dbAnalyzerRouter.post('/query', asyncHandler(async (req: Request, res: Response) => {
  const { collection, filter = {}, projection = {}, sort = {}, limit = 10, skip = 0 } = req.body;
  
  if (!collection) {
    res.status(400).json({ error: 'Collection name is required' });
    return;
  }
  
  const results = await dbAnalyzerService.executeQuery(collection, {
    filter,
    projection,
    sort,
    limit: Number(limit),
    skip: Number(skip)
  });
  
  res.json({
    collection,
    count: results.length,
    results
  });
}));

/**
 * Global search across collections
 */
dbAnalyzerRouter.post('/search', asyncHandler(async (req: Request, res: Response) => {
  const { searchTerm, collections = [], limit = 10 } = req.body;
  
  if (!searchTerm) {
    res.status(400).json({ error: 'Search term is required' });
    return;
  }
  
  const results = await dbAnalyzerService.globalSearch(searchTerm, {
    collections,
    limit: Number(limit)
  });
  
  // Format results
  const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
  
  res.json({
    searchTerm,
    totalResults,
    results
  });
}));

/**
 * Get field statistics for a collection
 */
dbAnalyzerRouter.get('/collections/:name/fields', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.params;
  const schema = await dbAnalyzerService.analyzeCollection(name, {
    sampleSize: 1000,
    includeIndexes: false,
    includeRelationships: false
  });
  
  res.json({
    collection: name,
    fields: schema.fields
  });
}));

/**
 * Get relationships for a collection
 */
dbAnalyzerRouter.get('/collections/:name/relationships', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.params;
  const schema = await dbAnalyzerService.analyzeCollection(name, {
    sampleSize: 10,
    includeIndexes: false,
    includeRelationships: true
  });
  
  res.json({
    collection: name,
    relationships: schema.relationships || []
  });
}));

/**
 * Get indexes for a collection
 */
dbAnalyzerRouter.get('/collections/:name/indexes', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.params;
  const schema = await dbAnalyzerService.analyzeCollection(name, {
    sampleSize: 1,
    includeIndexes: true,
    includeRelationships: false
  });
  
  res.json({
    collection: name,
    indexes: schema.indexes || []
  });
}));

/**
 * Get sample documents from a collection
 */
dbAnalyzerRouter.get('/collections/:name/samples', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.params;
  const { limit = 5 } = req.query;
  
  const results = await dbAnalyzerService.executeQuery(name, {
    limit: Number(limit)
  });
  
  res.json({
    collection: name,
    count: results.length,
    samples: results
  });
}));

/**
 * Export collection data
 */
dbAnalyzerRouter.post('/export', asyncHandler(async (req: Request, res: Response) => {
  const { collection, format = 'json', filter = {}, limit = 1000 } = req.body;
  
  if (!collection) {
    res.status(400).json({ error: 'Collection name is required' });
    return;
  }
  
  const results = await dbAnalyzerService.executeQuery(collection, {
    filter,
    limit: Number(limit)
  });
  
  switch (format) {
    case 'csv':
      // Convert to CSV format
      if (results.length === 0) {
        res.type('text/csv').send('');
        return;
      }
      
      const headers = Object.keys(results[0]).join(',');
      const rows = results.map(doc => 
        Object.values(doc).map(v => 
          typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v
        ).join(',')
      );
      
      res.type('text/csv').send([headers, ...rows].join('\n'));
      break;
      
    case 'json':
    default:
      res.json(results);
      break;
  }
}));