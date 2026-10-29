import fs from 'fs';
import path from 'path';

const HOOK_CALL_REGEX = /\b(use(?:State|Effect|Memo|Callback|Ref|Context|Reducer|LayoutEffect|Id|ImperativeHandle|SyncExternalStore))\s*(?:<[^>]*>)?\s*\(/g;
const COMPONENT_START_REGEX = /(?:export\s+(?:default\s+)?)?function\s+([A-Z][A-Za-z0-9_]*)\s*\(|const\s+([A-Z][A-Za-z0-9_]*)\s*(?::\s*React\.FC[^=]*)?=\s*(?:React\.memo\s*\(\s*)?\([^)]*\)\s*=>\s*\{/g;

function getAllTsxFiles(dir: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllTsxFiles(fullPath, fileList);
    } else if (entry.isFile() && fullPath.endsWith('.tsx')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function stripCommentsAndStrings(line: string): string {
  return line
    .replace(/\/\/.*$/, '')
    .replace(/'(?:\\.|[^'\\])*'/g, '""')
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '""');
}

function checkFile(filePath: string, errors: string[]) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n');
  const relPath = path.relative(process.cwd(), filePath);

  let inComponentName: string | null = null;
  let componentBraceDepth = 0;
  let currentBraceDepth = 0;
  let earlyReturnLine: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const cleanLine = stripCommentsAndStrings(lines[i]);

    if (!inComponentName) {
      COMPONENT_START_REGEX.lastIndex = 0;
      const match = COMPONENT_START_REGEX.exec(cleanLine);
      if (match) {
        inComponentName = match[1] || match[2] || 'Component';
        componentBraceDepth = currentBraceDepth;
        earlyReturnLine = null;
      }
    }

    // Track brace depth before/during line
    const openBraces = (cleanLine.match(/\{/g) || []).length;
    const closeBraces = (cleanLine.match(/\}/g) || []).length;

    if (inComponentName) {
      const depthAtLineStart = currentBraceDepth - componentBraceDepth;

      // Check for top-level early return inside the component (e.g. `if (!isOpen) return null;`)
      if (
        depthAtLineStart === 1 &&
        /\bif\s*\([^)]+\)\s*return\b/.test(cleanLine) &&
        earlyReturnLine === null
      ) {
        earlyReturnLine = lineNum;
      }

      // Check for any React Hook call in this line
      HOOK_CALL_REGEX.lastIndex = 0;
      let hookMatch: RegExpExecArray | null;
      while ((hookMatch = HOOK_CALL_REGEX.exec(cleanLine)) !== null) {
        const hookName = hookMatch[1];
        if (earlyReturnLine !== null && depthAtLineStart >= 1) {
          errors.push(
            `${relPath}:${lineNum} - React Hook "${hookName}" in <${inComponentName}> is called after an early return at line ${earlyReturnLine}. Move all hooks above early returns to prevent React Error #310.`
          );
        } else if (depthAtLineStart > 1) {
          errors.push(
            `${relPath}:${lineNum} - React Hook "${hookName}" in <${inComponentName}> is called inside a nested block or function (depth ${depthAtLineStart}). All hooks must be at the top level of the component.`
          );
        }
      }
    }

    currentBraceDepth += openBraces - closeBraces;

    if (inComponentName && currentBraceDepth <= componentBraceDepth && (openBraces > 0 || closeBraces > 0)) {
      inComponentName = null;
      earlyReturnLine = null;
    }
  }
}

const srcDir = path.join(process.cwd(), 'src');
const files = getAllTsxFiles(srcDir);
const errors: string[] = [];

for (const file of files) {
  checkFile(file, errors);
}

if (errors.length > 0) {
  console.error('\n❌ React Rules of Hooks violations detected:\n');
  for (const err of errors) {
    console.error(`  • ${err}`);
  }
  console.error('');
  process.exit(1);
}
