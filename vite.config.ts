import { defineConfig } from 'vite';
import path from 'path';
import babel from 'vite-plugin-babel';

const cwd = process.cwd();

export default defineConfig({
    plugins: [
        babel()
    ],
    root: path.join(cwd, '.'),
    server: {
        host: '127.0.0.1',
        port: 3000,
    }
});