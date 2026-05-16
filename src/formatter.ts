import * as vscode from 'vscode';
import { TreeSitterService } from './services/treeSitterService';
import { FormattingVisitor } from './visitors/formattingVisitor';

export class EclatosCSharpFormatter {
    private treeSitterService: TreeSitterService;

    constructor( private context: vscode.ExtensionContext) {
        this.treeSitterService = new TreeSitterService();
    }

    public async init() {
        await this.treeSitterService.initialize(this.context.extensionPath);
    }

    public async formatDocument(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
        if (!document) { return []; }

        const sourceCode = document.getText();
        const tree = this.treeSitterService.parse(sourceCode);
        const rootNode = tree?.rootNode;

        if (!rootNode) { return []; }

        // PURE AST PASS: No regex necessary anymore.
        const visitor = new FormattingVisitor();
        visitor.traverseNode(rootNode, 0);

        return visitor.getEdits();
    }

    public async applyPostProcessing(document: vscode.TextDocument): Promise<void> {
        const edits = await this.formatDocument(document);
        if (edits.length > 0) {
            const workspaceEdit = new vscode.WorkspaceEdit();
            workspaceEdit.set(document.uri, edits);
            await vscode.workspace.applyEdit(workspaceEdit);
        }
    }
}