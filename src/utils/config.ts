import { lilconfig, type Loader } from 'lilconfig';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export const loadYaml: Loader = (filepath, content) => {
    return YAML.parse(content);
};

export async function findProjectRoot(startDir: string): Promise<string | null> {
    const searchPlaces = ['astrical.yml', 'astrical.yaml'];

    // We use lilconfig to find the file up the tree
    const explorer = lilconfig('astrical', {
        searchPlaces,
        loaders: {
            '.yml': loadYaml,
            '.yaml': loadYaml,
        }
    });

    const result = await explorer.search(startDir);
    if (result) {
        return path.dirname(result.filepath);
    }

    return null;
}

export async function loadConfig(rootDir: string): Promise<any> {
    const searchPlaces = ['astrical.yml', 'astrical.yaml'];
    const explorer = lilconfig('astrical', {
        searchPlaces,
        loaders: {
            '.yml': loadYaml,
            '.yaml': loadYaml,
        }
    });
    const result = await explorer.search(rootDir);
    return result ? result.config : {};
}
