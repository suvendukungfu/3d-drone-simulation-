// Quick script to parse the Pluto Blast View GLB and dump all node names
// GLB format: 12-byte header, then JSON chunk, then binary chunk
// We only need the JSON chunk to get node names.

const fs = require('fs');
const path = require('path');

const glbPath = path.join(__dirname, 'public/models/Pluto Blast View.glb');
const buf = fs.readFileSync(glbPath);

// GLB Header: magic(4) + version(4) + length(4) = 12 bytes
// Chunk 0: chunkLength(4) + chunkType(4) + chunkData(chunkLength)
const chunkLength = buf.readUInt32LE(12);
const chunkType = buf.readUInt32LE(16);

if (chunkType !== 0x4E4F534A) { // "JSON" in little-endian
  console.error('First chunk is not JSON!');
  process.exit(1);
}

const jsonStr = buf.toString('utf8', 20, 20 + chunkLength);
const gltf = JSON.parse(jsonStr);

console.log('=== GLTF NODES ===');
console.log(`Total nodes: ${gltf.nodes ? gltf.nodes.length : 0}`);
console.log('');

if (gltf.nodes) {
  const named = gltf.nodes.filter(n => n.name);
  console.log(`Named nodes: ${named.length}`);
  console.log('');
  
  // Print all named nodes
  console.log('=== ALL NAMED NODES ===');
  named.forEach((node, i) => {
    const hasMesh = node.mesh !== undefined;
    const idx = gltf.nodes.indexOf(node);
    console.log(`[${idx}] ${hasMesh ? 'MESH' : 'GROUP'} "${node.name}"`);
  });
  
  console.log('');
  console.log('=== MESH NODES ONLY ===');
  const meshNodes = named.filter(n => n.mesh !== undefined);
  meshNodes.forEach(n => {
    console.log(`  "${n.name}"`);
  });
  
  console.log('');
  console.log('=== GROUP NODES ONLY ===');
  const groupNodes = named.filter(n => n.mesh === undefined);
  groupNodes.forEach(n => {
    console.log(`  "${n.name}"`);
  });
}

// Also check mesh names in the meshes array
if (gltf.meshes) {
  console.log('');
  console.log('=== GLTF MESHES ===');
  gltf.meshes.forEach((m, i) => {
    if (m.name) console.log(`  [${i}] "${m.name}"`);
  });
}
