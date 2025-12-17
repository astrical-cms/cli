import { BaseCommand, logger } from '@nexical/cli-core';
import fs from 'fs-extra';
import path from 'path';

export default class CleanCommand extends BaseCommand {
    static usage = 'clean';
    static description = 'Clean project artifacts and caches.';

    async run(options: any) {
        const coreDir = path.join('src', 'core');

        // Core cleaning logic
        const targets = [
            path.join(coreDir, 'modules'),
            path.join(coreDir, 'src', 'themes'),
            path.join(coreDir, 'content'),
            path.join(coreDir, 'public'),
            path.join(coreDir, 'node_modules'),
            path.join(coreDir, 'dist'),
            'node_modules',
            '_site'
        ];

        for (const target of targets) {
            const targetPath = path.resolve(process.cwd(), target);
            logger.debug(`Checking clean target: ${targetPath}`);
            if (await fs.pathExists(targetPath)) {
                await fs.remove(targetPath);
                // BaseCommand doesn't expose logger property, use helpers or import
                this.info(`Removed: ${target}`);
            }
        }

        this.success('Project environment cleaned.');
    }
}
