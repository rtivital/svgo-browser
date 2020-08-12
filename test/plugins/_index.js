const FS = require('fs');
const PATH = require('path');
const { EOL } = require('os');

const regEOL = new RegExp(EOL, 'g');
const regFilename = /^(.*)\.(\d+)\.svg$/;
const SVGO = require(process.env.COVERAGE ? '../../lib-cov/svgo' : '../../lib/svgo');

describe('plugins tests', () => {
  FS.readdirSync(__dirname).forEach((file) => {
    const match = file.match(regFilename);
    let index;
    let name;

    if (match) {
      name = match[1];
      index = match[2];

      file = PATH.resolve(__dirname, file);

      it(`${name}.${index}`, () => readFile(file).then((data) => {
        const splitted = normalize(data).split(/\s*@@@\s*/);
        const orig = splitted[0];
        const should = splitted[1];
        const params = splitted[2];
        const plugins = {};
        let svgo;

        plugins[name] = params ? JSON.parse(params) : true;

        svgo = new SVGO({
          full: true,
          plugins: [plugins],
          js2svg: { pretty: true },
        });

        return svgo.optimize(orig, { path: file }).then((result) => {
          // FIXME: results.data has a '\n' at the end while it should not
          normalize(result.data).should.be.equal(should);
        });
      }));
    }
  });
});

function normalize(file) {
  return file.trim().replace(regEOL, '\n');
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    FS.readFile(file, 'utf8', (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}
