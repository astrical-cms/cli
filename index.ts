#!/usr/bin/env node
import { CLI } from './core/src/CLI.js';

import { logger } from './core/src/utils/logger.js';

logger.debug('CLI ENTRY POINT HIT', process.argv);

const app = new CLI({
    commandName: 'astrical',
    searchDirectories: ['commands']
});
app.start();
