import * as path from 'path';
import { Parser, Language, Tree } from 'web-tree-sitter';
import * as vscode from 'vscode';

export class TreeSitterService {
    private parser: Parser | undefined;

    public async initialize(extensionPath: string): Promise<void> {
        try {
            console.log(`[Eclatos] Initializing Tree-sitter from path: ${extensionPath}`);

            // 1. Locate the core library WASM engine inside the dist folder
            const mainWasmPath = path.join(extensionPath, 'dist', 'web-tree-sitter.wasm');

            // 2. Locate the C# Grammar WASM in the root folder
            const csharpWasmPath = path.join(extensionPath, 'tree-sitter-c_sharp.wasm');

            // 3. Force the Parser to use the exact path for its engine
            await Parser.init({
                locateFile: (scriptName: string) => {
                    if (scriptName === 'web-tree-sitter.wasm') {return mainWasmPath;}
                    return scriptName;
                }
            });

            // 4. Load the C# Grammar
            const csharpLanguage = await Language.load(csharpWasmPath);
            this.parser = new Parser();
            this.parser.setLanguage(csharpLanguage);

            console.log(`[Eclatos] Tree-sitter fully initialized.`);
        } catch (err) {
            console.error(`[Eclatos] Fatal error initializing Tree-sitter: ${err}`);
            vscode.window.showErrorMessage(`Eclatos Formatter failed to load: ${err}`);
        }
    }

    public parse(sourceCode: string): Tree | undefined | null {
        if (!this.parser) {
            console.error("TreeSitterService: Parser not initialized.");
            return undefined;
        }
        return this.parser.parse(sourceCode);
    }
}

