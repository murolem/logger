import { getTsconfig  } from 'get-tsconfig';
import { Alias } from 'vite';
import path from 'path';

export function tsconfigPathsToViteAliases(pathToTsConfig = './tsconfig.json'): Alias[] {
    const cwd = process.cwd();

    const tsconfigQueryResult = getTsconfig(pathToTsConfig);
    if(tsconfigQueryResult === null)
        throw new Error('tsconfig not found');

    const tsconfig = tsconfigQueryResult.config;
    const paths = tsconfig?.compilerOptions?.paths ?? {};

    const result: Alias[] = [];
    for(const [aliasRaw, entries] of Object.entries(paths)) {
        if(entries.length === 0)
            continue;
        else if(entries.length > 1)
            console.warn(`multiple alias paths on tsconfig alias ${aliasRaw} are not supported — only first alias path will be used.`);

        let alias: string = aliasRaw;
        // remove trailing /*
        if(alias.endsWith('/*')) {
            alias = alias.slice(0, aliasRaw.length - 2);
            if(entries.includes(alias) || result.find(({ find: recordAlias }) => alias === recordAlias)) {
                // console.warn(`alias ${alias}, processed from raw alias ${aliasRaw}, already defined in tsconfig or was processed to this value earlier — current alias will be ignored`);
                continue;
            }
        }

        let replacement = entries[0];
        // remove trailing /*
        if(replacement.endsWith('/*'))
            replacement = replacement.slice(0, replacement.length - 2);

        replacement = path.join(cwd, replacement);

        result.push({
            find: alias,
            replacement
        })
    }

    return result;
}