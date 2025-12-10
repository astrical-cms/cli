import { describe, it, expect } from 'vitest';
import { logger } from '../../../src/utils/logger.js';

describe('Logger', () => {
    it('should be defined', () => {
        expect(logger).toBeDefined();
    });

    it('should have standard methods', () => {
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.success).toBe('function');
        expect(typeof logger.warn).toBe('function');
        expect(typeof logger.error).toBe('function');
    });
});
