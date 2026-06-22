const fs = require('fs');
const path = require('path');

function inspectMaterials(fileName) {
  const glbPath = path.join(__dirname, 'public', fileName);
  if (!fs.existsSync(glbPath)) {
    console.error(`File does not exist: ${glbPath}`);
    return;
  }

  const buffer = fs.readFileSync(glbPath);
  const chunkLength = buffer.readUInt32LE(12);
  const jsonBuffer = buffer.subarray(20, 20 + chunkLength);
  const gltf = JSON.parse(jsonBuffer.toString('utf8'));

  console.log(`\n==========================================`);
  console.log(`Model: ${fileName}`);
  console.log(`==========================================`);

  if (!gltf.materials) {
    console.log('No materials found.');
    return;
  }

  console.log(`Found ${gltf.materials.length} materials.`);
  gltf.materials.forEach((mat, idx) => {
    const pbr = mat.pbrMetallicRoughness || {};
    const baseColor = pbr.baseColorFactor;
    const alphaMode = mat.alphaMode || 'OPAQUE';
    const alphaCutoff = mat.alphaCutoff !== undefined ? mat.alphaCutoff : 0.5;

    // Check if material is transparent or has low alpha
    const isLowAlpha = baseColor && baseColor[3] < 0.9;
    
    if (isLowAlpha || alphaMode !== 'OPAQUE') {
      console.log(`Material [${idx}] "${mat.name || 'unnamed'}":`);
      console.log(`  Alpha Mode: ${alphaMode}`);
      if (baseColor) console.log(`  Base Color Factor: ${JSON.stringify(baseColor)}`);
      if (mat.alphaCutoff !== undefined) console.log(`  Alpha Cutoff: ${alphaCutoff}`);
    }
  });
}

inspectMaterials('models/plutox.glb');
inspectMaterials('PlutoX [Primus X2 v1].glb');
