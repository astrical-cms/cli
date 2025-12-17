import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { linkEnvironment, copyEnvironment } from '../../../src/utils/environment.js';
import fs from 'fs-extra';
import path from 'path';

vi.mock('fs-extra');
vi.mock('@nexical/cli-core', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        success: vi.fn(),
    }
}));

describe('Environment Utils', () => {
    const projectRoot = '/mock/project';

    beforeEach(() => {
        vi.clearAllMocks();

        // Default fs mocks
        vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
        vi.mocked(fs.remove).mockResolvedValue(undefined);
        vi.mocked(fs.ensureSymlink).mockResolvedValue(undefined);
        vi.mocked(fs.copy).mockResolvedValue(undefined);
        vi.mocked(fs.pathExists).mockResolvedValue(false as any);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('linkEnvironment', () => {
        it('should throw if core directory is missing', async () => {
            vi.mocked(fs.pathExists).mockResolvedValue(false as any);
            await expect(linkEnvironment(projectRoot)).rejects.toThrow('Core directory not found');
        });

        it('should link core to site', async () => {
            vi.mocked(fs.pathExists).mockImplementation(async (p) => {
                if (p.includes('src/core')) return true;
                return false;
            });

            await linkEnvironment(projectRoot);

            expect(fs.remove).toHaveBeenCalledWith(path.resolve(projectRoot, 'site'));
            expect(fs.ensureSymlink).toHaveBeenCalledWith(
                path.resolve(projectRoot, 'src/core'),
                path.resolve(projectRoot, 'site'),
                'junction'
            );
        });

        it('should link modules, content, and public if they exist', async () => {
            vi.mocked(fs.pathExists).mockResolvedValue(true as any);

            await linkEnvironment(projectRoot);

            // site/modules
            expect(fs.remove).toHaveBeenCalledWith(path.resolve(projectRoot, 'site/modules'));
            expect(fs.ensureSymlink).toHaveBeenCalledWith(
                path.resolve(projectRoot, 'src/modules'),
                path.resolve(projectRoot, 'site/modules'),
                'junction'
            );

            // site/content
            expect(fs.remove).toHaveBeenCalledWith(path.resolve(projectRoot, 'site/content'));
            expect(fs.ensureSymlink).toHaveBeenCalledWith(
                path.resolve(projectRoot, 'content'),
                path.resolve(projectRoot, 'site/content'),
                'junction'
            );

            // site/public
            expect(fs.remove).toHaveBeenCalledWith(path.resolve(projectRoot, 'site/public'));
            expect(fs.ensureSymlink).toHaveBeenCalledWith(
                path.resolve(projectRoot, 'public'),
                path.resolve(projectRoot, 'site/public'),
                'junction'
            );
        });
    });

    describe('copyEnvironment', () => {
        it('should copy core to site', async () => {
            vi.mocked(fs.pathExists).mockImplementation(async (p) => {
                if (p.includes('src/core')) return true;
                return false;
            });

            await copyEnvironment(projectRoot);

            expect(fs.remove).toHaveBeenCalledWith(path.resolve(projectRoot, 'site'));
            expect(fs.ensureDir).toHaveBeenCalledWith(path.resolve(projectRoot, 'site'));
            expect(fs.copy).toHaveBeenCalledWith(
                path.resolve(projectRoot, 'src/core'),
                path.resolve(projectRoot, 'site'),
                expect.objectContaining({ filter: expect.any(Function) })
            );
        });

        it('should copy modules, content, and public if they exist', async () => {
            vi.mocked(fs.pathExists).mockResolvedValue(true as any);

            await copyEnvironment(projectRoot);

            expect(fs.copy).toHaveBeenCalledWith(
                path.resolve(projectRoot, 'src/modules'),
                path.resolve(projectRoot, 'site/modules')
            );
            expect(fs.copy).toHaveBeenCalledWith(
                path.resolve(projectRoot, 'content'),
                path.resolve(projectRoot, 'site/content')
            );
            expect(fs.copy).toHaveBeenCalledWith(
                path.resolve(projectRoot, 'public'),
                path.resolve(projectRoot, 'site/public')
            );
        });

        it('should filter node_modules when copying core', async () => {
            vi.mocked(fs.pathExists).mockImplementation(async (p) => p.includes('src/core'));
            await copyEnvironment(projectRoot);

            const copyCall = vi.mocked(fs.copy).mock.calls.find(call => call[0].toString().includes('src/core'));
            const filterFn = (copyCall![2] as any).filter;

            expect(filterFn('some/path/node_modules/foo')).toBe(false);
            expect(filterFn('some/path/src/foo')).toBe(true);
        });

        it('should handle missing core directory gracefully', async () => {
            vi.mocked(fs.pathExists).mockImplementation(async (p) => {
                if (p.includes('src/core')) return false;
                return true;
            });
            await copyEnvironment(projectRoot);

            expect(fs.copy).not.toHaveBeenCalledWith(
                path.resolve(projectRoot, 'src/core'),
                expect.anything(),
                expect.anything()
            );
        });
    });
});
