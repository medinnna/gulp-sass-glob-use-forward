/* eslint-disable */
/**
 * Takes the incomming stream of files and outputs a new file containing a list of @imports rule in sass.
 */
import slash from 'slash';
import path from 'path';
import fs from 'fs';
import through from 'through2';
import { glob } from 'glob';

export default function () {
  var transform = function (file, env, cb) {
    // find all instances matching
    var contents = file.contents.toString('utf-8');

    // regex to match an @import that contains glob pattern
    var reg = /(@forward|@use)\s+["']([^"']+\*(\.scss|\.sass)?)["'](| as \*)?/;
    var result;

    while ((result = reg.exec(contents)) !== null) {
      var index = result.index;
      var importRule = result[0];
      var globPattern = result[2];
      var imports = [];
      let isAs = false;
      let asRule = '*';
      let isForward = false;

      if (importRule.indexOf(' as ') !== -1) {
        isAs = true;
        asRule = importRule.split(' as ').pop();
        asRule = asRule.replace(';', '');
      }

      if (importRule.indexOf('@forward') !== -1) {
        isForward = true;
      }

      var files = glob.sync(path.join(file.base, globPattern), {
        cwd: file.base
      });

      files.forEach(function (filename) {
        const extension = path.extname(filename).toLowerCase();

        // check if it is a sass file
        if (extension == '.scss' || extension == '.sass') {
          // we remove the parent file base path from the path we will output
          filename = path.normalize(filename);
          var base = path.join(path.normalize(file.base), '/');

          filename = filename.replace(base, '');
          const type = isForward ? '@forward' : '@use';
          let importPath = `${type} "${slash(filename)}"`;
          if (isAs) {
            importPath = `${importPath} as ${asRule}`;
          }

          if (extension == '.scss') {
            imports.push(`${importPath};`);
          } else {
            imports.push(`${importPath}`);
          }
        }
      });

      var replaceString = imports.join('\n');
      contents = contents.replace(importRule, replaceString);
      file.contents = new Buffer(contents);
    }

    cb(null, file);
  };
  return through.obj(transform);
};
