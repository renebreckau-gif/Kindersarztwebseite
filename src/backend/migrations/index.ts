import * as migration_20261013_122224_initial from './20261013_122224_initial.ts';
import * as migration_20261014_080446_operational_lifecycle from './20261014_080446_operational_lifecycle.ts';

export const migrations = [
  {
    up: migration_20261013_122224_initial.up,
    down: migration_20261013_122224_initial.down,
    name: '20261013_122224_initial',
  },
  {
    up: migration_20261014_080446_operational_lifecycle.up,
    down: migration_20261014_080446_operational_lifecycle.down,
    name: '20261014_080446_operational_lifecycle'
  },
];
