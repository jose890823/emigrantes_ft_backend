import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoaController } from './poa.controller';
import { PoaAdminController } from './poa-admin.controller';
import { PoaService } from './poa.service';
import { POA } from './entities/poa.entity';
import { POADocument } from './entities/poa-document.entity';
import { POAHistory } from './entities/poa-history.entity';
import { POAExecution } from './entities/poa-execution.entity';
import { POAMessage } from './entities/poa-message.entity';
import { POAThread } from './entities/poa-thread.entity';
import { EncryptionService } from '../../shared/encryption.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([POA, POADocument, POAHistory, POAExecution, POAMessage, POAThread]),
  ],
  controllers: [PoaController, PoaAdminController],
  providers: [PoaService, EncryptionService],
  exports: [PoaService],
})
export class PoaModule {}
