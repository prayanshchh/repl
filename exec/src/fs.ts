import fs from 'fs/promises';
import path from 'path';

interface File {
    type: 'file' | 'dir';
    name: string;
    path: string;
}

export async function fetchDir(dir: string, baseDir: string): Promise<File[]>  {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        return entries.map(entry => ({
            type: entry.isDirectory() ? 'dir' : 'file',
            name: entry.name,
            path: path.join(baseDir, entry.name),
        }));
    } catch (err) {
        throw err;
    }
};

export async function fetchFileContent (file: string): Promise<string> {
    try {
        const data = await fs.readFile(file, 'utf8');
        return data;
    } catch (err) {
        throw err;
    }
};

export async function saveFile (file: string, content: string): Promise<void> {
    try {
        await fs.writeFile(file, content, 'utf8');
    } catch (err) {
        throw err;
    }
};

export async function createFolder(dirName: string): Promise<void> {
    try {
      await fs.mkdir(dirName, { recursive: true });
    } catch (err) {
      if ((err as any).code !== 'EEXIST') {
        throw err;
      }
    }
  }
