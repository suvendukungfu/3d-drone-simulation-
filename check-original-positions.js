import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const glbPath = path.join(__dirname, 'public', 'models', 'plutox.glb');

function checkPositions() {
  try {
    const buffer = fs.readFileSync(glbPath);
    const chunkLength = buffer.readUInt32LE(12);
    const jsonBuffer = buffer.subarray(20, 20 + chunkLength);
    const gltf = JSON.parse(jsonBuffer.toString('utf8'));

    const interestingNodes = [
      'canopy',
      'motor',
      'propeller',
      'guard',
      'frame',
      'pcb',
      'battery'
    ];

    console.log("Original Nodes with translations in GLB:");
    gltf.nodes.forEach((node, index) => {
      if (node.name) {
        const matches = interestingNodes.some(term => node.name.toLowerCase().includes(term));
        if (matches && (node.translation || node.matrix)) {
          console.log(`Node [${index}]: "${node.name}"`);
          if (node.translation) console.log(`  Translation: ${JSON.stringify(node.translation)}`);
          if (node.matrix) console.log(`  Matrix (first 4): ${JSON.stringify(node.matrix.slice(0, 4))}...`);
        }
      }
    });

  } catch (error) {
    console.error(error);
  }
}

checkPositions();
