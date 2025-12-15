import { BaseCommand, logger, runCommand } from '@nexical/cli-core';
import path from 'path';
import { copyEnvironment } from '../utils/environment.js';

export default class BuildCommand extends BaseCommand {
    static usage = 'build';
    static description = 'Builds the production site.';
    static requiresProject = true;

    async run(options: any) {
        if (!this.projectRoot) {
            this.error('Project root not found.');
            return;
        }

        const siteDir = path.resolve(this.projectRoot, '_site');

        try {
            logger.debug(`Preparing environment at: ${this.projectRoot}`);
            await copyEnvironment(this.projectRoot);
        } catch (error: any) {
            this.error(error);
            return;
        }

        this.info('Environment assembled. Running Astro build...');

        const astroBin = path.join(this.projectRoot, 'node_modules', '.bin', 'astro');
        logger.debug(`Using astro binary at: ${astroBin}`);

        try {
            await runCommand(`${astroBin} build`, siteDir);

            this.success('Build completed successfully.');
            this.success(`Output generated at ${path.join(siteDir, 'dist')}`);
        } catch (e: any) {
            this.error(`Build failed: ${e.message}`, 1);
        }
    }
}
