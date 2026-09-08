import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * Testimonial API — bootstrap.
 * Doc 1 (skeleton) scope: proven startup wiring, global prefix /v1,
 * strict validation pipe, domain-error filter. Endpoints: Doc 3.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // Dev-friendly CORS; production allow-list is a Doc 6 hardening item
  // (origins are ALSO enforced per-request for public keys by OriginGuard).
  app.enableCors({ origin: true, credentials: true });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`Testimonial API listening on http://0.0.0.0:${port}/v1`, 'Bootstrap');
  const mode = process.env.APP_MODE ?? 'prod';
  const engine = mode === 'live' ? 'postgres' : (process.env.DATABASE_PROVIDER ?? 'firebase');
  Logger.log(`APP_MODE=${mode.toUpperCase()} · engine=${engine}${engine === 'firebase' ? ' (Firebase — never used for live traffic; set APP_MODE=live for PostgreSQL)' : ''}`, 'Bootstrap');
}

void bootstrap();
