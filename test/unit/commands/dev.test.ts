import { logger } from '@nexical/cli-core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DevCommand from '../../../src/commands/dev.js';
import cp from 'child_process';
import EventEmitter from 'events';
import { linkEnvironment } from '../../../src/utils/environment.js';

vi.mock('@nexical/cli-core', async (importOriginal) => {
    const mod = await importOriginal<typeof import('@nexical/cli-core')>();
    return {
        ...mod,
        logger: { code: vi.fn(), debug: vi.fn(), error: vi.fn(), success: vi.fn(), info: vi.fn(), warn: vi.fn() }
    }
});
vi.mock('child_process');
// Mock the dynamic import of environment
vi.mock('../../../src/utils/environment.js', () => ({
    prepareEnvironment: vi.fn().mockResolvedValue(undefined),
    linkEnvironment: vi.fn().mockResolvedValue(undefined)
}));

describe('DevCommand', () => {
    let command: DevCommand;
    let mockChild: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        command = new DevCommand({}, { rootDir: '/mock/root' });

        vi.spyOn(command, 'error').mockImplementation((() => { }) as any);
        vi.spyOn(command, 'info').mockImplementation((() => { }) as any);
        vi.spyOn(command, 'warn').mockImplementation((() => { }) as any);
        vi.spyOn(command, 'success').mockImplementation((() => { }) as any);

        // Mock spawn to return an event emitter
        mockChild = new EventEmitter();
        mockChild.kill = vi.fn();
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();
        vi.mocked(cp.spawn).mockReturnValue(mockChild as any);

        // Mock process exit to avoid actual exit
        vi.spyOn(process, 'exit').mockImplementation((() => { }) as any);

        await command.init();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('should have correct static properties', () => {
        expect(DevCommand.paths).toEqual([['dev']]);
        expect(DevCommand.usage).toBe('dev');
        expect(DevCommand.description).toBe('Starts the Astro development server with HMR.');
        expect(DevCommand.requiresProject).toBe(true);
    });

    it('should error if project root is missing', async () => {
        command = new DevCommand({}, { rootDir: undefined });
        vi.spyOn(command, 'error').mockImplementation((() => { }) as any);
        await command.run({});
        expect(command.error).toHaveBeenCalledWith('Project root not found.');
    });

    it('should initialize environment and spawn astro dev', async () => {
        // Trigger close to resolve the promise
        setTimeout(() => {
            mockChild.emit('close', 0);
        }, 100);

        await command.run({});

        expect(linkEnvironment).toHaveBeenCalledWith('/mock/root');

        expect(cp.spawn).toHaveBeenCalledWith(
            expect.stringContaining('astro'),
            ['dev'],
            expect.objectContaining({
                cwd: expect.stringContaining('_site'),
                stdio: 'inherit'
            })
        );
    });

    it('should handle errors during initialization', async () => {
        vi.mocked(linkEnvironment).mockRejectedValueOnce(new Error('Init failed'));

        // Since it returns on error in the implementation:
        await command.run({});

        expect(command.error).toHaveBeenCalledWith(expect.any(Error));
        // Should NOT spawn
        expect(cp.spawn).not.toHaveBeenCalled();
    });

    it('should handle spawn error', async () => {
        const runPromise = command.run({});
        await new Promise(resolve => setTimeout(resolve, 0));

        mockChild.emit('error', new Error('Spawn failed'));
        mockChild.emit('close', 1);

        await runPromise;
        expect(command.error).toHaveBeenCalledWith(expect.stringContaining('Failed to start Astro'));
    });

    it('should handle cleanup signals', async () => {
        const listeners: Record<string, Function> = {};
        vi.spyOn(process, 'on').mockImplementation((event: string | symbol, listener: any) => {
            listeners[event.toString()] = listener;
            return process;
        });

        setTimeout(() => {
            if (listeners['SIGINT']) listeners['SIGINT']();
            mockChild.emit('close', 0);
        }, 50);

        await command.run({});
        expect(mockChild.kill).toHaveBeenCalled();
        expect(process.exit).toHaveBeenCalled();
    });
});
