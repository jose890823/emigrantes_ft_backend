import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Crear la aplicación usando el módulo estático
  const app = await NestFactory.create(AppModule);

  // Configurar límite de tamaño para body parser (para archivos base64)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Configurar servicio de archivos estáticos para uploads
  app.use('/uploads', express.static('uploads'));

  // Configurar prefijo global
  app.setGlobalPrefix('api');

  // Configurar validation pipe global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configurar CORS
  app.enableCors();

  // Configurar Swagger
  const config = new DocumentBuilder()
    .setTitle('Modular Base Architecture API')
    .setDescription('API de arquitectura modular súper simple con NestJS')
    .setVersion('1.0')
    .addTag('api', 'Endpoints principales de la API')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'API Docs - Modular Architecture',
    customfavIcon: '/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`🚀 Aplicación corriendo en: http://localhost:${port}`);
  logger.log(`📚 Documentación Swagger en: http://localhost:${port}/api/docs`);
}

bootstrap().catch((error) => {
  console.error('Error iniciando la aplicación:', error);
  process.exit(1);
});
