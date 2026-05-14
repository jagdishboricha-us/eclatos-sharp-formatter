import * as vscode from 'vscode';
import { EclatosCSharpFormatter } from './formatter';

export async function activate(context: vscode.ExtensionContext) {
	console.log('Eclatos Standalone C# Formatter is now active.');

	const formatter = new EclatosCSharpFormatter();
	await formatter.init(context.extensionPath);

	// Register natively as the default C# formatter provider
	const formattingProvider = vscode.languages.registerDocumentFormattingEditProvider('csharp', {
		provideDocumentFormattingEdits(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
			return formatter.formatDocument(document);
		}
	});

	context.subscriptions.push(formattingProvider);
}

export function deactivate() { }