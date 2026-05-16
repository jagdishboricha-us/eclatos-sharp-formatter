const esbuild = require("esbuild");
const fs = require('fs');
const path = require('path');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

async function main() {
	const ctx = await esbuild.context({
		entryPoints: ['./src/extension.ts'],
		bundle: true,
		outfile: './dist/extension.js',
		external: ['vscode'],
		format: 'esm',
		platform: 'node',
		target: 'node18',
		minify: process.argv.includes('--production'),
		sourcemap: !process.argv.includes('--production'),
		banner: {
			js: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`,
		},

	});
	const wasmSource = path.join(__dirname, 'node_modules/web-tree-sitter/web-tree-sitter.wasm');
	const wasmDest = path.join(__dirname, 'dist/web-tree-sitter.wasm');

	if (fs.existsSync(wasmSource)) {
		fs.copyFileSync(wasmSource, wasmDest);
		console.log('Successfully moved web-tree-sitter.wasm to dist/');
	}
	if (watch) {
		await ctx.watch();
		if (fs.existsSync(wasmSource)) {
			fs.copyFileSync(wasmSource, wasmDest);
		}
	} else {
		await ctx.rebuild();
		if (fs.existsSync(wasmSource)) {
			fs.copyFileSync(wasmSource, wasmDest);
		}
		await ctx.dispose();
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
