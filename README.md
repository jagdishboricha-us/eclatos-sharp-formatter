# Eclatos C# Formatter

A blazing-fast, standalone C# formatting engine for Visual Studio Code, powered by the Tree-sitter Abstract Syntax Tree (AST).

Unlike traditional formatters that rely on Roslyn or fragile regular expressions, the Eclatos Formatter genuinely understands the structure of your code. It enforces a strict, highly opinionated, and exceptionally clean architectural style.

## Features

* **AST-Driven Precision:** Uses `web-tree-sitter` to parse your C# into a perfect syntax tree, allowing for context-aware formatting.
* **Smart Allman Bracing:** Forces standard blocks into strict Allman style, but intelligently inlines "small blocks" (like auto-properties or single-line methods) to keep your code compact.
* **Intelligent Vertical Spacing:** Mercilessly crushes accidental vertical gaps while preserving intentional spacing around major structures (classes, methods) and comment blocks.
* **Advanced Syntax Handling:** Contains custom, flawless alignment logic for:
  * Traditional `switch` statements and `case` labels.
  * Modern `switch` expressions.
  * `try/catch/finally` blocks.
  * Enum declarations.
  * Lambda and arrow-bodied expressions (`=>`).

## Requirements

* Visual Studio Code v1.118.0 or higher.

## Usage

This extension requires zero configuration. It registers natively as a VS Code document formatting provider.

Simply open a `.cs` file and use the standard format shortcut:

* **Windows:** `Shift + Alt + F`
* **Mac:** `Shift + Option + F`
* Or enable "Format on Save" in your VS Code settings.

## Release Notes

### 0.0.1

* Initial release of the core AST formatting engine.
