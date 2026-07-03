# MCP CLI Server

A Model Context Protocol (MCP) server that allows Claude and other AI models to execute shell commands, manage files, and interact with your system through a safe, controlled interface.

## Features

✅ **Execute arbitrary shell commands** - Run npm install, git clone, etc.  
✅ **Package installation** - Auto-detect apt, brew, npm, pip, pacman, yum  
✅ **File operations** - Create, read, and list directories  
✅ **System information** - Get CPU, memory, OS info  
✅ **Environment variables** - Get and set environment variables  
✅ **Command history** - Track all executions  
✅ **Security checks** - Prevent dangerous commands  
✅ **Timeout protection** - Prevent hanging processes  
✅ **Working directory constraints** - Keep operations in safe paths  

## Installation

### Prerequisites
- Node.js 20+
- npm

### Setup

1. Clone the repository:
```bash
git clone https://github.com/hotkid61/MCP-CLI-Server.git
cd MCP-CLI-Server
```

2. Install dependencies:
```bash
npm install
```

## Usage

### Running the MCP Server

```bash
npm run server
```

The server will start listening for JSON-RPC requests on stdin/stdout.

### Testing Locally

```bash
npm run dev
```

This runs a demo showing all available tools.

## Available Tools

### execute_command
Execute any shell command
```
command: string (required)
timeout: number (optional, default: 30000ms)
cwd: string (optional, working directory)
```

### install_package
Install packages via package manager
```
package_name: string (required)
package_manager: string (optional, auto-detected)
```

### create_file
Create a new file with content
```
file_path: string (required)
content: string (required)
overwrite: boolean (optional, default: false)
```

### read_file
Read file contents
```
file_path: string (required)
```

### list_directory
List directory contents
```
dir_path: string (optional, defaults to current)
```

### get_system_info
Get system information (OS, CPU, memory, uptime)

### get_environment
Get all environment variables

### set_environment_variable
Set an environment variable
```
key: string (required)
value: string (required)
```

### get_history
Get command execution history
```
limit: number (optional, default: 10)
```

## Claude Code Integration

Add to your `mcp.json`:

```json
{
  "mcpServers": {
    "cli-server": {
      "command": "npm",
      "args": [
        "--prefix",
        "/path/to/MCP-CLI-Server",
        "run",
        "server"
      ]
    }
  }
}
```

Replace `/path/to/MCP-CLI-Server` with your actual project path.

## File Structure

```
MCP-CLI-Server/
├── mcp-cli-server.ts      # Core CLI server implementation
├── mcp-integration.ts     # Tool definitions and handlers
├── mcp-server.ts          # MCP protocol wrapper
├── claude-mcp-example.ts  # Demo/testing file
├── tsconfig.json          # TypeScript configuration
├── package.json           # Dependencies
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

## Security

The server implements security checks to prevent dangerous operations:
- Blocks dangerous patterns (rm -rf /, mkfs, dd wipe, fork bombs)
- Constrains file operations to working directory
- Timeout protection on all commands
- Command history tracking

## Development

The server is written in TypeScript and uses:
- `child_process` for command execution
- `fs` for file operations
- `os` for system information
- JSON-RPC for protocol communication

## Examples

### Create a Python script
Ask Claude: "Create a Hello World Python script in hello.py"

### Check installed software
Ask Claude: "Check if Docker is installed and show its version"

### Set up a project
Ask Claude: "Create a Node.js project with Express and install dependencies"

### System management
Ask Claude: "Tell me about the system and list the current directory contents"

## Notes

- All commands execute with a 30-second timeout by default
- File operations are constrained to the working directory
- Command history is limited to 100 entries
- Works with local models through Claude Code

## License

MIT
