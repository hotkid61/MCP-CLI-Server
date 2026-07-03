import Anthropic from "@anthropic-sdk/sdk";
import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

interface CommandOptions {
  timeout?: number;
  cwd?: string;
  env?: Record<string, string>;
  shell?: string;
}

/**
 * MCP CLI Server - Allows Claude to execute shell commands safely
 */
class MCPCliServer {
  private allowedCommands = new Set<string>();
  private blockedPatterns: RegExp[] = [];
  private workingDirectory: string;
  private timeout: number = 30000; // 30 seconds default
  private commandHistory: Array<{ command: string; timestamp: Date; result: CommandResult }> = [];
  private maxHistorySize: number = 100;

  constructor(workingDir: string = process.cwd()) {
    this.workingDirectory = path.resolve(workingDir);
    this.initializeSecurityRules();
    console.log(`MCP CLI Server initialized in: ${this.workingDirectory}`);
  }

  /**
   * Initialize security rules to prevent dangerous operations
   */
  private initializeSecurityRules(): void {
    // Blocked patterns - dangerous operations
    this.blockedPatterns = [
      /rm\s+-rf\s+\//, // rm -rf / (system wipe)
      /dd\s+if=\/dev\/zero\s+of=/, // dd wipe
      /mkfs/, // filesystem format
      /format\s+[A-Z]:/, // Windows format
      /:\(\)\s*{\s*:\|:&\s*}/, // Fork bomb
    ];
  }

  /**
   * Whitelist specific commands for unrestricted use
   */
  allowCommand(command: string): void {
    this.allowedCommands.add(command);
  }

  /**
   * Execute a shell command with safety checks
   */
  async executeCommand(command: string, options: CommandOptions = {}): Promise<CommandResult> {
    // Security check
    if (!this.isSafeCommand(command)) {
      return {
        success: false,
        stdout: "",
        stderr: "Command blocked by security policy",
        exitCode: 1,
        duration: 0,
      };
    }

    const startTime = Date.now();
    const timeout = options.timeout || this.timeout;
    const cwd = options.cwd || this.workingDirectory;
    const env = { ...process.env, ...options.env };

    try {
      const result = execSync(command, {
        cwd,
        timeout,
        env,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      const duration = Date.now() - startTime;
      const commandResult: CommandResult = {
        success: true,
        stdout: result.toString(),
        stderr: "",
        exitCode: 0,
        duration,
      };

      this.recordCommand(command, commandResult);
      return commandResult;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const commandResult: CommandResult = {
        success: false,
        stdout: error.stdout?.toString() || "",
        stderr: error.stderr?.toString() || error.message || "",
        exitCode: error.status || 1,
        duration,
      };

      this.recordCommand(command, commandResult);
      return commandResult;
    }
  }

  /**
   * Execute command asynchronously and stream output
   */
  async executeCommandAsync(command: string, options: CommandOptions = {}): Promise<CommandResult> {
    if (!this.isSafeCommand(command)) {
      return {
        success: false,
        stdout: "",
        stderr: "Command blocked by security policy",
        exitCode: 1,
        duration: 0,
      };
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      const cwd = options.cwd || this.workingDirectory;
      const timeout = options.timeout || this.timeout;

      let stdout = "";
      let stderr = "";

      const child = spawn("sh", ["-c", command], {
        cwd,
        timeout,
        shell: options.shell || "/bin/sh",
      });

      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        const duration = Date.now() - startTime;
        const result: CommandResult = {
          success: code === 0,
          stdout,
          stderr,
          exitCode: code || 0,
          duration,
        };
        this.recordCommand(command, result);
        resolve(result);
      });

      child.on("error", (error) => {
        const duration = Date.now() - startTime;
        const result: CommandResult = {
          success: false,
          stdout,
          stderr: error.message,
          exitCode: 1,
          duration,
        };
        this.recordCommand(command, result);
        resolve(result);
      });
    });
  }

  /**
   * Install packages (apt, brew, npm, pip, etc.)
   */
  async installPackage(packageName: string, packageManager?: string): Promise<CommandResult> {
    packageManager = packageManager || this.detectPackageManager();

    const commands: Record<string, string> = {
      apt: `sudo apt-get update && sudo apt-get install -y ${packageName}`,
      brew: `brew install ${packageName}`,
      npm: `npm install -g ${packageName}`,
      pip: `pip install ${packageName}`,
      pip3: `pip3 install ${packageName}`,
      pacman: `sudo pacman -S --noconfirm ${packageName}`,
      yum: `sudo yum install -y ${packageName}`,
    };

    const command = commands[packageManager];
    if (!command) {
      return {
        success: false,
        stdout: "",
        stderr: `Unknown package manager: ${packageManager}`,
        exitCode: 1,
        duration: 0,
      };
    }

    return this.executeCommand(command, { timeout: 120000 }); // 2 minutes timeout for installations
  }

  /**
   * Create a file with content
   */
  async createFile(filePath: string, content: string, options?: { overwrite?: boolean }): Promise<CommandResult> {
    try {
      filePath = path.resolve(filePath);

      // Security check
      if (!filePath.startsWith(this.workingDirectory)) {
        return {
          success: false,
          stdout: "",
          stderr: "Access denied: file path outside working directory",
          exitCode: 1,
          duration: 0,
        };
      }

      if (fs.existsSync(filePath) && !options?.overwrite) {
        return {
          success: false,
          stdout: "",
          stderr: `File already exists: ${filePath}. Use overwrite: true to replace.`,
          exitCode: 1,
          duration: 0,
        };
      }

      const startTime = Date.now();
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, "utf-8");
      const duration = Date.now() - startTime;

      return {
        success: true,
        stdout: `File created: ${filePath}`,
        stderr: "",
        exitCode: 0,
        duration,
      };
    } catch (error: any) {
      return {
        success: false,
        stdout: "",
        stderr: error.message,
        exitCode: 1,
        duration: 0,
      };
    }
  }

  /**
   * Read a file
   */
  async readFile(filePath: string): Promise<CommandResult> {
    try {
      filePath = path.resolve(filePath);

      if (!filePath.startsWith(this.workingDirectory)) {
        return {
          success: false,
          stdout: "",
          stderr: "Access denied: file path outside working directory",
          exitCode: 1,
          duration: 0,
        };
      }

      const startTime = Date.now();
      const content = fs.readFileSync(filePath, "utf-8");
      const duration = Date.now() - startTime;

      return {
        success: true,
        stdout: content,
        stderr: "",
        exitCode: 0,
        duration,
      };
    } catch (error: any) {
      return {
        success: false,
        stdout: "",
        stderr: error.message,
        exitCode: 1,
        duration: 0,
      };
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(dirPath: string = this.workingDirectory): Promise<CommandResult> {
    dirPath = path.resolve(dirPath);

    if (!dirPath.startsWith(this.workingDirectory)) {
      return {
        success: false,
        stdout: "",
        stderr: "Access denied: path outside working directory",
        exitCode: 1,
        duration: 0,
      };
    }

    return this.executeCommand(`ls -la "${dirPath}"`);
  }

  /**
   * Get current working directory
   */
  async getCurrentDirectory(): Promise<CommandResult> {
    return this.executeCommand("pwd");
  }

  /**
   * Change working directory
   */
  changeWorkingDirectory(newDir: string): CommandResult {
    try {
      newDir = path.resolve(newDir);

      if (!newDir.startsWith(this.workingDirectory)) {
        return {
          success: false,
          stdout: "",
          stderr: "Access denied: path outside working directory",
          exitCode: 1,
          duration: 0,
        };
      }

      if (!fs.existsSync(newDir)) {
        return {
          success: false,
          stdout: "",
          stderr: `Directory not found: ${newDir}`,
          exitCode: 1,
          duration: 0,
        };
      }

      this.workingDirectory = newDir;
      return {
        success: true,
        stdout: `Working directory changed to: ${newDir}`,
        stderr: "",
        exitCode: 0,
        duration: 0,
      };
    } catch (error: any) {
      return {
        success: false,
        stdout: "",
        stderr: error.message,
        exitCode: 1,
        duration: 0,
      };
    }
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<CommandResult> {
    try {
      const startTime = Date.now();
      const info = {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        memory: {
          total: Math.round(os.totalmem() / 1024 / 1024) + " MB",
          free: Math.round(os.freemem() / 1024 / 1024) + " MB",
        },
        uptime: Math.round(os.uptime()) + " seconds",
        homeDir: os.homedir(),
        workingDir: this.workingDirectory,
      };

      const duration = Date.now() - startTime;
      return {
        success: true,
        stdout: JSON.stringify(info, null, 2),
        stderr: "",
        exitCode: 0,
        duration,
      };
    } catch (error: any) {
      return {
        success: false,
        stdout: "",
        stderr: error.message,
        exitCode: 1,
        duration: 0,
      };
    }
  }

  /**
   * Get environment variables
   */
  async getEnvironment(): Promise<CommandResult> {
    try {
      const startTime = Date.now();
      const env = process.env;
      const duration = Date.now() - startTime;

      return {
        success: true,
        stdout: JSON.stringify(env, null, 2),
        stderr: "",
        exitCode: 0,
        duration,
      };
    } catch (error: any) {
      return {
        success: false,
        stdout: "",
        stderr: error.message,
        exitCode: 1,
        duration: 0,
      };
    }
  }

  /**
   * Set environment variable
   */
  setEnvironmentVariable(key: string, value: string): CommandResult {
    try {
      process.env[key] = value;
      return {
        success: true,
        stdout: `${key}=${value}`,
        stderr: "",
        exitCode: 0,
        duration: 0,
      };
    } catch (error: any) {
      return {
        success: false,
        stdout: "",
        stderr: error.message,
        exitCode: 1,
        duration: 0,
      };
    }
  }

  /**
   * Get command history
   */
  getHistory(limit: number = 10): Array<{ command: string; timestamp: Date; result: CommandResult }> {
    return this.commandHistory.slice(-limit);
  }

  /**
   * Clear command history
   */
  clearHistory(): void {
    this.commandHistory = [];
  }

  /**
   * Private: Record command execution
   */
  private recordCommand(command: string, result: CommandResult): void {
    this.commandHistory.push({
      command,
      timestamp: new Date(),
      result,
    });

    // Keep history size manageable
    if (this.commandHistory.length > this.maxHistorySize) {
      this.commandHistory.shift();
    }
  }

  /**
   * Private: Check if command is safe to execute
   */
  private isSafeCommand(command: string): boolean {
    // Check if command is in whitelist
    for (const allowed of this.allowedCommands) {
      if (command.trim().startsWith(allowed)) {
        return true;
      }
    }

    // Check blocked patterns
    for (const pattern of this.blockedPatterns) {
      if (pattern.test(command)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Private: Detect available package manager
   */
  private detectPackageManager(): string {
    try {
      execSync("which apt-get", { stdio: "ignore" });
      return "apt";
    } catch {}

    try {
      execSync("which brew", { stdio: "ignore" });
      return "brew";
    } catch {}

    try {
      execSync("which npm", { stdio: "ignore" });
      return "npm";
    } catch {}

    try {
      execSync("which pip3", { stdio: "ignore" });
      return "pip3";
    } catch {}

    return "npm"; // Default fallback
  }
}

// Example usage
async function main() {
  const cli = new MCPCliServer(process.cwd());

  console.log("\n=== MCP CLI Server Demo ===\n");

  // 1. Get system info
  console.log("1. System Information:");
  const sysInfo = await cli.getSystemInfo();
  console.log(sysInfo.stdout);

  // 2. List directory
  console.log("\n2. List Current Directory:");
  const listing = await cli.listDirectory();
  console.log(listing.stdout.split("\n").slice(0, 5).join("\n"));

  // 3. Create a file
  console.log("\n3. Create a test file:");
  const createResult = await cli.createFile("test.txt", "Hello from MCP CLI Server!");
  console.log(createResult.stdout);

  // 4. Read the file
  console.log("\n4. Read the file:");
  const readResult = await cli.readFile("test.txt");
  console.log(readResult.stdout);

  // 5. Execute a command
  console.log("\n5. Execute command:");
  const cmdResult = await cli.executeCommand("echo 'Hello CLI World' && date");
  console.log(cmdResult.stdout);

  // 6. View history
  console.log("\n6. Command History:");
  const history = cli.getHistory(5);
  history.forEach((h, i) => {
    console.log(`  ${i + 1}. ${h.command} (${h.result.duration}ms) - ${h.result.success ? "✓" : "✗"}`);
  });
}

main().catch(console.error);

export { MCPCliServer, CommandResult, CommandOptions };
