import { logger, runCommand } from '@nexical/cli-core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BuildCommand from '../../../src/commands/build.js';
import { copyEnvironment } from '../../../src/utils/environment.js';

vi.mock('fs-extra');
vi.mock('../../../src/utils/environment.js');

vi.mock('@nexical/cli-core', async (importOriginal) => {
    const mod = await importOriginal<typeof import('@nexical/cli-core')>();
    return {
        ...mod,
        logger: {
            debug: vi.fn(),
            info: vi.fn(),
            success: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        },
        runCommand: vi.fn(),
    };
});

describe('BuildCommand', () => {
    let command: BuildCommand;

    beforeEach(async () => {
        vi.clearAllMocks();
        command = new BuildCommand({ rootDir: '/mock/root' });

        // Spy on init to bypass BaseCommand logic and set projectRoot
        vi.spyOn(command, 'init').mockImplementation(async () => {
            (command as any).projectRoot = '/mock/root';
        });

        // Mock runCommand to resolve by default
        vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 } as any);
        // Mock copyEnvironment to resolve by default
        vi.mocked(copyEnvironment).mockResolvedValue(undefined);

        // Spy on command methods
        vi.spyOn(command, 'error').mockImplementation(() => { });
        vi.spyOn(command, 'success').mockImplementation(() => { });

        await command.init();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('should have correct static properties', () => {
        expect(BuildCommand.usage).toBe('build');
        expect(BuildCommand.description).toBeDefined();
        expect(BuildCommand.requiresProject).toBe(true);
    });

    it('should error if project root is missing', async () => {
        command = new BuildCommand({ rootDir: undefined });
        vi.spyOn(command, 'init').mockImplementation(async () => { }); // No projectRoot set
        vi.spyOn(command, 'error').mockImplementation(() => { });

        await command.run({});
        expect(command.error).toHaveBeenCalledWith('Project root not found.');
    });

    it('should error if copyEnvironment fails', async () => {
        vi.mocked(copyEnvironment).mockRejectedValue(new Error('Copy failed'));
        await command.run({});
        expect(command.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Copy failed' }));
    });

    it('should prepare environment and execute astro build', async () => {
        await command.run({});

        expect(copyEnvironment).toHaveBeenCalledWith('/mock/root');

        expect(runCommand).toHaveBeenCalledWith(
            'npm run build',
            expect.stringContaining('_site')
        );

        expect(command.success).toHaveBeenCalledWith(expect.stringContaining('Build completed'));
    });

    it('should handle build failure', async () => {
        vi.mocked(runCommand).mockRejectedValue(new Error('Command failed'));

        await command.run({});

        expect(command.error).toHaveBeenCalledWith(expect.stringContaining('Build failed'), 1);
    });
});
