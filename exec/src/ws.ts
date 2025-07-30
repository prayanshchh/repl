import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server as HttpServer } from 'http';
import { randomUUID } from 'crypto';
import { fetchDir, fetchFileContent, saveFile } from './fs';
import { TerminalManager } from './pty';
import { fetchInitialFiles, sendToSaveServiceUpdate, syncInitialFilesToWorkspace } from './utils';
import path from 'path';

interface WSWithMeta extends WebSocket {
    replId: string;
    language: string;
    clientId: string;
}

const WORKSPACE_PATH = '/home/prayansh-chhablani/repl/exec/src/test';
const terminalManager = new TerminalManager();

export function initWs(httpServer: HttpServer) {
    const wss = new WebSocketServer({ server: httpServer });

    wss.on('connection', async (ws: WSWithMeta, req: IncomingMessage) => {
        ws.clientId = randomUUID();
        const host = req.headers.host;
        const url = new URL(req.url || '', `http://${host}`);
        const replId = url.searchParams.get('replId');
        const language = url.searchParams.get('language');

        if (!replId || !language) {
            ws.close();
            terminalManager.clear(ws.clientId);
            return;
        }

        terminalManager.createPty(ws.clientId, replId, (data) => {
          send(ws, 'terminal', { data }, '');
        });

        const files = await fetchInitialFiles(replId, language);
        await syncInitialFilesToWorkspace(files, WORKSPACE_PATH);

        ws.replId = replId;

        ws.send(
            JSON.stringify({
                type: 'loaded',
                rootContent: await fetchDir(WORKSPACE_PATH, ''),
            })
        );

        ws.on('message', async (message) => {
            try {
                const msgStr = message.toString('utf-8');
                const parsed = JSON.parse(msgStr);
                const { type, data, callbackId } = parsed;
                console.log('[WS] Received message:', msgStr);
                await handleMessage(ws, type, data, callbackId);
            } catch (err) {
                console.error('[WS] Invalid message:', message.toString());
            }
        });

        ws.on('close', () => {
            console.log('user disconnected');
            terminalManager.clear(ws.clientId);
        });
    });
}

async function handleMessage(ws: WSWithMeta, type: string, data: any, callbackId: string) {
    switch (type) {
        case 'fetchDir': {
            const dirPath = path.join(WORKSPACE_PATH, data || '');
            const contents = await fetchDir(dirPath, data);
            send(ws, 'fetchDirResult', contents, callbackId);
            break;
        }
        case 'fetchContent': {
            const fullPath = path.join(WORKSPACE_PATH, data.path);
            const content = await fetchFileContent(fullPath);
            send(ws, 'fetchContentResult', content, callbackId);
            break;
        }
        case 'updateContent': {
            const fullPath = path.join(WORKSPACE_PATH, data.path);
            await saveFile(fullPath, data.content);
            const latestContent = await fetchFileContent(fullPath);
            await sendToSaveServiceUpdate(ws.replId, [
              {
                  path: data.path,
                  content: latestContent,
              }
          ]);
            break;
        }
        case 'terminalData': {
          console.log(`[WS] Writing to terminal for ${ws.clientId}:`, data.data);
          terminalManager.write(ws.clientId, data.data);
          break;
      }
    }
}

function send(ws: WebSocket, type: string, data: any, callbackId: string) {
    ws.send(JSON.stringify({ type, data, callbackId }));
}
