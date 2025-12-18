import { BaseCommand, logger, runCommand } from '@nexical/cli-core';
import path from 'path';
import { spawn } from 'child_process';
import process from 'node:process';
import { linkEnvironment } from '../utils/environment.js';

export default class DevCommand extends BaseCommand {
    static usage = 'dev';
    static description = 'Starts the Astro development server with HMR.';
    static requiresProject = true;

    async run(options: any) {
        const projectRoot = this.projectRoot as string;
        const siteDir = path.resolve(projectRoot, 'site');

        this.info('Initializing ephemeral build environment...');

        try {
            logger.debug(`Preparing environment at: ${projectRoot}`);
            await linkEnvironment(projectRoot);
        } catch (error: any) {
            this.error(error);
            return;
        }

        this.success('Environment linked. Starting build process...');
        try {
            await runCommand(`npm run build`, siteDir);
            this.success('Build completed successfully.');
        } catch (e: any) {
            this.error(`Build failed: ${e.message}`, 1);
        }

        this.success('Environment ready. Starting Astro...');

        const astroBin = path.join(projectRoot, 'node_modules', '.bin', 'astro');
        logger.debug(`Spawning astro dev from: ${astroBin} in ${siteDir}`);

        const child = spawn(astroBin, ['dev'], {
            cwd: siteDir,
            stdio: 'inherit',
            env: {
                ...process.env,
                FORCE_COLOR: '1'
            }
        });

        child.on('error', (err) => {
            this.error(`Failed to start Astro: ${err.message}`);
        });

        const cleanup = () => {
            child.kill();
            process.exit();
        };

        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);

        await new Promise<void>((resolve) => {
            child.on('close', (code) => {
                resolve();
            });
        });
    }
}
