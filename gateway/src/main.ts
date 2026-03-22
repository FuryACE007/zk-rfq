/**
 * @file main.ts  — NestJS Application Bootstrap
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  // Global validation pipe — enforces DTO class-validator decorators
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.enableCors({ origin: 'http://localhost:3000' });

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('ZK-RFQ Sovereign Gateway')
    .setDescription(
      'ERC-7683 intent management API for the Sovereign ZK-RFQ Block Trading Gateway. ' +
        'Supports intent submission, solver polling, and ZK-proof bid settlement.'
    )
    .setVersion('1.0.0')
    .addTag('intents', 'ERC-7683 intent lifecycle management')
    .addTag('bids', 'ZK-masked solver bid submission')
    .addTag('health', 'Service health and diagnostics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  ZK-RFQ Sovereign Gateway — ONLINE                       ║`);
  console.log(
    `║  Local Sovereign Pool listening on http://localhost:${port}  ║`
  );
  console.log(
    `║  Swagger docs: http://localhost:${port}/api/docs             ║`
  );
  console.log(`╚══════════════════════════════════════════════════════════╝\n`);
}

bootstrap();
