
enum StatusCode {
  success = 200,
}

class Result {
  private data?: any;

  constructor(data?: any) {
    this.data = data;
  }

  bodyToString() {
    return this.data;
  }
}

class ErrorResult {
  private statusCode: number;
  private code: string;
  private message: string;
  private metadata?: any = {};

  constructor(statusCode: number, code: string, message: string, metadata?: any) {
    this.statusCode = statusCode;
    this.code = code;
    this.message = message;
    this.metadata = metadata;
  }

  bodyToString() {
    return {
      status: this.statusCode,
      code: this.code,
      message: this.message,
      metadata: this.metadata,
    };
  }
}

export class MessageUtil {
  static success(data: object): any {
    const result = new Result(data);

    return result.bodyToString();
  }

  static error(status: number = 500, code: string, message: string, data?: any) {
    const result = new ErrorResult(status, code, message, data);
    console.error(JSON.stringify(result.bodyToString()));
    return result.bodyToString();
  }
}