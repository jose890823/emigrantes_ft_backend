import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface Response<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
  path: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data) => {
        // Si ya viene con formato estándar, no lo modificar
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'message' in data
        ) {
          return {
            success: true,
            ...data,
            timestamp: new Date().toISOString(),
            path: request.url,
          };
        }

        // Si no, aplicar el formato estándar
        return {
          success: true,
          data,
          message: data?.message || 'Operación realizada exitosamente',
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
