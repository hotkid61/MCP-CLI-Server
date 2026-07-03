import { MCPCliServer } from "./mcp-cli-server";
import { cliTools, handleToolCall } from "./mcp-integration";

const cli = new MCPCliServer(process.cwd());

// Simple demo that shows what Claude can do
async function demonstrateCLICapabilities() {
  console.log("\n=== MCP CLI Server - Local Model Ready ===\n");
  console.log("This server is ready to be used with Claude Code and local models.\n");
  console.log("Available tools:\n");
  
  cliTools.forEach((tool, index) => {
    console.log(`${index + 1}. ${tool.name}`);
    console.log(`   ${tool.description}\n`);
  });

  console.log("\n=== Running Demo ===\n");

  // Demo 1: Get system info
  console.log("Demo 1: Getting system info...");
  const sysInfo = await cli.getSystemInfo();
  console.log(sysInfo.stdout);

  // Demo 2: List directory
  console.log("\nDemo 2: Listing current directory...");
  const listing = await cli.listDirectory();
  console.log(listing.stdout.split("\n").slice(0, 5).join("\n"));

  // Demo 3: Create a test file
  console.log("\nDemo 3: Creating a test file...");
  const createResult = await cli.createFile("test.txt", "Hello from MCP CLI Server!");
  console.log(createResult.stdout);

  // Demo 4: Read the file
  console.log("\nDemo 4: Reading the file...");
  const readResult = await cli.readFile("test.txt");
  console.log(readResult.stdout);

  // Demo 5: Execute a command
  console.log("\nDemo 5: Executing a shell command...");
  const cmdResult = await cli.executeCommand("echo 'Hello CLI World' && date");
  console.log(cmdResult.stdout);

  console.log("\n✅ MCP CLI Server is ready to use with Claude Code!");
  console.log("You can now use any of the tools above through Claude Code.\n");
}

demonstrateCLICapabilities().catch(console.error);

export { MCPCliServer, cliTools, handleToolCall };
