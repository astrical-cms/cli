import { describe, it, expect, vi } from 'vitest';
import { CLI } from '../../src/core/CLI.js';

// Mock CLI class before import
vi.mock('../../src/core/CLI.js', () => {
    return {
        CLI: vi.fn().mockImplementation(function () {
            return {
                start: vi.fn()
            };
        })
    };
});

describe('Index Entry Point', () => {
    it('should instantiate and start CLI', async () => {
        // Dynamic import to trigger execution
        await import('../../src/index.js');

        expect(CLI).toHaveBeenCalled();
        const instance = (CLI as any).mock.instances[0];
        expect(instance.start).toHaveBeenCalled();
    });
});
