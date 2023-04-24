import { defineConfig } from 'vite';
import path from 'path';

const cwd = process.cwd();

export default defineConfig({
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
            fileName: 'index',
        }
    }
});