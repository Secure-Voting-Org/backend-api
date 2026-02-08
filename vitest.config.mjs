import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        name: 'backend-api',
        environment: 'node', // Faster and correct for Node.js logic
        globals: true,
    }
})