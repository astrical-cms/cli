import { describe, it, expect, vi } from 'vitest';
import { CLI } from '../../core/src/CLI.js';

// Mock CLI class before import
vi.mock('../../core/src/CLI.js', () => {
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
        await import('../../index.js');

        expect(CLI).toHaveBeenCalled();
        const instance = (CLI as any).mock.instances[0];
        expect(instance.start).toHaveBeenCalled();
    });
});
