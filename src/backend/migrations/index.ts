import * as migration_20261013_122224_initial from './20261013_122224_initial.ts';

export const migrations = [
  {
    up: migration_20261013_122224_initial.up,
    down: migration_20261013_122224_initial.down,
    name: '20261013_122224_initial'
  },
];
