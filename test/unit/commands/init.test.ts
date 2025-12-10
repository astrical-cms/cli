import { describe, it, expect, vi, beforeEach } from 'vitest';
import InitCommand from '../../../src/commands/init.js';
import { logger } from '../../../src/utils/logger.js';

vi.mock('../../../src/utils/logger.js');

describe('InitCommand', () => {
    let command: InitCommand;

    beforeEach(() => {
        vi.clearAllMocks();
        command = new InitCommand({});
    });

    it('should have correct metadata', () => {
        expect(InitCommand.description).toBeDefined();
        expect(InitCommand.args).toBeDefined();
        expect(InitCommand.requiresProject).toBe(false);
    });

    it('should initialize project', async () => {
        await command.run({ name: 'my-project' });
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Initializing project: my-project'));
        expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('successfully'));
    });

    it('should handle force flag', async () => {
        await command.run({ name: 'my-project', force: true });
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Force mode enabled'));
    });

    it('should detect existing project root', async () => {
        const cmd = new InitCommand({ rootDir: '/existing/root' });
        await cmd.init(); // Sets projectRoot

        await cmd.run({ name: 'sub-project' });
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Current Project Root detected'));
    });

    it('should log when no existing project root', async () => {
        // Default command has null projectRoot
        await command.run({ name: 'new-project' });
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('No existing Astrical project detected'));
    });
});
