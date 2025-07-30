import axios from 'axios';
import path from 'path';
import { createFolder, saveFile } from './fs';

interface FileItem {
    name: string;
    type: 'file' | 'dir';
    content?: string;
  }

interface FileChange {
    path: string;
    content: string;
  }
  

export async function fetchInitialFiles(replId: string, language: string): Promise<FileItem[]> {
    try {
      const response = await axios.get('http://127.0.0.1:4000/initialise', {
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
      const response = await axios.post('http://127.0.0.1:4000/change', {
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