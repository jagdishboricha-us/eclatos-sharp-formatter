import * as path from 'path';
import { Parser, Language, Tree } from 'web-tree-sitter';

export class TreeSitterService {
    private parser: Parser | undefined;

    public async initialize(extensionPath: string): Promise<void> {
        await Parser.init();
        this.parser = new Parser();
        //const wasmPath = path.join(extensionPath, 'tree-sitter-c-sharp.wasm');
        const wasmPath = path.join(extensionPath, 'tree-sitter-c_sharp.wasm');
        const csharpLanguage = await Language.load(wasmPath);
        this.parser.setLanguage(csharpLanguage);
    }

    public parse(sourceCode: string): Tree | undefined | null {
        if (!this.parser) {
            console.error("TreeSitterService: Parser not initialized.");
            return undefined;
        }
        return this.parser.parse(sourceCode);
    }
}

