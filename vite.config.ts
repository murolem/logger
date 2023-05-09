import { defineConfig } from 'vite';
import path from 'path';
import dts from 'vite-plugin-dts'
import { tsconfigPathsToViteAliases } from './tests/tsconfigPathsToViteAliases';

const cwd = process.cwd();

const resolvedAliases = tsconfigPathsToViteAliases();
// console.log(resolvedAliases);

export default defineConfig({
    plugins: [
        dts({
            entryRoot: path.join(cwd, 'src')
        })
    ],
    root: path.join(cwd, '.'),
    resolve: {
        alias: resolvedAliases
    },
    build: {
        minify: false,
        lib: {
            entry: 'src/index.ts',
            formats: ['es'],
            fileName: 'index'
        }
    },
    server: {
        host: '127.0.0.1',
        port: 3000,
    }
});