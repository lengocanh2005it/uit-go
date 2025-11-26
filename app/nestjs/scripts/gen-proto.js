const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const protoDir = path.join(__dirname, '../proto');
const outDir = path.join(__dirname, '../libs/common/src/proto');

const isWin = process.platform === 'win32';
const pluginFile = isWin
  ? path.join(__dirname, '../node_modules/.bin/protoc-gen-ts_proto.cmd')
  : path.join(__dirname, '../node_modules/.bin/protoc-gen-ts_proto');

fs.readdirSync(protoDir)
  .filter((f) => f.endsWith('.proto'))
  .forEach((file) => {
    const protoPath = path.join(protoDir, file);
    console.log('Generating:', protoPath);

    const cmd = isWin
      ? `cmd /c "npx protoc --plugin=protoc-gen-ts_proto=${pluginFile} --ts_proto_out=${outDir} --ts_proto_opt=nestJs=true,useDate=true -I ${protoDir} ${protoPath}"`
      : `npx protoc --plugin=protoc-gen-ts_proto=${pluginFile} --ts_proto_out=${outDir} --ts_proto_opt=nestJs=true,useDate=true -I ${protoDir} ${protoPath}`;

    execSync(cmd, { stdio: 'inherit' });
  });
