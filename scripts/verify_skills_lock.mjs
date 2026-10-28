import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const lock = JSON.parse(await readFile(join(root, 'skills-lock.json'), 'utf8'));
for (const [name, entry] of Object.entries(lock.skills)) {
    const directory = join(root, '.agents/skills', name);
    const files = [];
    async function collect(current) {
        for (const item of await readdir(current, { withFileTypes: true })) {
            const path = join(current, item.name);
            if (item.isDirectory() && !['.git', 'node_modules'].includes(item.name)) await collect(path);
            else if (item.isFile()) files.push(path);
        }
    }
    await collect(directory);
    files.sort((a, b) => relative(directory, a).replaceAll('\\', '/').localeCompare(relative(directory, b).replaceAll('\\', '/')));
    const hash = createHash('sha256');
    for (const file of files) {
        hash.update(relative(directory, file).replaceAll('\\', '/'));
        hash.update(await readFile(file));
    }
    if (hash.digest('hex') !== entry.computedHash) throw new Error(`Skill ${name} differs from skills-lock.json`);
    console.log(`${name}: locked copy verified`);
}
