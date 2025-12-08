type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

class Logger {
  private logLevel: LogLevel;
  private serviceName: string;
  private colors: Record<string, string>;

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
    this.serviceName = 'billing-service';
    this.colors = {
      reset: '\x1b[0m',
      red: '\x1b[31m',     // ERROR
      green: '\x1b[32m',   // SUCCESS
      yellow: '\x1b[33m',  // WARNING
      blue: '\x1b[34m',    // INFO (changed to blue for better visibility)
      magenta: '\x1b[35m', // DEBUG
      cyan: '\x1b[36m',    // INFO alternative
      white: '\x1b[37m'
    };
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const logData = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${this.serviceName}] [${level.toUpperCase()}] ${message}${logData}`;
  }

  private getColorForLevel(level: LogLevel): string {
    switch (level) {
      case 'error': return this.colors.red;
      case 'success': return this.colors.green;
      case 'warn': return this.colors.yellow;
      case 'info': return this.colors.cyan;
      case 'debug': return this.colors.magenta;
      default: return this.colors.white;
    }
  }

  private logWithColor(level: LogLevel, message: string, data?: any): void {
    const color = this.getColorForLevel(level);
    const reset = this.colors.reset;
    
    // Print colored message
    console.log(`${color}[${level.toUpperCase()}]${reset}`, message);
    
    // Print colored data if provided
    if (data) {
      console.log(`${color}${JSON.stringify(data, null, 2)}${reset}`);
    }
  }

  info(message: string, data?: any): void {
    this.logWithColor('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.logWithColor('warn', message, data);
  }

  warning(message: string, data?: any): void {
    this.logWithColor('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.logWithColor('error', message, data);
  }

  success(message: string, data?: any): void {
    this.logWithColor('success', message, data);
  }

  debug(message: string, data?: any): void {
    if (this.logLevel === 'debug') {
      this.logWithColor('debug', message, data);
    }
  }
}

export const logger = new Logger();
