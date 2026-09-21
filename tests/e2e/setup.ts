import fs from 'node:fs';
import path from 'node:path';

export default function setup(): void {
  const database = path.resolve('data/e2e.db');
  for (const suffix of ['', '-shm', '-wal']) fs.rmSync(`${database}${suffix}`, { force: true });
}
