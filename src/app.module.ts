import { Module, Logger, Global } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ModuleLoaderService } from './shared/module-loader.service';
import { ModuleManagerService } from './shared/module-manager.service';
import { DatabaseModule } from './shared/database.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { existsSync } from 'fs';
import { join } from 'path';

// Importar módulos del dominio de Emigrantes FT
import { AuthModule } from './modules/auth/auth.module';
import { PoaModule } from './modules/poa/poa.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UsersModule } from './modules/users/users.module';

// Importación condicional de módulos opcionales
let EmailModule: any = null;
const emailModulePath = join(__dirname, 'modules/email/email.module');
if (existsSync(emailModulePath + '.ts') || existsSync(emailModulePath + '.js')) {
  try {
    EmailModule = require('./modules/email/email.module').EmailModule;
  } catch (error) {
    // EmailModule no disponible
  }
}

// Los módulos se irán agregando aquí conforme se creen

@Global()
@Module({
  imports: [
    DatabaseModule,
    // Event Emitter for async notifications
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    AuthModule,
    PoaModule,
    NotificationsModule,
    UsersModule,
    // Módulos opcionales
    ...(EmailModule ? [EmailModule] : []),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ModuleLoaderService,
    ModuleManagerService, // Gestor de módulos global
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
  exports: [ModuleManagerService], // Exportar para que esté disponible globalmente
})
export class AppModule {
  private static readonly logger = new Logger(AppModule.name);

  constructor(private moduleManager: ModuleManagerService) {
    AppModule.logger.log('📦 AppModule inicializado - Emigrantes FT');
    AppModule.logger.log(
      '💾 DatabaseModule configurado con PostgreSQL emigrantes_ft',
    );
    AppModule.logger.log('🔐 AuthModule integrado - Autenticación JWT completa');
    AppModule.logger.log('📄 PoaModule integrado - Gestión de Power of Attorney');
    AppModule.logger.log('🔔 NotificationsModule integrado - Sistema multi-canal con cola de procesamiento');

    // Log módulos opcionales
    if (EmailModule) {
      AppModule.logger.log('📧 EmailModule detectado y cargado');
    } else {
      AppModule.logger.warn(
        '📧 EmailModule no disponible - sistema funcionará sin envío de emails',
      );
    }

    AppModule.logger.log('🎛️  ModuleManagerService activado - Gestión modular habilitada');
    AppModule.logger.log('✅ Estructura base lista para módulos');
    AppModule.logger.log('🔧 Interceptores y filtros configurados');
  }
}
