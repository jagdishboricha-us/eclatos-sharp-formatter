import * as vscode from 'vscode';
import { EclatosCSharpFormatter } from './formatter';

export async function activate(context: vscode.ExtensionContext) {
	const formatter = new EclatosCSharpFormatter(context);
	await formatter.init();

	// Register natively as the default C# formatter provider
	const formattingProvider = vscode.languages.registerDocumentFormattingEditProvider('csharp', {
		provideDocumentFormattingEdits(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
			return formatter.formatDocument(document);
		}
	});

	context.subscriptions.push(formattingProvider);
}

export function deactivate() { }