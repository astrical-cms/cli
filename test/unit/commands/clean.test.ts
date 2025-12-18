import { logger } from '@nexical/cli-core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CleanCommand from '../../../src/commands/clean.js';
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
    };
});
vi.mock('fs-extra');

describe('CleanCommand', () => {
    let command: CleanCommand;

    beforeEach(() => {
        vi.clearAllMocks();
        command = new CleanCommand({});
        (command as any).projectRoot = '/mock/root';
        vi.mocked(fs.pathExists).mockImplementation(async () => false);
        vi.mocked(fs.remove).mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('should have correct metadata', () => {
        expect(CleanCommand.usage).toBeDefined();
        expect(CleanCommand.requiresProject).toBe(true);
    });

    it('should error if project root is missing', async () => {
        (command as any).projectRoot = null;
        vi.spyOn(command, 'init').mockImplementation(async () => { }); // No projectRoot
        vi.spyOn(command, 'error').mockImplementation(() => { });

        await command.runInit({});
        expect(command.error).toHaveBeenCalledWith(expect.stringContaining('requires to be run within an app project'), 1);
    });

    it('should remove targets if they exist', async () => {
        // Mock targets existing
        vi.mocked(fs.pathExists).mockImplementation(async (p: string) => {
            return p.includes('site') || p.includes('dist');
        });

        await command.run({});

        expect(fs.remove).toHaveBeenCalledWith(expect.stringContaining('site'));
        expect(fs.remove).toHaveBeenCalledWith(expect.stringContaining('dist'));
        // node_modules/.vite shouldn't be removed if not returning true for pathExists
        // But our mock logic returns true for site and dist only? 
        // Let's refine mock to be cleaner
    });

    it('should log success', async () => {
        const spy = vi.spyOn(command, 'success').mockImplementation(() => { });
        await command.run({});
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('cleaned'));
    });
});
