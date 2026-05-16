import * as vscode from 'vscode';
import { Node } from 'web-tree-sitter';

export class FormattingVisitor {
    private edits: vscode.TextEdit[];
    private formattedNodes: Set<number> = new Set();

    constructor(existingEdits: vscode.TextEdit[] = []) {
        this.edits = existingEdits;
    }

    public getEdits(): vscode.TextEdit[] {
        return this.edits;
    }

    public traverseNode(node: Node, indentLevel: number) {
        if (this.formattedNodes.has(node.id)) { return; }
        this.formattedNodes.add(node.id);

        switch (node.type) {
            case 'compilation_unit':
            case 'file_scoped_namespace_declaration':
                this.handleContainerNode(node, indentLevel);
                break;

            case 'namespace_declaration':
            case 'class_declaration':
            case 'interface_declaration':
            case 'method_declaration':
            case 'constructor_declaration':
            case 'property_declaration':
                this.handleStructuralNode(node, indentLevel);
                break;

            case 'accessor_list':
            case 'block':
            case 'declaration_list':
                this.handleBlockNode(node, indentLevel);
                break;

            case 'enum_member_declaration_list':
                this.handleEnumMemberList(node, indentLevel);
                break;

            case 'try_statement':
                this.handleTryStatement(node, indentLevel);
                break;

            case 'switch_body':
                this.handleSwitchBody(node, indentLevel);
                break;

            case 'switch_section':
                this.handleSwitchSection(node, indentLevel);
                break;

            case 'switch_expression':
                this.handleSwitchExpression(node, indentLevel);
                break;

            case 'arrow_expression_clause':
            case 'lambda_expression':
                this.handleArrowExpression(node, indentLevel);
                break;

            case 'if_statement':
                this.handleIfStatement(node, indentLevel);
                break;

            case 'anonymous_object_creation_expression':
                this.handleAnonymousObject(node, indentLevel);
                break;

            case 'name_equals':
            case 'anonymous_object_member_declarator':
                this.handleNameEquals(node, indentLevel);
                break;

            case 'object_initializer':
                this.handleObjectInitializer(node, indentLevel);
                break;

            case 'assignment_expression':
                this.handleAssignmentExpression(node, indentLevel);
                break;

            case 'invocation_expression':
                this.handleInvocationExpression(node, indentLevel);
                break;

            default:
                this.handlePassThrough(node, indentLevel);
                break;
        }
    }

    private handleContainerNode(node: Node, indentLevel: number) {
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            const prev = i > 0 ? node.children[i - 1] : null;

            if (prev) {
                // FIX: Specific inline rules for the file-scoped namespace signature
                if (node.type === 'file_scoped_namespace_declaration') {
                    if (prev.type === 'namespace') {
                        this.setGap(prev, child, ' '); // Space after 'namespace'
                        this.traverseNode(child, indentLevel);
                        continue;
                    }
                    if (child.type === ';') {
                        this.setGap(prev, child, ''); // Snug the semicolon to the identifier
                        this.traverseNode(child, indentLevel);
                        continue;
                    }
                }

                // Default behavior for classes, interfaces, and standard compilation units
                this.enforceVerticalSpacing(prev, child, indentLevel);
            }
            this.traverseNode(child, indentLevel);
        }
    }

    private handleStructuralNode(node: Node, indentLevel: number) {
        node.children.forEach(child => this.traverseNode(child, indentLevel));
    }

    // =====================================================================
    // BLOCK & STRICT SPACING ENGINE (With Small Block Inlining)
    // =====================================================================
    private handleBlockNode(node: Node, indentLevel: number) {
        const indentStr = this.getIndent(indentLevel);
        const childIndentStr = this.getIndent(indentLevel + 1);
        const openBrace = node.children[0];
        const closeBrace = node.children[node.children.length - 1];

        let isSmallBlock = false;
        const namedChildren = node.children.filter(c => c.isNamed && c.type !== 'comment');

        if (node.type === 'accessor_list') {
            const isAutoProp = namedChildren.every(c => c.type === 'accessor_declaration' && !c.children.some(cc => cc.type === 'block'));
            if (isAutoProp) { isSmallBlock = true; }
        }

        if (!isSmallBlock && namedChildren.length === 1 && namedChildren[0].startPosition.row === namedChildren[0].endPosition.row) {
            isSmallBlock = true;
        }

        if (isSmallBlock) {
            if (openBrace && node.previousSibling) {
                this.setGap(node.previousSibling, openBrace, ' ');
            }
            for (let i = 0; i < node.children.length - 1; i++) {
                const current = node.children[i];
                const next = node.children[i + 1];

                if (current.type === '{' && next.type === '}') {
                    this.setGap(current, next, '');
                } else if (current.type === '{' || next.type === '}') {
                    this.setGap(current, next, ' ');
                } else if (current.type === ';') {
                    this.setGap(current, next, ' ');
                }
            }
            node.children.forEach(child => this.traverseNode(child, indentLevel));
            return;
        }

        if (openBrace && openBrace.type === '{') {
            if (node.previousSibling) {
                this.setGap(node.previousSibling, openBrace, `\n${indentStr}`);
            }
        }

        for (let i = 1; i < node.children.length - 1; i++) {
            const child = node.children[i];
            const prev = node.children[i - 1];

            if (prev && prev.type === '{') {
                this.setGap(prev, child, `\n${childIndentStr}`);
            } else if (prev) {
                this.enforceVerticalSpacing(prev, child, indentLevel + 1);
            }
            this.traverseNode(child, indentLevel + 1);
        }

        if (closeBrace && closeBrace.type === '}') {
            const prevChild = node.children[node.children.length - 2];
            if (prevChild && prevChild.type === '{') {
                this.setGap(prevChild, closeBrace, `\n${indentStr}`);
            } else if (prevChild) {
                this.setGap(prevChild, closeBrace, `\n${indentStr}`);
            }
        }
    }

    // =====================================================================
    // SPECIFIC SYNTAX HANDLERS
    // =====================================================================

    private handleTryStatement(node: Node, indentLevel: number) {
        const indentStr = this.getIndent(indentLevel);
        for (let i = 0; i < node.children.length - 1; i++) {
            const current = node.children[i];
            const next = node.children[i + 1];

            if ((current.type === 'block' || current.type === 'catch_clause') &&
                (next.type === 'catch_clause' || next.type === 'finally_clause')) {
                this.setGap(current, next, `\n${indentStr}`);
            }
        }
        node.children.forEach(child => this.traverseNode(child, indentLevel));
    }

    private handleEnumMemberList(node: Node, indentLevel: number) {
        const indentStr = this.getIndent(indentLevel);
        const childIndentStr = this.getIndent(indentLevel + 1);

        const members = node.children.filter(c => c.isNamed);
        const shouldExpand = members.length > 3;

        const openBrace = node.children[0];

        if (openBrace && openBrace.type === '{') {
            if (node.previousSibling) {
                this.setGap(node.previousSibling, openBrace, shouldExpand ? `\n${indentStr}` : ' ');
            }
        }

        for (let i = 0; i < node.children.length - 1; i++) {
            const current = node.children[i];
            const next = node.children[i + 1];

            if (current.type === '{' && next.type === '}') {
                this.setGap(current, next, '');
            } else if (current.type === '{') {
                this.setGap(current, next, shouldExpand ? `\n${childIndentStr}` : ' ');
            } else if (current.type === ',') {
                this.setGap(current, next, shouldExpand ? `\n${childIndentStr}` : ' ');
            } else if (next.type === '}') {
                this.setGap(current, next, shouldExpand ? `\n${indentStr}` : ' ');
            } else if (current.type === '=') {
                this.setGap(current, next, '');
            } else if (next.type === '=') {
                this.setGap(current, next, '');
            }
        }

        node.children.forEach(child => this.traverseNode(child, indentLevel + (shouldExpand ? 1 : 0)));
    }

    private handleSwitchBody(node: Node, indentLevel: number) {
        const indentStr = this.getIndent(indentLevel);
        const openBrace = node.children[0];
        const closeBrace = node.children[node.children.length - 1];

        if (openBrace && openBrace.type === '{' && node.previousSibling) {
            this.setGap(node.previousSibling, openBrace, `\n${indentStr}`);
        }

        for (let i = 1; i < node.children.length - 1; i++) {
            const child = node.children[i];
            const prev = node.children[i - 1];

            if (prev && prev.type === '{') {
                this.setGap(prev, child, `\n${this.getIndent(indentLevel + 1)}`);
            } else if (prev) {
                this.setGap(prev, child, `\n${this.getIndent(indentLevel + 1)}`);
            }
            this.traverseNode(child, indentLevel + 1);
        }

        if (closeBrace && closeBrace.type === '}' && node.children.length > 1) {
            this.setGap(node.children[node.children.length - 2], closeBrace, `\n${indentStr}`);
        }
    }

    // FIXED: The State Machine for formatting switch sections!
    private handleSwitchSection(node: Node, indentLevel: number) {
        const indentStr = this.getIndent(indentLevel);
        const childIndentStr = this.getIndent(indentLevel + 1);

        let isParsingLabel = true;

        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            const prev = i > 0 ? node.children[i - 1] : null;

            // 1. Entering a case/default label
            if (child.type === 'case' || child.type === 'default') {
                isParsingLabel = true;
                if (prev) {
                    this.setGap(prev, child, `\n${indentStr}`); // Stacks multiple labels (case 1: \n case 2:)
                } else {
                    this.replaceLeadingWhitespace(child, indentLevel);
                }
                this.traverseNode(child, indentLevel);
                continue;
            }

            // 2. We are currently inside the label definition
            if (isParsingLabel) {
                if (prev) {
                    if (child.type === ':') {
                        this.setGap(prev, child, ''); // Snaps the colon (e.g. Active:)
                        isParsingLabel = false; // We reached the end of the label!
                    } else {
                        this.setGap(prev, child, ' '); // Keeps 'case' and pattern inline
                    }
                }
                this.traverseNode(child, indentLevel);
            }
            // 3. We have passed the colon, format the statements inside
            else {
                if (prev) {
                    this.setGap(prev, child, `\n${childIndentStr}`);
                }
                this.traverseNode(child, indentLevel + 1);
            }
        }
    }

    private handleSwitchExpression(node: Node, indentLevel: number) {
        const indentStr = this.getIndent(indentLevel);
        const childIndentStr = this.getIndent(indentLevel + 1);

        const arms = node.children.filter(c => c.type === 'switch_expression_arm');
        const shouldExpand = arms.length > 1;

        for (let i = 0; i < node.children.length - 1; i++) {
            const current = node.children[i];
            const next = node.children[i + 1];

            if (current.type === 'switch' && next.type === '{') {
                this.setGap(current, next, ' ');
            } else if (current.type === '{' && next.type === '}') {
                this.setGap(current, next, '');
            } else if (current.type === '{') {
                this.setGap(current, next, shouldExpand ? `\n${childIndentStr}` : ' ');
            } else if (current.type === ',') {
                this.setGap(current, next, shouldExpand ? `\n${childIndentStr}` : ' ');
            } else if (next.type === '}') {
                this.setGap(current, next, shouldExpand ? `\n${indentStr}` : ' ');
            }
        }

        node.children.forEach(child => this.traverseNode(child, indentLevel + (shouldExpand ? 1 : 0)));
    }

    private handleArrowExpression(node: Node, indentLevel: number) {
        const arrowNode = node.children.find(c => c.type === '=>');
        if (arrowNode) {
            const left = node.children[node.children.indexOf(arrowNode) - 1];
            const right = node.children[node.children.indexOf(arrowNode) + 1];
            if (left) { this.setGap(left, arrowNode, ' '); }
            if (right) { this.setGap(arrowNode, right, ' '); }
        }
        node.children.forEach(child => this.traverseNode(child, indentLevel));
    }

    // =====================================================================
    // ORIGINAL FORMATTING LOGIC
    // =====================================================================

    private enforceVerticalSpacing(prev: Node, child: Node, indentLevel: number) {
        if (!prev || !child) { return; }

        const indentStr = this.getIndent(indentLevel);
        let gapText = `\n${indentStr}`;

        if (child.type === 'comment') {
            if (prev.endPosition.row === child.startPosition.row) {
                this.setGap(prev, child, ' ');
                return;
            }
            if (prev.type !== 'comment' && prev.type !== '{') {
                gapText = `\n\n${indentStr}`;
            }
        }

        const isMajorBlock = ['method_declaration', 'constructor_declaration', 'class_declaration', 'namespace_declaration'].includes(child.type);
        if (isMajorBlock && prev.type !== 'comment' && prev.type !== '{') {
            gapText = `\n\n${indentStr}`;
        }

        const prevIsMajorBlock = ['method_declaration', 'constructor_declaration', 'class_declaration', 'namespace_declaration'].includes(prev.type);
        if (prevIsMajorBlock && child.type !== '}') {
            gapText = `\n\n${indentStr}`;
        }

        this.setGap(prev, child, gapText);
    }

    private handleIfStatement(node: Node, indentLevel: number) {
        const indentStr = this.getIndent(indentLevel);

        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            const prev = i > 0 ? node.children[i - 1] : null;

            if (child.type === 'else' && prev) {
                this.setGap(prev, child, `\n${indentStr}`);
            }
            this.traverseNode(child, indentLevel);
        }
    }

    private handleAnonymousObject(node: Node, indentLevel: number) {
        const indentStr = this.getIndent(indentLevel);
        const childIndentStr = this.getIndent(indentLevel + 1);

        const commas = node.children.filter(c => c.type === ',');
        const hasProperties = node.children.some(c =>
            c.type !== 'new' && c.type !== '{' && c.type !== '}' && c.type !== ','
        );
        const propertyCount = hasProperties ? commas.length + 1 : 0;

        const hasComplexType = node.children.some(c => this.isComplex(c));
        const shouldExpand = hasComplexType || propertyCount > 3;

        for (let i = 0; i < node.children.length - 1; i++) {
            const current = node.children[i];
            const next = node.children[i + 1];

            if (current.type === '{' && next.type === '}') {
                this.setGap(current, next, '');
                continue;
            }

            if (current.type === 'new' && next.type === '{') {
                this.setGap(current, next, shouldExpand ? `\n${indentStr}` : ' ');
            } else if (current.type === '{') {
                this.setGap(current, next, shouldExpand ? `\n${childIndentStr}` : ' ');
            } else if (next.type === '}') { // FIXED: Moved above the comma check!
                this.setGap(current, next, shouldExpand ? `\n${indentStr}` : ' ');
            } else if (current.type === ',') {
                this.setGap(current, next, shouldExpand ? `\n${childIndentStr}` : ' ');
            } else if (next.type === ',') {
                this.setGap(current, next, '');
            } else if (current.type === '=') {
                this.setGap(current, next, ' ');
            } else if (next.type === '=') {
                this.setGap(current, next, ' ');
            }
        }

        node.children.forEach(child => this.traverseNode(child, indentLevel + (shouldExpand ? 1 : 0)));
    }

    private handleNameEquals(node: Node, indentLevel: number) {
        const equalsNode = node.children.find(c => c.type === '=');
        if (equalsNode) {
            const left = node.children[node.children.indexOf(equalsNode) - 1];
            const right = node.children[node.children.indexOf(equalsNode) + 1];

            if (left) { this.setGap(left, equalsNode, ' '); }
            if (right) { this.setGap(equalsNode, right, ' '); }
        }
        node.children.forEach(child => this.traverseNode(child, indentLevel));
    }

    private isComplex(node: Node): boolean {
        if (!node) { return false; }

        const type = node.type.toLowerCase();
        if (type.includes('object_creation') ||
            type.includes('array_creation') ||
            type.includes('initializer') ||
            type.includes('block')) {
            return true;
        }

        for (const child of node.children) {
            if (this.isComplex(child)) { return true; }
        }

        return false;
    }

    private handleObjectInitializer(node: Node, indentLevel: number) {
        const indentStr = this.getIndent(indentLevel);
        const childIndentStr = this.getIndent(indentLevel + 1);

        if (node.previousSibling) {
            this.setGap(node.previousSibling, node, `\n${indentStr}`);
        }

        for (let i = 0; i < node.children.length - 1; i++) {
            const current = node.children[i];
            const next = node.children[i + 1];

            if (current.type === '{' && next.type === '}') {
                this.setGap(current, next, '');
            } else if (current.type === '{') {
                this.setGap(current, next, `\n${childIndentStr}`);
            } else if (current.type === ',') {
                this.setGap(current, next, `\n${childIndentStr}`);
            } else if (next.type === '}') {
                this.setGap(current, next, `\n${indentStr}`);
            } else if (next.type === ',') {
                this.setGap(current, next, '');
            }
        }

        node.namedChildren.forEach(child => this.traverseNode(child, indentLevel + 1));
    }

    private handleAssignmentExpression(node: Node, indentLevel: number) {
        const indentStr = this.getIndent(indentLevel);

        const equalsNode = node.children.find(c => c.type === '=');
        if (equalsNode) {
            const rightSide = node.children[node.children.indexOf(equalsNode) + 1];
            if (rightSide && rightSide.startPosition.row > equalsNode.endPosition.row) {
                this.setGap(equalsNode, rightSide, ' ');
            }
        }

        const nextNode = node.nextSibling;
        if (nextNode && nextNode.type === ',') {
            const nextProp = node.nextNamedSibling;
            if (nextProp && nextProp.startPosition.row === nextNode.endPosition.row) {
                this.setGap(nextNode, nextProp, `\n${indentStr}`);
            }
        }

        node.children.forEach(child => this.traverseNode(child, indentLevel));
    }

    private handleInvocationExpression(node: Node, indentLevel: number) {
        const childIndentStr = this.getIndent(indentLevel + 1);
        const memberAccess = node.childForFieldName('function');

        let targetIndentLevel = indentLevel;

        // 1. Apply specific spacing logic for fluent chained method calls (e.g. .Select().Where())
        if (memberAccess && memberAccess.type === 'member_access_expression') {
            if (memberAccess.child(0)?.type === 'invocation_expression') {
                const dotNode = memberAccess.children.find(c => c.type === '.');
                if (dotNode && memberAccess.startPosition.row === dotNode.startPosition.row) {
                    const previous = memberAccess.children[memberAccess.children.indexOf(dotNode) - 1];
                    if (previous) {
                        this.setGap(previous, dotNode, `\n${childIndentStr}`);
                    }
                }
                // If it's a chained call, we push the indent level up for its arguments
                targetIndentLevel = targetIndentLevel + 1;
            }
        }

        // 2. CRITICAL FIX: Traverse ALL children of the invocation_expression.
        // This ensures the 'member_access_expression' AND the 'argument_list' are both walked,
        // allowing the visitor to reach lambdas and nested method calls like Results.Ok().
        node.children.forEach(child => this.traverseNode(child, targetIndentLevel));
    }

    private handlePassThrough(node: Node, indentLevel: number) {
        node.children.forEach(child => this.traverseNode(child, indentLevel));
    }

    private getIndent(level: number): string {
        return '    '.repeat(level);
    }

    private insertEdit(point: { row: number, column: number }, text: string) {
        this.edits.push(vscode.TextEdit.insert(
            new vscode.Position(point.row, point.column),
            text
        ));
    }

    private setGap(nodeA: Node, nodeB: Node, gapText: string) {
        const start = new vscode.Position(nodeA.endPosition.row, nodeA.endPosition.column);
        const end = new vscode.Position(nodeB.startPosition.row, nodeB.startPosition.column);
        const newRange = new vscode.Range(start, end);

        for (let i = this.edits.length - 1; i >= 0; i--) {
            const existingRange = this.edits[i].range;
            if (existingRange.start.isBefore(newRange.end) && newRange.start.isBefore(existingRange.end)) {
                this.edits.splice(i, 1);
            }
        }

        this.edits.push(vscode.TextEdit.replace(newRange, gapText));
    }

    private replaceLeadingWhitespace(node: Node, indentLevel: number) {
        if (!node) { return; }

        const expectedIndent = this.getIndent(indentLevel);
        const start = new vscode.Position(node.startPosition.row, 0);
        const end = new vscode.Position(node.startPosition.row, node.startPosition.column);
        const range = new vscode.Range(start, end);

        for (let i = this.edits.length - 1; i >= 0; i--) {
            if (this.edits[i].range.intersection(range)) {
                return;
            }
        }

        this.edits.push(vscode.TextEdit.replace(range, expectedIndent));
    }
}