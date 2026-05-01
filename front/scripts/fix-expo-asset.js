const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'node_modules', 'expo-asset', 'build');

if (!fs.existsSync(buildDir)) {
  process.exit(0);
}

for (const fileName of fs.readdirSync(buildDir)) {
  if (!fileName.endsWith('.js')) {
    continue;
  }

  const filePath = path.join(buildDir, fileName);
  const current = fs.readFileSync(filePath, 'utf8');
  let desired = current.replace(/(from\s+['"])(\.\/[^'"]+?)(['"])/g, (match, prefix, specifier, suffix) => {
    if (/\.[a-z0-9]+$/i.test(specifier)) {
      return match;
    }

    return `${prefix}${specifier}.js${suffix}`;
  });

  desired = desired.replace(/import\s+(['"])(\.\/[^'"]+?)(['"]);/g, (match, prefix, specifier, suffix) => {
    if (/\.[a-z0-9]+$/i.test(specifier)) {
      return match;
    }

    return `import ${prefix}${specifier}.js${suffix};`;
  });

  desired = desired.replace(
    /@react-native\/assets-registry\/registry(['"])/g,
    '@react-native/assets-registry/registry.js$1'
  );

  if (current !== desired) {
    fs.writeFileSync(filePath, desired);
  }
}