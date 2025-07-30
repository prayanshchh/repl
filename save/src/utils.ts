import { copyGCSFolder, FileItem, listTopLevelGCSFiles, saveToGCS } from "./gcs";

export interface FileChange {
    path: string;
    content: string;
  }

export async function initialiseRepl(replId: string, language: string): Promise<FileItem[]> {
    const sourcePrefix = `base-code/${language}/`;
    const destPrefix = `repl/${replId}/`;
    await copyGCSFolder(sourcePrefix, destPrefix);
    console.log(`Initialised repl ${replId} with base code for ${language}`);

    return await listTopLevelGCSFiles(destPrefix);
}

export async function saveFileChanges(replId: string, files: FileChange[]): Promise<void> {
    const basePath = `repl/${replId}/`;

    const ops = files.map(file =>
        saveToGCS(basePath, file.path, file.content)
    );

    await Promise.all(ops);
    console.log(`Saved ${files.length} file(s) to repl ${replId}`);
}