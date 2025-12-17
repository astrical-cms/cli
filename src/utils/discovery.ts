import { logger } from '@nexical/cli-core';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Discovers command directories to load into the CLI.
 * 
 * Scans for:
 * 1. Core commands (projectRoot/src/core/commands)
 * 2. Module commands (projectRoot/src/modules/ * /commands)
 * 
 * @param projectRoot - The root directory of the project
 * @returns Array of absolute paths to command directories
 */
export function discoverCommandDirectories(projectRoot: string): string[] {
    const directories: string[] = [];
    const visited = new Set<string>();

    const addDir = (dir: string) => {
        const resolved = path.resolve(dir);
        if (visited.has(resolved)) return;

        if (fs.existsSync(resolved)) {
            logger.debug(`Found command directory: ${resolved}`);
            directories.push(resolved);
            visited.add(resolved);
        } else {
            logger.debug(`Command directory not found (skipping): ${resolved}`);
        }
    };

    // 1. Core commands
    // Search in projectRoot
    const possibleCorePaths = [
        path.join(projectRoot, 'src/commands'),
        path.join(projectRoot, 'src/core/commands'),
    ];

    possibleCorePaths.forEach(addDir);

    // 2. Module commands
    const modulesDir = path.join(projectRoot, 'src/modules');
    if (fs.existsSync(modulesDir)) {
        try {
            const modules = fs.readdirSync(modulesDir);
            for (const mod of modules) {
                // exclude system files/dirs like .keep
                if (mod.startsWith('.')) continue;

                const modPath = path.join(modulesDir, mod);
                const modCommands = path.join(modPath, 'commands');

                if (fs.existsSync(modPath) && fs.statSync(modPath).isDirectory()) {
                    addDir(modCommands);
                }
            }
        } catch (e: any) {
            logger.debug(`Error scanning modules directory: ${e.message}`);
        }
    }

    return directories;
}
