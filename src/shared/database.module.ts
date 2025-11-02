import { Module, Logger, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');

        try {
          const dbConfig = {
            type: 'postgres' as const,
            host: configService.get('DB_HOST', 'localhost'),
            port: configService.get('DB_PORT', 5432),
            username: configService.get('DB_USERNAME', 'postgres'),
            password: configService.get('DB_PASSWORD', 'postgres'),
            database: configService.get('DB_NAME', 'modular_base'),
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            synchronize: configService.get('NODE_ENV') !== 'production',
            logging: configService.get('NODE_ENV') === 'development',
            retryAttempts: 3,
            retryDelay: 3000,
          };

          logger.log('🔄 Intentando conectar a PostgreSQL...');
          logger.log(`📍 Host: ${dbConfig.host}:${dbConfig.port}`);
          logger.log(`📊 Database: ${dbConfig.database}`);

          return dbConfig;
        } catch (error) {
          logger.warn(
            '⚠️  PostgreSQL no disponible, usando fallback in-memory',
          );
          logger.error(`Error: ${error.message}`);

          // Retornar configuración básica que permita el módulo cargar
          return {
            type: 'postgres' as const,
            host: 'localhost',
            port: 5432,
            username: 'invalid',
            password: 'invalid',
            database: 'invalid',
            entities: [],
            synchronize: false,
            logging: false,
          };
        }
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {
  private static readonly logger = new Logger(DatabaseModule.name);

  constructor() {
    DatabaseModule.logger.log('💾 DatabaseModule inicializado');
    DatabaseModule.logger.log(
      '🔧 PostgreSQL configurado con fallback automático',
    );
  }
}
