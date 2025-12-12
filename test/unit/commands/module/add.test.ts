import { logger, runCommand } from '@nexical/cli-core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ModuleAddCommand from '../../../../src/commands/module/add.js';
import fs from 'fs-extra';

vi.mock('@nexical/cli-core', async (importOriginal) => {
    const mod = await importOriginal<typeof import('@nexical/cli-core')>();
    return {
        ...mod,
        logger: {
            ...mod.logger,
            success: vi.fn(),
            info: vi.fn(),
            debug: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        },
        runCommand: vi.fn(),
    };
});
vi.mock('fs-extra');

describe('ModuleAddCommand', () => {
    let command: ModuleAddCommand;

    beforeEach(async () => {
        vi.clearAllMocks();
        command = new ModuleAddCommand({}, { rootDir: '/mock/root' });
        vi.spyOn(command, 'error').mockImplementation((() => { }) as any);
        vi.spyOn(command, 'success').mockImplementation((() => { }) as any);
        vi.spyOn(command, 'info').mockImplementation((() => { }) as any);
        vi.mocked(fs.pathExists).mockImplementation(async (p: string) => {
            if (p.includes('app.yml') || p.includes('astrical.yml')) return true;
            return false;
        });
        vi.spyOn(process, 'exit').mockImplementation((() => { }) as any);
        await command.init();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('should have correct static properties', () => {
        expect(ModuleAddCommand.paths).toEqual([['module', 'add']]);
        expect(ModuleAddCommand.usage).toContain('module add');
        expect(ModuleAddCommand.description).toBeDefined();
        expect(ModuleAddCommand.requiresProject).toBe(true);
        expect(ModuleAddCommand.args).toBeDefined();
    });

    it('should error if project root is missing', async () => {
        command = new ModuleAddCommand({}, { rootDir: undefined });
        vi.spyOn(command, 'error').mockImplementation(() => { });
        await command.run({ url: 'arg' });
        expect(command.error).toHaveBeenCalledWith('Project root not found.');
    });

    it('should error if url is missing', async () => {
        await command.run({ url: undefined });
        expect(command.error).toHaveBeenCalledWith('Please specify a repository URL.');
    });

    it('should add submodule and install dependencies', async () => {
        await command.run({ url: 'https://git.com/repo.git', name: 'repo' });

        expect(runCommand).toHaveBeenCalledWith(
            expect.stringContaining('git submodule add https://git.com/repo.git src/modules/repo'),
            '/mock/root'
        );
        expect(runCommand).toHaveBeenCalledWith('npm install', '/mock/root');
        expect(command.success).toHaveBeenCalledWith(expect.stringContaining('added successfully'));
    });

    it('should expand gh@ syntax', async () => {
        await command.run({ url: 'gh@org/repo', name: 'repo' });
        expect(runCommand).toHaveBeenCalledWith(
            expect.stringContaining('https://github.com/org/repo.git'),
            '/mock/root'
        );
    });

    it('should handled gh@ syntax with existing .git', async () => {
        await command.run({ url: 'gh@org/repo.git', name: 'repo' });
        expect(runCommand).toHaveBeenCalledWith(
            expect.stringContaining('https://github.com/org/repo.git'),
            '/mock/root'
        );
    });

    it('should handle url ending with .git', async () => {
        await command.run({ url: 'https://github.com/org/repo.git', name: 'repo' });
        expect(runCommand).toHaveBeenCalledWith(
            expect.stringContaining('https://github.com/org/repo.git'),
            '/mock/root'
        );
    });

    it('should infer name from url if not provided', async () => {
        await command.run({ url: 'https://github.com/org/inferred.git' });
        expect(runCommand).toHaveBeenCalledWith(
            expect.stringContaining('src/modules/inferred'),
            '/mock/root'
        );
    });

    it('should handle runCommand failure', async () => {
        vi.mocked(runCommand).mockRejectedValue(new Error('Git error'));
        await command.run({ url: 'http://repo.git', name: 'repo' });
        expect(command.error).toHaveBeenCalledWith(expect.stringContaining('Failed to add module'));
    });

    it('should error if module already exists', async () => {
        vi.mocked(fs.pathExists).mockImplementation(async () => true);
        await command.run({ url: 'url', name: 'existing' });
        expect(command.error).toHaveBeenCalledWith(expect.stringContaining('already exists'));
        expect(runCommand).not.toHaveBeenCalled();
    });
});
