const fs = require('fs');

const ufcFile = '/home/claw/projects/advl/advl-app/packages/core/src/features/canvas/UserFlowCanvas.tsx';
let ufc = fs.readFileSync(ufcFile, 'utf8');

ufc = ufc.replace(/export function DCMArchCanvas\(\) \{/, `
function nodeColorFn(node: { type?: string }): string {
  if (node.type === 'useCaseNode') return '#818cf8'
  if (node.type === 'functionNode') return '#a78bfa'
  return '#34d399'
}

export function DCMArchCanvas() {`);

// Just remove the duplicate declaration block exactly
ufc = ufc.replace(/  function nodeColorFn\(node: \{ type\?: string \}\): string \{\n    if \(node\.type === 'useCaseNode'\) return '#818cf8'\n    if \(node\.type === 'functionNode'\) return '#a78bfa'\n    return '#34d399'\n  \}\n/, '');

fs.writeFileSync(ufcFile, ufc);
