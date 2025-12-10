import { BaseCommand } from '../core/BaseCommand.js';
import { CommandDefinition } from '../core/CommandInterface.js';

export default class InitCommand extends BaseCommand {
    static description = 'Initialize a new Astrical project';
    static args: CommandDefinition = {
        args: [
            { name: 'name', required: true, description: 'Project name' }
        ],
        options: [
            { name: '--force', description: 'Overwrite existing files', default: false }
        ]
    };

    static requiresProject = false;

    async run(options: any) {
        this.info(`Initializing project: ${options.name}`);

        if (options.force) {
            this.warn('Force mode enabled. Overwriting existing files...');
        }

        if (this.projectRoot) {
            this.info(`Current Project Root detected at: ${this.projectRoot}`);
        } else {
            this.info('No existing Astrical project detected in parent directories.');
        }

        // Mock logic
        this.success(`Project ${options.name} initialized successfully!`);
    }
}
