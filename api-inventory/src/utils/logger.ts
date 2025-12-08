type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private logLevel: LogLevel;
  private serviceName: string;

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
    this.serviceName = 'inventory-service';
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const logData = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${this.serviceName}] [${level.toUpperCase()}] ${message}${logData}`;
  }

  info(message: string, data?: any): void {
    console.log(this.formatMessage('info', message, data));
  }

  warn(message: string, data?: any): void {
    console.warn(this.formatMessage('warn', message, data));
  }

  error(message: string, data?: any): void {
    console.error(this.formatMessage('error', message, data));
  }

  debug(message: string, data?: any): void {
    if (this.logLevel === 'debug') {
      console.log(this.formatMessage('debug', message, data));
    }
  }
}

export const logger = new Logger();
