const fs = require('fs');
const path = require('path');

// Target GLB model path
const glbPath = path.join(__dirname, 'public', 'models', 'plutox.glb');

function inspectGLB() {
  try {
    if (!fs.existsSync(glbPath)) {
      console.error(`File does not exist: ${glbPath}`);
      return;
    }

    const buffer = fs.readFileSync(glbPath);
    
    // Read Header
    const magic = buffer.readUInt32LE(0);
    const version = buffer.readUInt32LE(4);
    const length = buffer.readUInt32LE(8);

    console.log(`==========================================`);
    console.log(`GLB Magic: 0x${magic.toString(16)} (Expected: 0x46544c67)`);
    console.log(`GLB Version: ${version} (Expected: 2)`);
    console.log(`Total Length: ${length} bytes`);

    // Read First Chunk (JSON)
    const chunkLength = buffer.readUInt32LE(12);
    const chunkType = buffer.readUInt32LE(16);

    console.log(`JSON Chunk Length: ${chunkLength} bytes`);

    if (chunkType !== 0x4e4f534a) {
      console.error('Error: First chunk is not JSON!');
      return;
    }

    const jsonBuffer = buffer.subarray(20, 20 + chunkLength);
    const jsonString = jsonBuffer.toString('utf8');
    const gltf = JSON.parse(jsonString);

    if (!gltf.nodes) {
      console.log('No nodes found in GLTF!');
      return;
    }

    // Extract all node names that are non-empty
    const nodeNames = gltf.nodes
      .map((node) => node.name)
      .filter((name) => name && name.trim() !== '');

    // De-duplicate
    const uniqueNames = Array.from(new Set(nodeNames));

    const outputPath = path.join(__dirname, 'node-names.txt');
    fs.writeFileSync(outputPath, uniqueNames.sort().join('\n'), 'utf8');
    console.log(`Successfully extracted ${uniqueNames.length} unique node names to ${outputPath}`);
    console.log(`==========================================`);
  } catch (error) {
    console.error('Failed to parse GLB:', error);
  }
}

inspectGLB();
