import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const BUCKET_NAME = process.env.GCS_BUCKET || 'your-default-bucket-name';
const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);

export interface FileItem {
  name: string;
  type: 'file' | 'dir';
  content?: string;
}

export const fetchGCSFolder = async (prefix: string, localPath: string): Promise<void> => {
  const [files] = await bucket.getFiles({ prefix });

  for (const file of files) {
    const destination = `${localPath}/${file.name.replace(prefix, '')}`;
    const contents = await file.download();
    await writeFile(destination, contents[0]);
  }
};

export async function copyGCSFolder(sourcePrefix: string, destinationPrefix: string): Promise<void> {
  const [files] = await bucket.getFiles({ prefix: sourcePrefix });

  for (const file of files) {
    const destPath = file.name.replace(sourcePrefix, destinationPrefix);
    await file.copy(bucket.file(destPath));
    console.log(`Copied ${file.name} to ${destPath}`);
  }
}
export interface FileItem {
  name: string;
  type: 'file' | 'dir';
  content?: string;
}

export async function listTopLevelGCSFiles(prefix: string): Promise<FileItem[]> {
  const [files] = await bucket.getFiles({ prefix });
  const topLevel: Record<string, FileItem> = {};

  for (const file of files) {
    const relativePath = file.name.replace(prefix, '');
    if (!relativePath || relativePath === '') continue;

    const topLevelName = relativePath.split('/')[0];

    if (relativePath.endsWith('/')) {
      if (!topLevel[topLevelName]) {
        topLevel[topLevelName] = {
          name: topLevelName,
          type: 'dir',
        };
      }
      continue;
    }

    if (!topLevel[topLevelName]) {
      const contentBuffer = await file.download();
      topLevel[topLevelName] = {
        name: topLevelName,
        type: 'file',
        content: contentBuffer[0].toString('utf-8'),
      };
    }
  }

  return Object.values(topLevel);
}


export const saveToGCS = async (key: string, filePath: string, content: string): Promise<void> => {
  const fullPath = `${key}${filePath}`;
  await bucket.file(fullPath).save(content);
  console.log(`Saved to GCS: ${fullPath}`);
};


function writeFile(filePath: string, fileData: Buffer): Promise<void> {
  return new Promise(async (resolve, reject) => {
    await createFolder(path.dirname(filePath));

    fs.writeFile(filePath, fileData, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function createFolder(dirName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.mkdir(dirName, { recursive: true }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}