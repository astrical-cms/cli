import { runCommand } from '@nexical/cli-core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as git from '../../../src/utils/git.js';

vi.mock('@nexical/cli-core', async (importOriginal) => {
    const mod = await importOriginal<typeof import('@nexical/cli-core')>();
    return {
        ...mod,
        runCommand: vi.fn(),
        logger: { code: vi.fn(), debug: vi.fn() }
    }
});

describe('git utils', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('should clone repository', async () => {
        await git.clone('http://repo.git', 'dest', true);
        expect(runCommand).toHaveBeenCalledWith(
            'git clone --recursive http://repo.git .',
            'dest'
        );

        await git.clone('http://repo.git', 'dest', false);
        expect(runCommand).toHaveBeenCalledWith(
            'git clone http://repo.git .',
            'dest'
        );
    });

    it('should update submodules', async () => {
        await git.updateSubmodules('cwd');
        expect(runCommand).toHaveBeenCalledWith(
            expect.stringContaining('git submodule foreach'),
            'cwd'
        );
    });

    it('should checkout orphan branch', async () => {
        await git.checkoutOrphan('branch', 'cwd');
        expect(runCommand).toHaveBeenCalledWith('git checkout --orphan branch', 'cwd');
    });

    it('should add all files', async () => {
        await git.addAll('cwd');
        expect(runCommand).toHaveBeenCalledWith('git add -A', 'cwd');
    });

    it('should commit', async () => {
        await git.commit('msg', 'cwd');
        expect(runCommand).toHaveBeenCalledWith('git commit -m "msg"', 'cwd');
    });

    it('should delete branch', async () => {
        await git.deleteBranch('branch', 'cwd');
        expect(runCommand).toHaveBeenCalledWith('git branch -D branch', 'cwd');
    });

    it('should rename branch', async () => {
        await git.renameBranch('branch', 'cwd');
        expect(runCommand).toHaveBeenCalledWith('git branch -m branch', 'cwd');
    });

    it('should remove remote', async () => {
        await git.removeRemote('origin', 'cwd');
        expect(runCommand).toHaveBeenCalledWith('git remote remove origin', 'cwd');
    });

    it('should check if branch exists', async () => {
        vi.mocked(runCommand).mockResolvedValueOnce('hash refs/heads/branch');
        expect(await git.branchExists('branch', 'cwd')).toBe(true);

        vi.mocked(runCommand).mockRejectedValueOnce(new Error('fail'));
        expect(await git.branchExists('branch', 'cwd')).toBe(false);
    });
});
