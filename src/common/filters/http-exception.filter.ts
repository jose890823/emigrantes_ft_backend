import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let errorResponse: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      errorResponse = exception.getResponse();
    } else {
      // Log the actual error for debugging
      this.logger.error('Unhandled exception caught:', exception);
      this.logger.error('Stack trace:', (exception as Error)?.stack);

      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error interno del servidor',
        // Include actual error message in development
        ...(process.env.NODE_ENV === 'development' && {
          devMessage: (exception as Error)?.message,
          devStack: (exception as Error)?.stack,
        }),
      };
    }

    const errorMessage =
      typeof errorResponse === 'string' ? errorResponse : errorResponse.message;
    const errorCode =
      typeof errorResponse === 'object' && errorResponse.code
        ? errorResponse.code
        : 'HTTP_ERROR';

    response.status(status).json({
      success: false,
      error: {
        code: errorCode,
        message: Array.isArray(errorMessage)
          ? errorMessage.join(', ')
          : errorMessage,
        details: typeof errorResponse === 'object' ? errorResponse : undefined,
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
