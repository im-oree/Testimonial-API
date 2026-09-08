import { Injectable } from '@nestjs/common';

/**
 * CsvImportService — bulk import flow (README §17.2): upload → streaming
 * parse → column mapping → fingerprint dedupe → bulk insert as pending.
 * Implementation ships in Doc 2 (worker + mapping UI endpoint in Doc 3).
 */
@Injectable()
export class CsvImportService {
  // parseStream / mapColumns / stage / commit — Doc 2
}
