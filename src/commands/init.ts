import { CommandDefinition, BaseCommand, logger, runCommand } from '@nexical/cli-core';
import * as git from '../utils/git.js';
import { resolveGitUrl } from '../utils/url-resolver.js';
import fs from 'fs-extra';
import path from 'path';

export default class InitCommand extends BaseCommand {
    static usage = 'init';
    static description = 'Initialize a new Astrical project.';
    static requiresProject = false;

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

    async run(options: any) {
        const directory = options.directory;
        const targetPath = path.resolve(process.cwd(), directory);
        let repoUrl = resolveGitUrl(options.repo);

        logger.debug('Init options:', { directory, targetPath, repoUrl });

        this.info(`Initializing project in: ${targetPath}`);
        this.info(`Using starter repository: ${repoUrl}`);

        if (await fs.pathExists(targetPath)) {
            if ((await fs.readdir(targetPath)).length > 0) {
                this.error(`Directory ${directory} is not empty.`);
                process.exit(1);
            }
        } else {
            await fs.mkdir(targetPath, { recursive: true });
        }

        try {
            this.info('Cloning starter repository...');
            await git.clone(repoUrl, targetPath, { recursive: true });

            this.info('Updating submodules...');
            await git.updateSubmodules(targetPath);

            this.info('Installing dependencies...');
            await runCommand('npm install', targetPath);

            this.info('Re-initializing git history...');
            // Orphan branch strategy to wipe history but keep files
            await git.checkoutOrphan('new-main', targetPath);

            // Delete old main/master (check if they exist first to avoid errors)
            if (await git.branchExists('main', targetPath)) {
                await git.deleteBranch('main', targetPath);
            }
            if (await git.branchExists('master', targetPath)) {
                await git.deleteBranch('master', targetPath);
            }

            await git.renameBranch('main', targetPath);
            await git.removeRemote('origin', targetPath);

            this.info('Seeding project with Core defaults...');
            const corePath = path.join(targetPath, 'src', 'core');
            const coreThemesDefault = path.join(corePath, 'src', 'themes-default');
            const corePublicDefault = path.join(corePath, 'public-default');
            const coreContentDefault = path.join(corePath, 'content-default');

            // Ensure module directory
            await fs.ensureDir(path.join(targetPath, 'src', 'modules'));

            // Seed Public: content of src/themes-default -> themes (at root)
            if (await fs.pathExists(coreThemesDefault)) {
                await fs.ensureDir(path.join(targetPath, 'themes'));
                await fs.copy(coreThemesDefault, path.join(targetPath, 'themes'), { overwrite: false });
            }

            // Seed Public: content of public-default -> public (at root)
            if (await fs.pathExists(corePublicDefault)) {
                await fs.ensureDir(path.join(targetPath, 'public'));
                await fs.copy(corePublicDefault, path.join(targetPath, 'public'), { overwrite: false });
            }

            // Seed Content: content of content-default -> content (at root)
            if (await fs.pathExists(coreContentDefault)) {
                await fs.ensureDir(path.join(targetPath, 'content'));
                await fs.copy(coreContentDefault, path.join(targetPath, 'content'), { overwrite: false });
            }

            await git.addAll(targetPath);
            await git.commit('Initial commit', targetPath);

            this.success(`Project initialized successfully in ${directory}!`);

        } catch (error: any) {
            this.error(`Failed to initialize project: ${error.message}`);
            process.exit(1);
        }
    }
}
