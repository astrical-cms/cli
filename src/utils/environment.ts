import { logger } from '@nexical/cli-core';
import fs from 'fs-extra';
import path from 'path';

export async function linkEnvironment(projectRoot: string) {
    const siteDir = path.resolve(projectRoot, '_site');
    const srcDir = path.resolve(projectRoot, 'src');
    const coreDir = path.resolve(srcDir, 'core');
    const modulesDir = path.resolve(srcDir, 'modules');
    const themesDir = path.resolve(projectRoot, 'themes');
    const contentDir = path.resolve(projectRoot, 'content');
    const publicDir = path.resolve(projectRoot, 'public');

    logger.debug('Preparing environment paths:', { siteDir, srcDir });

    // 1. Ensure _site exists (recreate it cleanly to remove old links)
    await fs.remove(siteDir);

    // 2. Symlink Core -> _site
    if (await fs.pathExists(coreDir)) {
        await fs.ensureSymlink(coreDir, siteDir, 'junction');
    } else {
        throw new Error(`Core directory not found at ${coreDir}`);
    }

    // 3. Symlink Modules
    if (await fs.pathExists(modulesDir)) {
        const siteModulesDir = path.join(siteDir, 'modules');
        await fs.remove(siteModulesDir);
        await fs.ensureSymlink(modulesDir, siteModulesDir, 'junction');
    }

    // 4. Symlink Themes
    if (await fs.pathExists(themesDir)) {
        const siteThemesDir = path.join(siteDir, 'src/themes');
        await fs.remove(siteThemesDir);
        await fs.ensureSymlink(themesDir, siteThemesDir, 'junction');
    }

    // 5. Symlink Content
    if (await fs.pathExists(contentDir)) {
        const siteContentDir = path.join(siteDir, 'content');
        await fs.remove(siteContentDir);
        await fs.ensureSymlink(contentDir, siteContentDir, 'junction');
    }

    // 6. Symlink Public
    if (await fs.pathExists(publicDir)) {
        const sitePublicDir = path.join(siteDir, 'public');
        await fs.remove(sitePublicDir);
        await fs.ensureSymlink(publicDir, sitePublicDir, 'junction');
    }
}


export async function copyEnvironment(projectRoot: string) {
    const siteDir = path.resolve(projectRoot, '_site');
    const srcDir = path.resolve(projectRoot, 'src');
    const coreDir = path.resolve(srcDir, 'core');
    const modulesDir = path.resolve(srcDir, 'modules');
    const themesDir = path.resolve(projectRoot, 'themes');
    const contentDir = path.resolve(projectRoot, 'content');
    const publicDir = path.resolve(projectRoot, 'public');

    logger.debug('Build paths resolved:', { siteDir, srcDir, coreDir, modulesDir, contentDir, publicDir });

    // 1. Clean _site
    logger.debug(`Cleaning site directory: ${siteDir}`);
    await fs.remove(siteDir);
    await fs.ensureDir(siteDir);

    // 2. Copy Core contents
    if (await fs.pathExists(coreDir)) {
        await fs.copy(coreDir, siteDir, {
            filter: (src) => !src.includes('node_modules')
        });
    }

    // 3. Copy Modules
    if (await fs.pathExists(modulesDir)) {
        const siteModulesDir = path.join(siteDir, 'modules');
        await fs.remove(siteModulesDir);
        await fs.copy(modulesDir, siteModulesDir);
    }

    // 4. Copy Themes
    if (await fs.pathExists(themesDir)) {
        const siteThemesDir = path.join(siteDir, 'src/themes');
        await fs.remove(siteThemesDir);
        await fs.copy(themesDir, siteThemesDir);
    }

    // 5. Copy Content (Root)
    if (await fs.pathExists(contentDir)) {
        const siteContentDir = path.join(siteDir, 'content');
        await fs.remove(siteContentDir);
        await fs.copy(contentDir, siteContentDir);
    }

    // 6. Copy Public
    if (await fs.pathExists(publicDir)) {
        const sitePublicDir = path.join(siteDir, 'public');
        await fs.remove(sitePublicDir);
        await fs.copy(publicDir, sitePublicDir);
    }
}
