import { Module } from '@nestjs/common';
import { IntentsController } from './intents.controller';
import { IntentsService } from './intents.service';

@Module({
  controllers: [IntentsController],
  providers: [IntentsService],
  exports: [IntentsService],
})
export class IntentsModule {}
