import axios from 'axios';
import path from 'path';
import { createFolder, saveFile } from './fs';
import dotenv from 'dotenv';
dotenv.config();

interface FileItem {
    name: string;
    type: 'file' | 'dir';
    content?: string;
  }

interface FileChange {
    path: string;
    content: string;
  }
  
const BASE_URL = process.env.SAVE_SERVICE_URL;

export async function fetchInitialFiles(replId: string, language: string): Promise<FileItem[]> {
    try {
      const response = await axios.get(`${BASE_URL}/initialise`, {
        params: { replId, language }
      });
      return response.data.files;
    } catch (err: any) {
      if (err.response) {
        console.error(`[INITIALISE] Error ${err.response.status}:`, err.response.data);
      } else {
        console.error('[INITIALISE] Failed to fetch from Save Service:', err.message);
      }
      return [];
    }
  }

export async function sendToSaveServiceUpdate(
    replId: string,
    files: FileChange[]
  ): Promise<void> {
    try {
      const response = await axios.post(`${BASE_URL}/change`, {
        replId,
        files,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      console.log('[SAVE] File changes sent to Save Service:', response.status);
    } catch (err: any) {
      if (err.response) {
        console.log(err)
      } else {
        console.error('[SAVE] Failed to send to Save Service:', err.message);
      }
    }
  }

export async function syncInitialFilesToWorkspace(files: FileItem[], basePath = '/home/prayansh-chhablani/repl/exec/src/test'): Promise<void> {
    for (const file of files) {
      const fullPath = path.join(basePath, file.name);
  
      if (file.type === 'dir') {
        await createFolder(fullPath);
      } else if (file.type === 'file') {
        await createFolder(path.dirname(fullPath));
        await saveFile(fullPath, file.content || '');
      }
    }
  }