import { cac } from 'cac';
import { CommandLoader } from './CommandLoader.js';
import { BaseCommand } from './BaseCommand.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class CLI {
    private cli = cac('astrical');
    private loader = new CommandLoader();

    async start() {
        // In built version, we are in dist/index.js or similar
        // Commands should be in dist/commands if we build them there
        // If we are running in dev (ts-node), we are in src/index.ts

        // Strategy: Try both relative locations (sibling 'commands' folder)
        // because tsup might put index.js at root of dist, and commands in dist/commands

        const possibleDirs = [
            path.resolve(__dirname, 'commands'), // dist/commands or src/commands if unbundled
            path.resolve(__dirname, '../commands'), // common when file is nested in core/
            path.resolve(__dirname, '../src/commands') // dev fallback potentially
        ];

        let commandsDir = '';
        for (const dir of possibleDirs) {
            if (fs.existsSync(dir)) {
                commandsDir = dir;
                break;
            }
        }

        // Fallback or error
        if (!commandsDir) {
            // logger.debug("No commands directory found.");
        }

        const commands = await this.loader.load(commandsDir);

        for (const cmd of commands) {
            const CommandClass = cmd.class;

            // Construct the syntax string for CAC
            // e.g. "create <name> [options]"
            let commandName = cmd.command;

            // Append args definition from static args
            // This is a simplified transformation.
            // BaseCommand.args = { args: [{name: 'name', required: true}] }
            const argsDef = CommandClass.args || {};
            if (argsDef.args) {
                argsDef.args.forEach((arg: any) => {
                    if (arg.required) {
                        commandName += ` <${arg.name}>`;
                    } else {
                        commandName += ` [${arg.name}]`;
                    }
                });
            }

            const cacCommand = this.cli.command(commandName, CommandClass.description || '');

            // Register options
            if (argsDef.options) {
                argsDef.options.forEach((opt: any) => {
                    // e.g. '--dry-run'
                    cacCommand.option(opt.name, opt.description, { default: opt.default });
                });
            }

            // Register default global options to every command
            cacCommand.option('--root-dir <path>', 'Override project root');
            cacCommand.option('--debug', 'Enable debug mode');

            cacCommand.action(async (...args: any[]) => {
                // Last arg is always the options object in CAC
                const options = args.pop();

                // Map positional args to names
                const positionalArgs = args;
                if (argsDef.args) {
                    argsDef.args.forEach((arg: any, index: number) => {
                        if (index < positionalArgs.length) {
                            options[arg.name] = positionalArgs[index];
                        }
                    });
                }

                try {
                    const instance = new CommandClass(options);
                    await instance.init();
                    await instance.run(options);
                } catch (e: any) {
                    console.error(pc.red(e.message));
                    if (options.debug) {
                        console.error(e.stack);
                    }
                    process.exit(1);
                }
            });
        }

        this.cli.help();
        this.cli.version('0.1.0');

        try {
            this.cli.parse();
        } catch (e: any) {
            console.error(pc.red(e.message));
            process.exit(1);
        }
    }
}
