import { BaseCommand, logger, runCommand } from '@nexical/cli-core';
import fs from 'fs-extra';
import path from 'path';
import { clone, getRemoteUrl } from '../../utils/git.js';
import { resolveGitUrl } from '../../utils/url-resolver.js';
import YAML from 'yaml';

export default class ModuleAddCommand extends BaseCommand {
    static usage = 'module add <url>';
    static description = 'Add a module and its dependencies as git submodules.';
    static requiresProject = true;

    static args = {
        args: [
            { name: 'url', required: true, description: 'Git repository URL or gh@org/repo' }
        ]
    };

    private visited = new Set<string>();

    async run(options: any) {
        logger.debug('ModuleAdd Options:', options);
        let { url } = options;

        if (!this.projectRoot) {
            this.error('Project root not found.');
            return;
        }

        if (!url) {
            this.error('Please specify a repository URL.');
            return;
        }

        try {
            await this.installModule(url);

            this.info('Syncing workspace dependencies...');
            await runCommand('npm install', this.projectRoot);

            this.success('All modules installed successfully.');
        } catch (e: any) {
            this.error(`Failed to add module: ${e.message}`);
        }
    }

    private async installModule(url: string) {
        // Resolve URL using utility
        url = resolveGitUrl(url);

        // Subdirectory support: url.git//path/to/module
        // We need to handle this carefully. GIT SUBMODULES don't support partial checkout easily.
        // User requirements said: "Support the URL.git//path/to/module syntax. If detected, the 'Clone to Temp' step should perform a sparse checkout or copy only the specified subdirectory to the staging area."
        // BUT we are now using `git submodule add` for the final step.
        // `git submodule add` will add the WHOLE repo.
        // If the user wants a subdirectory, we might have a problem with 'git submodule add'.
        // However, the module system seems to rely on the folder structure.
        // If we strictly follow "Identity is Internal", we inspect module.yaml.
        // If the user provided a subdir, we find module.yaml THERE.
        // But `git submodule add` expects a repo URL.
        // We can't do sparse submodule add easily.
        // I will assume for Phase 1 that if a subdir is given, we warn or we add the whole repo but maybe name it differently?
        // Actually, let's look at the instruction: "Support the URL.git//path/to/module syntax... copy only the specified subdirectory to the staging area... Final Placement: Move the validated temporary folder to modules/[Canonical Name]."
        // WAIT. The PLAN was updated to use `git submodule add`.
        // If we use `git submodule add`, we cannot invoke "copy only subdirectory".
        // This is a conflict in requirements vs plan change.
        // Plan update said: "Inspect-then-Submodule".
        // If I detect a subdir, I can't `submodule add` just the subdir.
        // I will implement standard behavior: `submodule add` the specific repo.
        // If `//` is present, I'll extract the module name from THAT subdir's yaml during inspection,
        // BUT I have to submodule add the ROOT repo.
        // This effectively installs the whole repo.
        // To strictly support "only the subdirectory", I would have to use the original "Clone & Move" strategy (no submodule).
        // Since the user explicitly asked for "git submodule add" in the update, I must prioritize that.
        // I will `submodule add` the ROOT repo. I will read module.yaml from the subdir to get the name.

        const [repoUrl, subPath] = url.split('.git//');
        const cleanUrl = subPath ? repoUrl + '.git' : url;

        if (this.visited.has(cleanUrl)) {
            logger.debug(`Already visited ${cleanUrl}, skipping.`);
            return;
        }
        this.visited.add(cleanUrl);

        this.info(`Inspecting ${cleanUrl}...`);

        // Stage 1: Inspect (Temp Clone)
        const stagingDir = path.resolve(this.projectRoot!, '.astrical', 'cache', `staging-${Date.now()}-${Math.random().toString(36).substring(7)}`);
        let moduleName = '';
        let dependencies: string[] = [];

        try {
            await fs.ensureDir(stagingDir);

            // Shallow clone to inspect
            await clone(cleanUrl, stagingDir, { depth: 1 });

            // Read module.yaml
            const searchPath = subPath ? path.join(stagingDir, subPath) : stagingDir;
            const moduleYamlPath = path.join(searchPath, 'module.yaml');
            const moduleYmlPath = path.join(searchPath, 'module.yml');

            let configPath = '';
            if (await fs.pathExists(moduleYamlPath)) configPath = moduleYamlPath;
            else if (await fs.pathExists(moduleYmlPath)) configPath = moduleYmlPath;
            else {
                throw new Error(`No module.yaml found in ${cleanUrl}${subPath ? '//' + subPath : ''}`);
            }

            const configContent = await fs.readFile(configPath, 'utf8');
            const config = YAML.parse(configContent);

            if (!config.name) {
                throw new Error(`Module at ${url} is missing 'name' in module.yaml`);
            }
            moduleName = config.name;
            dependencies = config.dependencies || [];

            // Normalize dependencies to array if object (though spec says list of strings, defensiveness is good)
            if (dependencies && !Array.isArray(dependencies)) {
                // If it's an object/map, keys might be URLs? Spec: "map of String keys (Git URLs...)"
                // "Input Schema: Expect... dependencies property to be a map of String keys... with the value being the Git reference"
                // Example: dependencies: ["https://..."]. Wait, spec says "map of String keys" then example is ARRAY `["..."]`.
                // I will handle both Array and Object keys.
                dependencies = Object.keys(dependencies);
            }

        } catch (e: any) { // Catching as 'any' for error message access
            throw e;
        } finally {
            // Cleanup staging always
            await fs.remove(stagingDir);
        }

        // Stage 2: Conflict Detection
        const targetDir = path.join(this.projectRoot!, 'src', 'modules', moduleName);
        const relativeTargetDir = path.relative(this.projectRoot!, targetDir);

        if (await fs.pathExists(targetDir)) {
            // Check origin
            const existingRemote = await getRemoteUrl(targetDir);
            // We compare cleanUrl (the repo root).
            // normalize both
            const normExisting = existingRemote.replace(/\.git$/, '');
            const normNew = cleanUrl.replace(/\.git$/, '');

            if (normExisting !== normNew && existingRemote !== '') {
                throw new Error(`Dependency Conflict! Module '${moduleName}' exists but remote '${existingRemote}' does not match '${cleanUrl}'.`);
            }

            this.info(`Module ${moduleName} already installed.`);
            // Proceed to recurse, but skip add
        } else {
            // Stage 3: Submodule Add
            this.info(`Installing ${moduleName} to ${relativeTargetDir}...`);
            // We install the ROOT repo.
            // IMPORTANT: If subPath exists, "Identity is Internal" means we name the folder `moduleName`.
            // But the CONTENT will be the whole repo.
            // If the user meant to only have the subdir, we can't do that with submodule add easily without manual git plumbing.
            // Given instructions, I will proceed with submodule add of root repo to target dir.
            await runCommand(`git submodule add ${cleanUrl} ${relativeTargetDir}`, this.projectRoot!);
        }

        // Stage 4: Recurse
        if (dependencies.length > 0) {
            this.info(`Resolving ${dependencies.length} dependencies for ${moduleName}...`);
            for (const depUrl of dependencies) {
                await this.installModule(depUrl);
            }
        }
    }
}
