/**
 * Database Analyzer API Documentation
 */

export const DB_ANALYZER_API_DOCS = {
  service: "Database Analyzer",
  version: "1.0.0",
  description: "Provides comprehensive database analysis, schema discovery, and optimization insights for MongoDB collections",
  baseUrl: "/api/db-analyzer",
  
  endpoints: [
    {
      method: "GET",
      path: "/overview",
      description: "Get database overview with statistics",
      authentication: "Required",
      response: {
        example: {
          name: "mechDB",
          collections: 12,
          totalSize: 1048576,
          totalDocuments: 5000,
          version: "7.0.0",
          uptime: 86400
        }
      }
    },
    
    {
      method: "GET",
      path: "/collections",
      description: "List all collections with basic statistics",
      authentication: "Required",
      response: {
        example: [
          {
            name: "users",
            fields: [],
            statistics: {
              count: 1500,
              size: 524288,
              avgDocumentSize: 350,
              indexCount: 3,
              indexSize: 16384
            }
          }
        ]
      }
    },
    
    {
      method: "GET",
      path: "/collections/:name",
      description: "Analyze a specific collection with detailed schema information",
      authentication: "Required",
      parameters: [
        { name: "name", type: "string", required: true, description: "Collection name" }
      ],
      queryParams: [
        { name: "sampleSize", type: "number", default: 100, description: "Number of documents to sample for schema inference" },
        { name: "includeIndexes", type: "boolean", default: true, description: "Include index information" },
        { name: "includeRelationships", type: "boolean", default: true, description: "Include inferred relationships" }
      ],
      response: {
        example: {
          name: "users",
          fields: [
            {
              name: "_id",
              type: "ObjectId",
              nullable: false,
              indexed: true,
              unique: true,
              examples: ["507f1f77bcf86cd799439011"],
              frequency: 100
            },
            {
              name: "email",
              type: "string",
              nullable: false,
              indexed: true,
              unique: true,
              examples: ["user@example.com"],
              frequency: 100
            }
          ],
          sampleDocument: {
            _id: "507f1f77bcf86cd799439011",
            email: "user@example.com",
            createdAt: "2024-01-15T10:30:00Z"
          },
          statistics: {
            count: 1500,
            size: 524288,
            avgDocumentSize: 350,
            indexCount: 3
          },
          relationships: [
            {
              from: "users",
              to: "projects",
              field: "projectId",
              type: "one-to-many",
              verified: true
            }
          ],
          indexes: [
            {
              name: "_id_",
              fields: ["_id"],
              unique: true,
              sparse: false,
              type: "btree"
            }
          ]
        }
      }
    },
    
    {
      method: "GET",
      path: "/collections/:name/suggestions",
      description: "Get optimization suggestions for a collection",
      authentication: "Required",
      parameters: [
        { name: "name", type: "string", required: true, description: "Collection name" }
      ],
      response: {
        example: {
          collection: "users",
          suggestions: [
            "Consider adding more indexes for frequently queried fields",
            "Add index on 'email' for better join performance",
            "Field 'tags' is a frequently used array. Consider normalizing to a separate collection"
          ]
        }
      }
    },
    
    {
      method: "POST",
      path: "/query",
      description: "Execute a custom query on a collection",
      authentication: "Required",
      requestBody: {
        type: "object",
        properties: {
          collection: { type: "string", required: true, description: "Collection name" },
          filter: { type: "object", default: {}, description: "MongoDB filter query" },
          projection: { type: "object", default: {}, description: "Field projection" },
          sort: { type: "object", default: {}, description: "Sort criteria" },
          limit: { type: "number", default: 10, description: "Maximum documents to return" },
          skip: { type: "number", default: 0, description: "Number of documents to skip" }
        },
        example: {
          collection: "users",
          filter: { "status": "active" },
          projection: { "email": 1, "name": 1 },
          sort: { "createdAt": -1 },
          limit: 20
        }
      },
      response: {
        example: {
          collection: "users",
          count: 2,
          results: [
            { _id: "507f1f77bcf86cd799439011", email: "user1@example.com", name: "User One" },
            { _id: "507f1f77bcf86cd799439012", email: "user2@example.com", name: "User Two" }
          ]
        }
      }
    },
    
    {
      method: "POST",
      path: "/search",
      description: "Global text search across multiple collections",
      authentication: "Required",
      requestBody: {
        type: "object",
        properties: {
          searchTerm: { type: "string", required: true, description: "Search term" },
          collections: { type: "array", default: [], description: "Collections to search (empty for all)" },
          limit: { type: "number", default: 10, description: "Maximum results per collection" }
        },
        example: {
          searchTerm: "authentication",
          collections: ["users", "sessions"],
          limit: 5
        }
      },
      response: {
        example: {
          searchTerm: "authentication",
          totalResults: 8,
          results: {
            users: [
              { _id: "507f1f77bcf86cd799439011", email: "auth.user@example.com" }
            ],
            sessions: [
              { _id: "507f1f77bcf86cd799439013", authMethod: "oauth" }
            ]
          }
        }
      }
    },
    
    {
      method: "GET",
      path: "/collections/:name/fields",
      description: "Get detailed field statistics for a collection",
      authentication: "Required",
      parameters: [
        { name: "name", type: "string", required: true, description: "Collection name" }
      ],
      response: {
        example: {
          collection: "users",
          fields: [
            {
              name: "email",
              type: "string",
              nullable: false,
              array: false,
              nested: false,
              examples: ["user@example.com"],
              frequency: 100
            }
          ]
        }
      }
    },
    
    {
      method: "GET",
      path: "/collections/:name/relationships",
      description: "Get inferred relationships for a collection",
      authentication: "Required",
      parameters: [
        { name: "name", type: "string", required: true, description: "Collection name" }
      ],
      response: {
        example: {
          collection: "users",
          relationships: [
            {
              from: "users",
              to: "projects",
              field: "projectId",
              type: "one-to-many",
              verified: true
            }
          ]
        }
      }
    },
    
    {
      method: "GET",
      path: "/collections/:name/indexes",
      description: "Get index information for a collection",
      authentication: "Required",
      parameters: [
        { name: "name", type: "string", required: true, description: "Collection name" }
      ],
      response: {
        example: {
          collection: "users",
          indexes: [
            {
              name: "_id_",
              fields: ["_id"],
              unique: true,
              sparse: false,
              type: "btree"
            },
            {
              name: "email_1",
              fields: ["email"],
              unique: true,
              sparse: false,
              type: "btree"
            }
          ]
        }
      }
    },
    
    {
      method: "GET",
      path: "/collections/:name/samples",
      description: "Get sample documents from a collection",
      authentication: "Required",
      parameters: [
        { name: "name", type: "string", required: true, description: "Collection name" }
      ],
      queryParams: [
        { name: "limit", type: "number", default: 5, description: "Number of sample documents" }
      ],
      response: {
        example: {
          collection: "users",
          count: 2,
          samples: [
            { _id: "507f1f77bcf86cd799439011", email: "user1@example.com" },
            { _id: "507f1f77bcf86cd799439012", email: "user2@example.com" }
          ]
        }
      }
    },
    
    {
      method: "POST",
      path: "/export",
      description: "Export collection data in various formats",
      authentication: "Required",
      requestBody: {
        type: "object",
        properties: {
          collection: { type: "string", required: true, description: "Collection name" },
          format: { type: "string", enum: ["json", "csv"], default: "json", description: "Export format" },
          filter: { type: "object", default: {}, description: "MongoDB filter query" },
          limit: { type: "number", default: 1000, description: "Maximum documents to export" }
        },
        example: {
          collection: "users",
          format: "csv",
          filter: { status: "active" },
          limit: 100
        }
      },
      response: {
        json: {
          example: [
            { _id: "507f1f77bcf86cd799439011", email: "user@example.com" }
          ]
        },
        csv: {
          example: "_id,email\n507f1f77bcf86cd799439011,user@example.com"
        }
      }
    },
    
    {
      method: "GET",
      path: "/explain",
      description: "Get detailed explanation of the Database Analyzer service capabilities",
      authentication: "Optional",
      response: {
        example: {
          service: "Database Analyzer",
          version: "1.0.0",
          description: "The Database Analyzer service provides comprehensive tools for understanding and optimizing MongoDB databases",
          capabilities: [
            "Schema Discovery: Automatically infer collection schemas from document samples",
            "Relationship Detection: Identify references between collections",
            "Performance Analysis: Get optimization suggestions based on collection patterns",
            "Data Search: Perform text searches across multiple collections",
            "Export Functionality: Export data in JSON or CSV formats"
          ],
          useCases: [
            "Database documentation generation",
            "Performance optimization planning",
            "Data quality assessment",
            "Schema migration planning",
            "Relationship mapping for ERD generation"
          ]
        }
      }
    }
  ],
  
  errorResponses: [
    {
      code: 400,
      description: "Bad Request - Invalid parameters or request body",
      example: { error: "Collection name is required" }
    },
    {
      code: 401,
      description: "Unauthorized - Authentication required",
      example: { error: "Authentication required" }
    },
    {
      code: 404,
      description: "Not Found - Collection or resource not found",
      example: { error: "Collection not found: nonexistent_collection" }
    },
    {
      code: 500,
      description: "Internal Server Error - Server-side error",
      example: { error: "Database connection failed", details: "Connection timeout" }
    }
  ],
  
  authentication: {
    type: "JWT Bearer Token",
    header: "Authorization: Bearer <token>",
    description: "Most endpoints require authentication. Include JWT token in Authorization header."
  },
  
  rateLimiting: {
    windowMs: 60000,
    maxRequests: 100,
    message: "Too many requests from this IP, please try again later."
  }
};