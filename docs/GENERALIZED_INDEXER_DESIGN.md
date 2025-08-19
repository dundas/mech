# Generalized File Indexing Service Architecture

## Overview
Redesign the mech-indexer service to support any file type across multiple applications, integrating with mech-queue for scalable processing.

## Core Design Principles

### 1. Plugin-Based Architecture
- **File Type Processors**: Extensible plugins for different file types
- **Application Adapters**: Support multiple applications with different schemas
- **Processing Pipelines**: Configurable workflows for different content types

### 2. Queue-First Processing
- **Async Processing**: All indexing operations go through mech-queue
- **Scalable Workers**: Multiple workers can process different file types
- **Job Prioritization**: Support for priority-based processing
- **Retry Logic**: Built-in retry and error handling

### 3. Universal Content Model
- **Generic Metadata**: Base metadata that works for any file type
- **Type-Specific Extensions**: Additional metadata for specific file types
- **Application Context**: Support for application-specific metadata

## Architecture Components

### Content Type Registry
```typescript
interface FileTypeProcessor {
  name: string;
  extensions: string[];
  mimeTypes: string[];
  process(content: Buffer | string, metadata: BaseMetadata): Promise<ProcessedContent>;
  validate(content: Buffer | string): boolean;
  extractMetadata(content: Buffer | string): Promise<Partial<BaseMetadata>>;
}
```

### Universal Metadata Schema
```typescript
interface UniversalMetadata {
  // Core fields for any file
  id: string;
  applicationId: string;
  fileType: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  encoding?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  indexedAt: Date;
  
  // Content analysis
  contentHash: string;
  contentType: ContentType;
  language?: string;
  
  // Hierarchy and relationships
  parentId?: string;
  childrenIds?: string[];
  relatedFiles?: string[];
  
  // Application-specific data
  applicationMetadata: Record<string, any>;
  
  // Type-specific extensions
  typeSpecificMetadata: Record<string, any>;
}
```

### Queue Integration
```typescript
interface IndexingJob {
  type: 'index-file' | 'reindex-file' | 'delete-file' | 'bulk-index';
  fileId: string;
  applicationId: string;
  filePath: string;
  fileType: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  options: {
    forceReindex?: boolean;
    generateEmbeddings?: boolean;
    extractText?: boolean;
    generateThumbnails?: boolean;
  };
}
```

## File Type Processors

### 1. Document Processors
- **PDF**: Extract text, metadata, structure
- **Word**: Extract content, formatting, metadata
- **Excel**: Extract data, sheets, formulas
- **PowerPoint**: Extract slides, notes, metadata

### 2. Media Processors
- **Images**: Extract EXIF, generate thumbnails, OCR text
- **Videos**: Extract metadata, thumbnails, transcripts
- **Audio**: Extract metadata, generate transcripts

### 3. Code Processors (Enhanced)
- **Source Code**: Language detection, AST parsing, dependency analysis
- **Config Files**: Schema validation, dependency extraction
- **Build Files**: Dependency analysis, target extraction

### 4. Data Processors
- **JSON**: Schema inference, data profiling
- **CSV**: Schema detection, data profiling
- **XML**: Schema validation, structure analysis
- **Database**: Schema extraction, relationship mapping

### 5. Archive Processors
- **ZIP/RAR**: Extract file listings, process contained files
- **TAR**: Extract and process archived content

## Implementation Plan

### Phase 1: Core Infrastructure
1. **Universal Content Model**: Define base interfaces and types
2. **Plugin Registry**: System for registering and managing processors
3. **Queue Integration**: Integrate with mech-queue service
4. **Base Processors**: Implement processors for common file types

### Phase 2: Enhanced Processing
1. **Advanced Processors**: Add support for specialized file types
2. **Embedding Pipeline**: Generate embeddings for searchable content
3. **Relationship Detection**: Identify file relationships and dependencies
4. **Content Validation**: Implement content validation and security checks

### Phase 3: Application Integration
1. **Multi-Application Support**: Support multiple applications with different schemas
2. **Configuration Management**: Application-specific processing configurations
3. **API Enhancement**: Rich APIs for different use cases
4. **Monitoring and Analytics**: Processing metrics and insights

## Benefits

### For Applications
- **Plug-and-Play**: Easy integration for any application
- **Scalable**: Handles large file processing workloads
- **Flexible**: Configurable processing pipelines
- **Reliable**: Queue-based processing with retries

### For Development
- **Extensible**: Easy to add new file type processors
- **Maintainable**: Clean separation of concerns
- **Testable**: Isolated processors for unit testing
- **Reusable**: Processors can be shared across applications

### For Operations
- **Scalable**: Horizontal scaling through queue workers
- **Monitorable**: Rich metrics and logging
- **Reliable**: Built-in error handling and retries
- **Efficient**: Optimized processing for different file types