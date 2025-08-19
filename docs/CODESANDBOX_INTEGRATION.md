# CodeSandbox Integration for MECH AI Agent

## Overview

The MECH AI agent now has full CodeSandbox integration, allowing it to create, manage, and share interactive code demonstrations. This enables the agent to:

- Create live, editable code sandboxes from scratch
- Convert repository code into interactive demos
- Update existing sandboxes with new code
- Generate embeddable sandbox widgets

## Available Tools

### 1. `create_codesandbox`
Creates a new CodeSandbox with specified files and configuration.

**Parameters:**
- `files`: Object with file paths as keys and content objects as values
- `template`: (optional) Template type: 'react', 'vue', 'angular', 'node', 'nextjs', 'vanilla', 'react-ts', 'node-ts'
- `dependencies`: (optional) NPM dependencies
- `title`: (optional) Sandbox title
- `description`: (optional) Sandbox description

**Example:**
```javascript
{
  "files": {
    "index.html": {
      "content": "<!DOCTYPE html>..."
    },
    "app.js": {
      "content": "console.log('Hello');"
    }
  },
  "template": "vanilla",
  "title": "My Demo"
}
```

### 2. `update_codesandbox`
Updates files in an existing CodeSandbox.

**Parameters:**
- `sandboxId`: The ID of the sandbox to update
- `files`: Files to update or add

### 3. `get_codesandbox_status`
Retrieves the current status of a CodeSandbox.

**Parameters:**
- `sandboxId`: The ID of the sandbox to check

### 4. `generate_codesandbox_embed`
Generates HTML code to embed a CodeSandbox.

**Parameters:**
- `sandboxId`: The ID of the sandbox to embed
- `options`: Embed options (view, theme, etc.)

### 5. `create_codesandbox_from_repository`
Creates a CodeSandbox from indexed repository files.

**Parameters:**
- `repositoryId`: Repository ID from the database
- `projectId`: Project ID associated with the repository
- `filePaths`: (optional) Specific files to include
- `template`: (optional) Template type
- `title`: (optional) Sandbox title

## Usage Examples

### Example 1: Creating a Simple Demo

When a user asks: "Create a demo showing a simple todo list"

The agent can use:
```javascript
create_codesandbox({
  files: {
    "index.html": {
      content: `<!DOCTYPE html>
<html>
<head>
  <title>Todo List</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <h1>Todo List</h1>
    <input type="text" id="todoInput" placeholder="Add a task...">
    <button onclick="addTodo()">Add</button>
    <ul id="todoList"></ul>
  </div>
  <script src="app.js"></script>
</body>
</html>`
    },
    "app.js": {
      content: `let todos = [];

function addTodo() {
  const input = document.getElementById('todoInput');
  const value = input.value.trim();
  
  if (value) {
    todos.push({ id: Date.now(), text: value, done: false });
    input.value = '';
    renderTodos();
  }
}

function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.done = !todo.done;
    renderTodos();
  }
}

function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  renderTodos();
}

function renderTodos() {
  const list = document.getElementById('todoList');
  list.innerHTML = todos.map(todo => \`
    <li class="\${todo.done ? 'done' : ''}">
      <span onclick="toggleTodo(\${todo.id})">\${todo.text}</span>
      <button onclick="deleteTodo(\${todo.id})">Delete</button>
    </li>
  \`).join('');
}`
    },
    "styles.css": {
      content: `/* Todo list styles */
.container { max-width: 500px; margin: 50px auto; }
.done { text-decoration: line-through; opacity: 0.6; }`
    }
  },
  template: "vanilla",
  title: "Todo List Demo",
  description: "Simple todo list created by MECH AI"
})
```

### Example 2: Creating from Repository Code

When working with an indexed repository:
```javascript
create_codesandbox_from_repository({
  repositoryId: "repo123",
  projectId: "proj456",
  filePaths: ["src/App.js", "src/index.js", "package.json"],
  template: "react",
  title: "React App from Repository"
})
```

### Example 3: Updating Existing Sandbox

To update code in an existing sandbox:
```javascript
update_codesandbox({
  sandboxId: "abc123",
  files: {
    "app.js": {
      content: "// Updated code here"
    }
  }
})
```

## Integration with Container Sessions

The agent can use CodeSandbox in conjunction with WebContainer sessions:

1. **Test locally first**: Use `execute_in_container` to test code
2. **Create sandbox**: Once working, create a CodeSandbox for sharing
3. **Embed in response**: Generate embed code for the user

## Best Practices

1. **Auto-detect templates**: If template isn't specified, the system auto-detects based on files
2. **Include package.json**: For Node/React projects, always include dependencies
3. **Privacy settings**: Default to "unlisted" for user privacy
4. **Error handling**: Check sandbox status after creation
5. **File organization**: Use proper file paths (e.g., `src/App.js` for React)

## Environment Setup

Required environment variables:
- `CODESANDBOX_API_TOKEN`: Your CodeSandbox API token
- `CODESANDBOX_TEAM_ID`: (Optional) Team ID for organization sandboxes

## Common Use Cases

1. **Interactive Tutorials**: Create step-by-step coding tutorials
2. **Bug Reproductions**: Help users create minimal reproductions
3. **Code Reviews**: Show before/after code changes
4. **Portfolio Pieces**: Build interactive demos of user projects
5. **Learning Examples**: Create educational code samples

## Limitations

- File size limits apply (check CodeSandbox documentation)
- Some server-side features may not work in browser sandboxes
- Private sandboxes require paid CodeSandbox account
- Rate limits apply to API calls

## Troubleshooting

Common issues and solutions:

1. **Sandbox not loading**: Check if all required files are included
2. **Build errors**: Ensure package.json has correct dependencies
3. **Template mismatch**: Verify the template matches the code type
4. **API errors**: Check API token and rate limits