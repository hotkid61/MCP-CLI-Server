import { MCPCliServer, CommandResult } from "./mcp-cli-server";

/**
 * MCP Tool Definitions for Claude
 */
export const cliTools = [
  {
    name: "execute_command",
    description:
      "Execute a shell command. Use this for running any CLI command like npm install, git commands, etc.",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The shell command to execute",
        },
        timeout: {
          type: "number",
          description: "Command timeout in milliseconds (default: 30000)",
        },
        cwd: {
          type: "string",
          description: "Working directory for command execution",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "install_package",
    description: "Install a package using the system package manager (apt, brew, npm, pip, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        package_name: {
          type: "string",
          description: "Name of the package to install",
        },
        package_manager: {
          type: "string",
          enum: ["apt", "brew", "npm", "pip", "pip3", "pacman", "yum"],
          description: "Package manager to use (auto-detected if not specified)",
        },
      },
      required: ["package_name"],
    },
  },
  {
    name: "create_file",
    description: "Create a new file with the specified content",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the file to create",
        },
        content: {
          type: "string",
          description: "Content of the file",
        },
        overwrite: {
          type: "boolean",
          description: "Whether to overwrite existing file (default: false)",
        },
      },
      required: ["file_path", "content"],
    },
  },
  {
    name: "read_file",
    description: "Read the contents of a file",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the file to read",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "list_directory",
    description: "List the contents of a directory",
    inputSchema: {
      type: "object",
      properties: {
        dir_path: {
          type: "string",
          description: "Path to the directory (defaults to current)",
        },
      },
    },
  },
  {
    name: "get_system_info",
    description: "Get system information like OS, CPU, memory, etc.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_environment",
    description: "Get all environment variables",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "set_environment_variable",
    description: "Set an environment variable",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Environment variable name",
        },
        value: {
          type: "string",
          description: "Environment variable value",
        },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "get_history",
    description: "Get the command execution history",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of history entries to retrieve (default: 10)",
        },
      },
    },
  },
];

/**
 * Tool handler for MCP
 */
export async function handleToolCall(
  toolName: string,
  toolInput: Record<string, any>,
  cli: MCPCliServer
): Promise<any> {
  switch (toolName) {
    case "execute_command":
      return await cli.executeCommand(toolInput.command, {
        timeout: toolInput.timeout,
        cwd: toolInput.cwd,
      });

    case "install_package":
      return await cli.installPackage(toolInput.package_name, toolInput.package_manager);

    case "create_file":
      return await cli.createFile(toolInput.file_path, toolInput.content, {
        overwrite: toolInput.overwrite,
      });

    case "read_file":
      return await cli.readFile(toolInput.file_path);

    case "list_directory":
      return await cli.listDirectory(toolInput.dir_path);

    case "get_system_info":
      return await cli.getSystemInfo();

    case "get_environment":
      return await cli.getEnvironment();

    case "set_environment_variable":
      return cli.setEnvironmentVariable(toolInput.key, toolInput.value);

    case "get_history":
      return {
        success: true,
        history: cli.getHistory(toolInput.limit || 10),
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 0,
      };

    default:
      return {
        success: false,
        stdout: "",
        stderr: `Unknown tool: ${toolName}`,
        exitCode: 1,
        duration: 0,
      };
  }
}
