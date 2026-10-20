import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        coverage: {
            provider: 'v8',
            include: ['App.jsx', 'main.jsx', 'components/**/*.{js,jsx}', 'pages/**/*.{js,jsx}', 'services/**/*.{js,jsx}'],
            exclude: ['**/*.test.{js,jsx}'],
            reporter: ['text', 'html', 'lcov'],
            thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 }
        }
    }
});
