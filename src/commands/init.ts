import { CommandDefinition, BaseCommand, logger, runCommand } from '@nexical/cli-core';
import * as git from '../utils/git.js';
import fs from 'node:fs';
import path from 'node:path';

export default class InitCommand extends BaseCommand {
    static description = 'Initialize a new Astrical project.';
    static args: CommandDefinition = {
        args: [
            { name: 'directory', required: true, description: 'Directory to initialize the project in' }
        ],
        options: [
            {
                name: '--repo <url>',
                description: 'Starter repository URL (supports gh@owner/repo syntax)',
                default: 'gh@astrical-cms/starter'
            }
        ]
    };

    static requiresProject = false;

    async run(options: any) {
        const directory = options.directory;
        const targetPath = path.resolve(process.cwd(), directory);
        let repoUrl = options.repo;

        // Handle gh@ syntax
        if (repoUrl.startsWith('gh@')) {
            repoUrl = `https://github.com/${repoUrl.substring(3)}.git`;
            logger.debug(`Resolved gh@ shorthad to: ${repoUrl}`);
        }

        logger.debug('Init options:', { directory, targetPath, repoUrl });

        this.info(`Initializing project in: ${targetPath}`);
        this.info(`Using starter repository: ${repoUrl}`);

        if (fs.existsSync(targetPath)) {
            if (fs.readdirSync(targetPath).length > 0) {
                this.error(`Directory ${directory} is not empty.`);
                process.exit(1);
            }
        } else {
            fs.mkdirSync(targetPath, { recursive: true });
        }

        try {
            this.info('Cloning starter repository...');
            await git.clone(repoUrl, targetPath, true);

            this.info('Updating submodules...');
            await git.updateSubmodules(targetPath);

            this.info('Installing dependencies...');
            await runCommand('npm install', targetPath);

            this.info('Re-initializing git history...');
            // Orphan branch strategy to wipe history but keep files
            await git.checkoutOrphan('new-main', targetPath);
            await git.addAll(targetPath);
            await git.commit('Initial commit', targetPath);

            // Delete old main/master (check if they exist first to avoid errors)
            if (await git.branchExists('main', targetPath)) {
                await git.deleteBranch('main', targetPath);
            }
            if (await git.branchExists('master', targetPath)) {
                await git.deleteBranch('master', targetPath);
            }

            await git.renameBranch('main', targetPath);
            await git.removeRemote('origin', targetPath);

            this.success(`Project initialized successfully in ${directory}!`);

        } catch (error: any) {
            this.error(`Failed to initialize project: ${error.message}`);
            process.exit(1);
        }
    }
}
