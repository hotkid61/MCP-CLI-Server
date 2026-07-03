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
```bash
npm install --save-dev typescript @types/node tsx
