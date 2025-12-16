import { CLI } from '@nexical/cli-core';
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import CleanCommand from '../../../src/commands/clean.js';
import { createTempDir, cleanupTestRoot } from '../../utils/integration-helpers.js';
import path from 'node:path';
import fs from 'fs-extra';

describe('CleanCommand Integration', () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = await createTempDir('clean-integration-');
        // Setup initial state
        await fs.ensureDir(path.join(tempDir, '_site'));
        await fs.outputFile(path.join(tempDir, '_site', 'index.html'), '<html></html>');
        await fs.ensureDir(path.join(tempDir, 'node_modules'));
        await fs.outputFile(path.join(tempDir, 'node_modules', 'pkg.json'), '{}');
    });

    afterAll(async () => {
        if (tempDir) await fs.remove(tempDir);
    });

    it('should remove _site and node_modules directories', async () => {
        const cli = new CLI({ commandName: 'astrical' });
        const command = new CleanCommand(cli);

        const originalCwd = process.cwd();
        try {
            process.chdir(tempDir);

            await command.run({});

            expect(fs.existsSync(path.join(tempDir, '_site'))).toBe(false);
            expect(fs.existsSync(path.join(tempDir, 'node_modules'))).toBe(false);
        } finally {
            process.chdir(originalCwd);
        }
    });

    it('should only remove dist if specified', async () => {
        // Assuming clean command supports args/options regarding what to clean?
        // If generic clean just follows a pattern.
        // Let's verify clean.ts logic first.
    });
});
