
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { discoverCommandDirectories } from '../../../src/utils/discovery';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('node:fs');

// Mock path module to allow controlled resolution for duplicate testing
const originalPath = await import('node:path');
const originalResolve = originalPath.resolve;
const originalJoin = originalPath.join;

vi.mock('node:path', async (importOriginal) => {
    const mod = await importOriginal<any>();
    return {
        ...mod,
        default: {
            ...mod.default,
            resolve: vi.fn((...args: string[]) => mod.default.resolve(...args)),
        },
        resolve: vi.fn((...args: string[]) => mod.resolve(...args)),
    };
});

vi.mock('@nexical/cli-core', () => ({
    logger: {
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

describe('discoverCommandDirectories', () => {
    // ... setup ...
    const cliRoot = '/app/src/cli';
    const cwd = '/app';

    beforeEach(() => {
        vi.resetAllMocks();
        // Restore default path behavior
        vi.mocked(path.resolve).mockImplementation(originalResolve);
        // Default fs mocks
        vi.mocked(fs.existsSync).mockReturnValue(false);
        vi.mocked(fs.readdirSync).mockReturnValue([]);
        vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);
    });

    it('should return empty list if no directories exist', () => {
        const dirs = discoverCommandDirectories(cwd);
        expect(dirs).toHaveLength(0);
    });

    it('should find core commands in project directory', () => {
        vi.mocked(fs.existsSync).mockImplementation((p: any) => {
            return p === path.resolve('/app/src/core/src/commands');
        });

        const dirs = discoverCommandDirectories(cwd);
        expect(dirs).toContain(path.resolve('/app/src/core/src/commands'));
    });

    it('should scan modules for commands', () => {
        vi.mocked(fs.existsSync).mockImplementation((p: any) => {
            if (p === path.resolve('/app/src/modules')) return true;
            if (p === path.resolve('/app/src/modules/mod1')) return true;
            if (p === path.resolve('/app/src/modules/mod1/src/commands')) return true;
            if (p === path.resolve('/app/src/modules/mod2')) return true;
            return false;
        });

        vi.mocked(fs.readdirSync).mockReturnValue(['mod1', 'mod2', '.hidden'] as any);
        vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);

        const dirs = discoverCommandDirectories(cwd);

        expect(dirs).toContain(path.resolve('/app/src/modules/mod1/src/commands'));
        expect(dirs).not.toContain(path.resolve('/app/src/modules/mod2/src/commands'));
        expect(dirs).not.toContain(path.resolve('/app/src/modules/.hidden/commands'));
    });

    it('should handle errors when scanning modules', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockImplementation(() => {
            throw new Error('Permission denied');
        });

        const dirs = discoverCommandDirectories(cwd);
        // Should not crash
        // Since existsSync returns true, core commands ARE found.
        expect(dirs).toHaveLength(2);
        expect(dirs).toContain(path.resolve('/app/src/commands'));
        expect(dirs).toContain(path.resolve('/app/src/core/src/commands'));
    });

    it('should ignore duplicate paths', () => {
        // We force standard core commands and a module command to resolve to same path
        const corePath = originalResolve('/app/src/core/src/commands');
        // Define a module path that we will map to core path
        const moduleCmdPath = originalResolve('/app/src/modules/mod1/src/commands');

        // Mock resolve to redirect moduleCmdPath to corePath
        vi.mocked(path.resolve).mockImplementation((...args) => {
            const res = originalResolve(...args);
            if (res === moduleCmdPath) return corePath;
            return res;
        });

        vi.mocked(fs.existsSync).mockImplementation((p: any) => {
            if (p === corePath) return true;
            // The discovery logic checks resolve(modCommands).
            // It calls existsSync(resolved).
            // So if resolved is corePath, it checks existsSync(corePath).
            return false;
        });

        // Wait, discovery logic:
        // 1. Core loop:
        // path.join(projectRoot, 'src/core/commands') -> resolved via mock? No, path.join is used.
        // path.join NOT mocked (or mapped to original). 
        // path.resolve(dir) calls mock.

        // projectRoot = cwd = /app.
        // possibleCorePaths = [ '/app/src/core/commands' ] (from path.join)
        // addDir('/app/src/core/commands') called.
        // resolve('/app/src/core/commands') -> returns corePath.
        // existsSync(corePath) -> true.
        // directories.push(corePath). visited.add(corePath).

        // 2. Module loop:
        // modulesDir = path.join(projectRoot, 'src/modules') -> /app/src/modules.
        // readdirSync returns ['mod1'].
        // modPath = /app/src/modules/mod1.
        // modCommands = /app/src/modules/mod1/commands.
        // addDir(modCommands) called.
        // resolve(modCommands) -> returns MATCH (mocked to corePath).
        // visited.has(corePath) -> true.
        // RETURN.

        vi.mocked(fs.readdirSync).mockReturnValue(['mod1'] as any);
        // We need existsSync to verify modPath (directory check)
        vi.mocked(fs.existsSync).mockImplementation((p: any) => {
            if (p === corePath) return true;
            // Check module dir existence
            if (p === originalResolve('/app/src/modules')) return true;
            if (p === originalResolve('/app/src/modules/mod1')) return true;
            return false;
        });

        const dirs = discoverCommandDirectories(cwd);

        expect(dirs).toContain(corePath);
        expect(dirs).toHaveLength(1);
    });

    it('should ignore files in modules directory', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['mod1', 'file.txt'] as any);
        vi.mocked(fs.statSync).mockImplementation((p: any) => {
            if (typeof p === 'string' && p.endsWith('file.txt')) {
                return { isDirectory: () => false } as any;
            }
            return { isDirectory: () => true } as any;
        });

        const dirs = discoverCommandDirectories(cwd);
        // Should process mod1, ignore file.txt
        expect(dirs).toContain(path.resolve('/app/src/modules/mod1/src/commands'));
        expect(dirs).not.toContain(path.resolve('/app/src/modules/file.txt/src/commands'));
    });
});
