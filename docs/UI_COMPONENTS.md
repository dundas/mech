# Repository Management UI Components

## Overview

The Repository Management UI provides a comprehensive interface for managing repositories within projects. It features a modern, responsive design with real-time updates and intuitive navigation patterns.

## Component Architecture

### Page Structure

```
/projects/[projectId]/repositories/
├── page.tsx                           # Main repositories dashboard
├── add/page.tsx                       # Add new repository
├── [repositoryId]/
│   ├── configure/page.tsx             # Repository configuration
│   └── execute/page.tsx               # Repository execution
```

### Component Hierarchy

```
RepositoriesPage
├── StatisticsCards
├── TabsInterface
│   ├── RepositoryCard[]
│   └── EmptyState
└── ActionButtons

RepositoryExecutePage
├── NavigationHeader
└── RepositoryExecutionPanel
    ├── StatusDisplay
    ├── LogViewer
    └── ControlInterface

RepositoryConfigurePage
├── NavigationHeader
└── RepositoryConfig
    ├── BasicSettings
    ├── BuildConfiguration
    └── EnvironmentVariables
```

## Main Dashboard (`/repositories/page.tsx`)

### Features

#### Statistics Overview
- **Total Repositories**: Count of all repositories
- **Active Repositories**: Count of active repositories with green indicator
- **Inactive Repositories**: Count of inactive repositories with gray indicator
- **Error Repositories**: Count of repositories with errors with red indicator

```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{repositories.length}</p>
        </div>
        <GitBranch className="h-8 w-8 text-muted-foreground" />
      </div>
    </CardContent>
  </Card>
  {/* Additional cards... */}
</div>
```

#### Tabbed Interface
- **All Tab**: Shows all repositories with count
- **Active Tab**: Filters to active repositories only
- **Inactive Tab**: Filters to inactive repositories only
- **Error Tab**: Filters to repositories with errors

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList className="mb-6">
    <TabsTrigger value="all">All ({repositories.length})</TabsTrigger>
    <TabsTrigger value="active">
      Active ({repositories.filter(r => r.status === 'active').length})
    </TabsTrigger>
    {/* Additional tabs... */}
  </TabsList>
</Tabs>
```

#### Repository Cards
Each repository is displayed as a card containing:

- **Header**: Repository name, status badge, and description
- **Metadata**: Stars, forks, branch, and language information
- **Configuration**: Framework, build command, and start command
- **Actions**: Execute, Configure, GitHub link, and Delete buttons

```tsx
<Card key={repo.id} className="hover:shadow-md transition-shadow">
  <CardHeader>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <CardTitle className="flex items-center gap-2">
          <span>{repo.name}</span>
          <Badge className={getStatusColor(repo.status)}>
            {repo.status}
          </Badge>
        </CardTitle>
        <CardDescription className="mt-1">
          {repo.description || repo.fullName}
        </CardDescription>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    {/* Repository details and actions */}
  </CardContent>
</Card>
```

### State Management

```tsx
const [repositories, setRepositories] = useState<Repository[]>([]);
const [loading, setLoading] = useState(true);
const [activeTab, setActiveTab] = useState('all');

// Fetch repositories on component mount
useEffect(() => {
  fetchRepositories();
}, [projectId]);

// Filter repositories based on active tab
const filteredRepositories = repositories.filter(repo => {
  switch (activeTab) {
    case 'active': return repo.status === 'active';
    case 'inactive': return repo.status === 'inactive';
    case 'error': return repo.status === 'error';
    default: return true;
  }
});
```

### Actions

#### Execute Repository
```tsx
const handleExecuteRepository = async (repositoryId: string) => {
  try {
    const response = await fetch(`/api/repositories/${repositoryId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    if (response.ok) {
      toast.success('Repository execution started');
      router.push(`/projects/${projectId}/repositories/${repositoryId}/execute`);
    } else {
      toast.error('Failed to start repository execution');
    }
  } catch (error) {
    toast.error('Error executing repository');
  }
};
```

#### Delete Repository
```tsx
const handleDeleteRepository = async (repositoryId: string) => {
  if (!confirm('Are you sure you want to delete this repository?')) {
    return;
  }

  try {
    const response = await fetch(`/api/repositories/${repositoryId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      toast.success('Repository deleted successfully');
      fetchRepositories(); // Refresh list
    } else {
      toast.error('Failed to delete repository');
    }
  } catch (error) {
    toast.error('Error deleting repository');
  }
};
```

## Repository Execution Page (`/[repositoryId]/execute/page.tsx`)

### Features

#### Navigation Header
- **Back Button**: Returns to repositories dashboard
- **Repository Information**: Shows repository name and full name

```tsx
<div className="flex items-center gap-4 mb-8">
  <Button
    variant="outline"
    size="sm"
    onClick={() => router.push(`/projects/${projectId}/repositories`)}
    className="flex items-center gap-2"
  >
    <ArrowLeft className="h-4 w-4" />
    Back to Repositories
  </Button>
  <div>
    <h1 className="text-3xl font-bold">Execute Repository</h1>
    <p className="text-muted-foreground mt-2">
      {repository.name} - {repository.fullName}
    </p>
  </div>
</div>
```

#### Repository Execution Panel
Integrated component that provides:
- Real-time execution status
- Live log streaming
- Control buttons (start, stop, restart)
- Configuration options

```tsx
<RepositoryExecutionPanel repository={repository} />
```

### Error Handling

```tsx
if (!repository) {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardContent className="p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">Repository not found</h3>
          <p className="text-muted-foreground mb-4">
            The repository you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Button onClick={() => router.push(`/projects/${projectId}/repositories`)}>
            Back to Repositories
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Repository Configuration Page (`/[repositoryId]/configure/page.tsx`)

### Features

#### Configuration Interface
- **Repository Settings**: Basic repository information
- **Build Configuration**: Build and start commands
- **Environment Variables**: Custom environment variables
- **Advanced Settings**: Working directory, port, health check URL

#### Save and Navigation
- **Save Button**: Saves configuration changes
- **Back Button**: Returns to repositories dashboard
- **Delete Option**: Removes repository from project

### Integration with RepositoryConfig Component

```tsx
<RepositoryConfig 
  repository={repository}
  onSave={handleSave}
  onDelete={handleDelete}
/>
```

## Shared Components

### RepositoryExecutionPanel

Located at `components/repository-execution-panel.tsx`, this component provides:

#### Status Display
```tsx
<div className="flex items-center gap-2">
  <div className={`h-3 w-3 rounded-full ${getStatusColor(status)}`} />
  <span className="font-medium">{status}</span>
</div>
```

#### Log Viewer
```tsx
<div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
  {logs.map((log, index) => (
    <div key={index} className="mb-1">
      <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
    </div>
  ))}
</div>
```

#### Control Interface
```tsx
<div className="flex gap-2">
  <Button onClick={handleStart} disabled={isRunning}>
    <Play className="h-4 w-4 mr-2" />
    Start
  </Button>
  <Button onClick={handleStop} disabled={!isRunning} variant="outline">
    <Square className="h-4 w-4 mr-2" />
    Stop
  </Button>
  <Button onClick={handleRestart} variant="outline">
    <RotateCcw className="h-4 w-4 mr-2" />
    Restart
  </Button>
</div>
```

### RepositoryConfig

Located at `components/repository-config.tsx`, provides:

#### Form Fields
- **GitHub URL**: Repository URL input
- **Branch**: Branch selection
- **Build Command**: Build command input
- **Start Command**: Start command input
- **Environment Variables**: Key-value pair editor

#### Validation
```tsx
const validateRepository = (data: RepositoryData) => {
  const errors: string[] = [];
  
  if (!data.githubUrl) {
    errors.push('GitHub URL is required');
  }
  
  if (!data.branch) {
    errors.push('Branch is required');
  }
  
  return errors;
};
```

## Styling and Design

### Design System

#### Color Scheme
- **Primary**: Blue tones for primary actions
- **Success**: Green for active status and success states
- **Warning**: Yellow for warning states
- **Error**: Red for error states and destructive actions
- **Neutral**: Gray tones for inactive states and secondary content

#### Status Colors
```tsx
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'inactive':
      return 'bg-gray-100 text-gray-800';
    case 'error':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
```

#### Typography
- **Headings**: Bold, hierarchical sizing
- **Body Text**: Regular weight, readable sizing
- **Code**: Monospace font for commands and code snippets
- **Metadata**: Smaller, muted text for secondary information

### Responsive Design

#### Grid Layout
```tsx
// Desktop: 2 columns, Mobile: 1 column
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {repositories.map(repo => (
    <RepositoryCard key={repo.id} repository={repo} />
  ))}
</div>
```

#### Mobile Optimizations
- **Stacked Layout**: Cards stack vertically on mobile
- **Touch Targets**: Larger buttons for touch interaction
- **Simplified Actions**: Condensed action buttons on small screens

### Animations and Transitions

#### Hover Effects
```tsx
<Card className="hover:shadow-md transition-shadow">
  {/* Card content */}
</Card>
```

#### Loading States
```tsx
{loading ? (
  <div className="flex items-center justify-center h-64">
    <div className="text-lg">Loading repositories...</div>
  </div>
) : (
  <RepositoryList repositories={repositories} />
)}
```

## Accessibility

### Keyboard Navigation
- **Tab Order**: Logical tab order through interactive elements
- **Focus Indicators**: Clear focus indicators on all interactive elements
- **Keyboard Shortcuts**: Common shortcuts for frequent actions

### Screen Reader Support
- **ARIA Labels**: Descriptive labels for all interactive elements
- **Semantic HTML**: Proper heading hierarchy and semantic elements
- **Status Announcements**: Screen reader announcements for status changes

### Color Accessibility
- **Contrast Ratios**: WCAG AA compliant contrast ratios
- **Color Independence**: Information not conveyed by color alone
- **High Contrast Mode**: Support for high contrast mode

## Performance Optimizations

### Lazy Loading
```tsx
// Lazy load repository execution panel
const RepositoryExecutionPanel = lazy(() => 
  import('@/components/repository-execution-panel')
);
```

### Memoization
```tsx
// Memoize filtered repositories
const filteredRepositories = useMemo(() => {
  return repositories.filter(repo => {
    switch (activeTab) {
      case 'active': return repo.status === 'active';
      case 'inactive': return repo.status === 'inactive';
      case 'error': return repo.status === 'error';
      default: return true;
    }
  });
}, [repositories, activeTab]);
```

### Virtual Scrolling
For large repository lists:
```tsx
import { FixedSizeList as List } from 'react-window';

<List
  height={600}
  itemCount={repositories.length}
  itemSize={200}
  itemData={repositories}
>
  {RepositoryCard}
</List>
```

## Testing

### Component Testing
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import RepositoriesPage from './page';

describe('RepositoriesPage', () => {
  it('renders repository cards', () => {
    render(<RepositoriesPage />);
    expect(screen.getByText('Repositories')).toBeInTheDocument();
  });

  it('filters repositories by status', () => {
    render(<RepositoriesPage />);
    fireEvent.click(screen.getByText('Active'));
    // Assert filtered results
  });
});
```

### Integration Testing
```tsx
describe('Repository Management Flow', () => {
  it('allows user to execute repository', async () => {
    render(<RepositoriesPage />);
    
    const executeButton = screen.getByText('Execute');
    fireEvent.click(executeButton);
    
    await waitFor(() => {
      expect(screen.getByText('Repository execution started')).toBeInTheDocument();
    });
  });
});
```

## Best Practices

### Component Design
1. **Single Responsibility**: Each component has a clear, single purpose
2. **Reusability**: Components designed for reuse across different contexts
3. **Composition**: Complex UIs built through component composition
4. **Props Interface**: Clear, well-typed props interfaces

### State Management
1. **Local State**: Use local state for component-specific data
2. **Lifting State**: Lift state up when shared between components
3. **Side Effects**: Use useEffect for data fetching and side effects
4. **Error Boundaries**: Implement error boundaries for graceful error handling

### Performance
1. **Memoization**: Use React.memo and useMemo for expensive operations
2. **Lazy Loading**: Lazy load components that aren't immediately needed
3. **Debouncing**: Debounce user input for search and filtering
4. **Virtualization**: Use virtual scrolling for large lists

### User Experience
1. **Loading States**: Show loading indicators during async operations
2. **Error Handling**: Provide clear error messages and recovery options
3. **Feedback**: Give immediate feedback for user actions
4. **Progressive Enhancement**: Ensure basic functionality without JavaScript 