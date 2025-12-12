import { logger, runCommand } from '@nexical/cli-core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BuildCommand from '../../../src/commands/build.js';
import fs from 'fs-extra';

vi.mock('fs-extra');

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

        vi.mocked(fs.pathExists).mockResolvedValue(true as any);
        vi.spyOn(process, 'exit').mockImplementation((() => { }) as any);
        // Mock runCommand to resolve by default
        vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 } as any);

        // Spy on command methods
        vi.spyOn(command, 'error').mockImplementation(() => { });
        vi.spyOn(command, 'success').mockImplementation(() => { });

        await command.init();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('should have correct static properties', () => {
        expect(BuildCommand.paths).toEqual([['build']]);
        expect(BuildCommand.usage).toBe('build');
        expect(BuildCommand.description).toBe('Builds the production site.');
        expect(BuildCommand.requiresProject).toBe(true);
    });

    it('should error if project root is missing', async () => {
        command = new BuildCommand({ rootDir: undefined });
        vi.spyOn(command, 'init').mockImplementation(async () => { }); // No projectRoot set
        vi.spyOn(command, 'error').mockImplementation(() => { });

        await command.run({});
        expect(command.error).toHaveBeenCalledWith('Project root not found.');
    });

    it('should error if core directory is missing', async () => {
        vi.mocked(fs.pathExists).mockImplementation(async (p: string) => {
            return !p.includes('src/core');
        });
        await command.run({});
        expect(command.error).toHaveBeenCalledWith(expect.stringContaining('Core directory not found'));
    });

    it('should clean, copy files, and execute astro build', async () => {
        await command.run({});

        expect(fs.remove).toHaveBeenCalledWith(expect.stringContaining('_site'));
        expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('_site'));
        expect(fs.copy).toHaveBeenCalledTimes(4); // Core, Modules, Content, Public

        expect(runCommand).toHaveBeenCalledWith(
            expect.stringContaining('/mock/root/node_modules/.bin/astro build'),
            expect.stringContaining('_site')
        );

        // Verify filter function logic if possible, or skip strictly verifying filter instance identity
        const copyCalls = vi.mocked(fs.copy).mock.calls;
        const coreCopyCall = copyCalls.find(call => call[0].toString().includes('core'));
        expect(coreCopyCall).toBeDefined();
        if (coreCopyCall && coreCopyCall[2]) {
            const filterFn = (coreCopyCall[2] as any).filter;
            expect(filterFn('some/path')).toBe(true);
            expect(filterFn('some/node_modules/path')).toBe(false);
        }

        expect(command.success).toHaveBeenCalledWith(expect.stringContaining('Build completed'));
    });

    it('should handle build failure', async () => {
        vi.mocked(runCommand).mockRejectedValue(new Error('Command failed'));

        await command.run({});

        expect(command.error).toHaveBeenCalledWith(expect.stringContaining('Build failed'), 1);
    });

    it('should skip copying if path does not exist', async () => {
        vi.mocked(fs.pathExists).mockImplementation(async (p: string) => {
            // Simulate core exists, others don't
            if (p.includes('core')) return true;
            return false;
        });

        await command.run({});

        expect(fs.copy).toHaveBeenCalledTimes(1); // Only core
    });
});
