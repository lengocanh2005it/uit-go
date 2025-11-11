const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const protoDir = path.join(__dirname, '../proto');
const outDir = path.join(__dirname, '../libs/common/src/proto');
const pluginPath = path.join(
  __dirname,
  '../node_modules/.bin/protoc-gen-ts_proto.cmd',
);

fs.readdirSync(protoDir)
  .filter((f) => f.endsWith('.proto'))
  .forEach((file) => {
    const protoPath = path.join(protoDir, file);
    console.log('Generating:', protoPath);
    execSync(
      `cmd /c "npx protoc --plugin=protoc-gen-ts_proto=${pluginPath} --ts_proto_out=${outDir} --ts_proto_opt=nestJs=true,useDate=true -I ${protoDir} ${protoPath}"`,
      { stdio: 'inherit' },
    );
  });
