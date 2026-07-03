import { MCPCliServer } from "./mcp-cli-server";
import { cliTools, handleToolCall } from "./mcp-integration";
import * as readline from "readline";

const cli = new MCPCliServer(process.cwd());

interface MCPRequest {
  jsonrpc: string;
  id: number | string;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id: number | string;
  result?: any;
  error?: { code: number; message: string };
}

/**
 * MCP Server - handles JSON-RPC protocol
 */
class MCPServer {
  private requestId: number = 0;

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    const { id, method, params } = request;

    try {
      switch (method) {
        case "initialize":
          return {
            jsonrpc: "2.0",
            id,
            result: {
              protocolVersion: "2024-11-05",
              capabilities: {
                tools: {
                  listChanged: true,
                },
              },
              serverInfo: {
                name: "MCP CLI Server",
                version: "1.0.0",
              },
            },
          };

        case "tools/list":
          return {
            jsonrpc: "2.0",
            id,
            result: {
              tools: cliTools,
            },
          };

        case "tools/call":
          const { name, arguments: toolArgs } = params;
          const result = await handleToolCall(name, toolArgs, cli);
          return {
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            },
          };

        default:
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Unknown method: ${method}`,
            },
          };
      }
    } catch (error: any) {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: error.message || "Internal server error",
        },
      };
    }
  }

  start(): void {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    console.error("[MCP Server] CLI Server started and listening for requests...");

    rl.on("line", async (line) => {
      if (!line.trim()) return;

      try {
        const request: MCPRequest = JSON.parse(line);
        const response = await this.handleRequest(request);
        process.stdout.write(JSON.stringify(response) + "\n");
      } catch (error: any) {
        const errorResponse: MCPResponse = {
          jsonrpc: "2.0",
          id: "unknown",
          error: {
            code: -32700,
            message: "Parse error",
          },
        };
        process.stdout.write(JSON.stringify(errorResponse) + "\n");
      }
    });

    rl.on("close", () => {
      console.error("[MCP Server] Connection closed");
      process.exit(0);
    });
  }
}

const server = new MCPServer();
server.start();
