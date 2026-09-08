import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SessionGuard } from './guards/session.guard';
import { ApiKeyGuard } from './guards/api-key.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { OriginGuard } from './guards/origin.guard';

/** Guards are app-wide; consumed via @UseGuards() anywhere. */
@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionGuard, ApiKeyGuard, PermissionsGuard, OriginGuard],
  exports: [AuthService, SessionGuard, ApiKeyGuard, PermissionsGuard, OriginGuard],
})
export class AuthModule {}
