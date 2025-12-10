import { BaseCommand } from '../core/BaseCommand.js';
import pc from 'picocolors';

export default class HelpCommand extends BaseCommand {
    static description = 'Display help for commands';

    static args = {
        args: [
            { name: 'command...', required: false, description: 'Command name to get help for' }
        ],
        options: []
    };

    async run(options: any) {
        const commandParts = options.command || [];
        const query = commandParts.join(' ');

        if (!query) {
            // General help
            // this.cli.getRawCLI().outputHelp(); // Prints help for 'help' command
            this.printGlobalHelp();
            return;
        }

        // Search for specific command or namespace
        const commands = this.cli.getCommands();

        // Exact match?
        const exactMatch = commands.find((c: any) => c.command === query);
        if (exactMatch) {
            // CAC's outputHelp() prints everything unfortunatley if no subcommand context is active?
            // Actually CAC handles 'help <subcommand>' automatically if registered? 
            // BUT we are implementing our own 'help' command. 
            // So 'astrical help init' -> we want to show help for init.

            // To show help for a specific command using CAC, we need to find that command instance in CAC.
            const cacCmd = this.cli.getRawCLI().commands.find((c: any) => c.name === query);
            if (cacCmd) {
                this.printCommandHelp(cacCmd, exactMatch);
            }
            return;
        }

        // Namespace match? (e.g. "module" matches "module add", "module remove")
        const namespaceMatches = commands.filter((c: any) => c.command.startsWith(query + ' '));

        if (namespaceMatches.length > 0) {
            console.log(`\n  Commands for ${pc.bold(query)}:\n`);
            for (const cmd of namespaceMatches) {
                const name = cmd.command;
                const desc = cmd.class.description || '';
                console.log(`  ${pc.cyan(name.padEnd(20))} ${desc}`);
            }
            console.log('');
            return;
        }

        this.error(`Unknown command: ${query}`);
    }

    private printGlobalHelp() {
        const commands = this.cli.getCommands();
        const bin = 'astrical'; // Or retrieve from cli name

        console.log('');
        console.log(`  Usage: ${pc.cyan(bin)} <command> [options]`);
        console.log('');
        console.log('  Commands:');
        console.log('');

        // Filter out commands that are "sub-parts" (e.g. module add) if we want cleaner root help?
        // Or just list all? CAC lists all flattened.
        // Let's list top-level or flattened?
        // Standard behavior: List all.

        for (const cmd of commands) {
            const name = cmd.command;
            const desc = cmd.class.description || '';
            console.log(`    ${pc.cyan(name.padEnd(25))} ${desc}`);
        }

        console.log('');
        console.log('  Options:');
        console.log('');
        console.log(`    ${pc.yellow('--help'.padEnd(25))} Display this message`);
        console.log(`    ${pc.yellow('--version'.padEnd(25))} Display version number`);
        console.log(`    ${pc.yellow('--root-dir <path>'.padEnd(25))} Override project root`);
        console.log(`    ${pc.yellow('--debug'.padEnd(25))} Enable debug mode`);
        console.log('');
    }

    private printCommandHelp(cacCmd: any, loadedCommand?: any) {
        // Re-construct help output similar to CAC
        console.log('');
        console.log(`  Usage: ${pc.cyan(cacCmd.rawName)}`);
        console.log('');
        console.log(`  ${cacCmd.description}`);
        console.log('');

        // Print Arguments help if available in loaded command metadata
        const argsDef = loadedCommand?.class?.args?.args;
        if (argsDef && Array.isArray(argsDef) && argsDef.length > 0) {
            console.log('  Arguments:');
            for (const arg of argsDef) {
                const name = arg.name;
                const desc = arg.description || '';
                const required = arg.required ? ' (required)' : '';
                console.log(`    ${pc.cyan(name.padEnd(25))} ${desc}${pc.dim(required)}`);
            }
            console.log('');
        }

        if (cacCmd.options.length > 0) {
            console.log('  Options:');
            for (const opt of cacCmd.options) {
                // Use rawName to show flags (e.g. --force) instead of variable name (force)
                const flags = opt.rawName.padEnd(25);
                const desc = opt.description || '';
                const def = opt.config.default ? ` (default: ${opt.config.default})` : '';
                console.log(`    ${pc.yellow(flags)} ${desc}${pc.dim(def)}`);
            }
            console.log('');
        }
    }
}
