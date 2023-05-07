import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path';

const cwd = process.cwd();

export default defineConfig({
    plugins: [
        tsconfigPaths()
    ],
    root: path.join(cwd, '.'),
    server: {
        host: '127.0.0.1',
        port: 3000,
    },
    build: {
        minify: false,
        lib: {
            entry: 'src/index.ts',
            formats: ['es'],
            fileName: 'index'
        }
    }
});