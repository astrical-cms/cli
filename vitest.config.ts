import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['test/unit/**/*.test.ts', 'core/test/unit/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['core/src/**/*.ts', 'commands/**/*.ts', 'utils/**/*.ts'],
            exclude: ['index.ts', 'commands/index.ts', 'core/src/CommandInterface.ts', '**/*.d.ts'], // Exclude entry points that are hard to test in unit tests
        },
    },
});
