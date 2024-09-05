#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const yargs = require('yargs');
const readline = require('readline');

const AUDIO_VIDEO_EXTENSIONS = ['.mp3', '.wav', '.mp4', '.avi', '.mov', '.mkv'];

const argv = yargs
  .command('clone', 'Clone directory structure into JSON', {
    source: {
      description: 'Source directory path',
      alias: 's',
      type: 'string',
      demandOption: true,
    },
    output: {
      description: 'Output JSON file path',
      alias: 'o',
      type: 'string',
      demandOption: true,
    },
  })
  .command('copy-content', 'Copy content for files marked in JSON', {
    input: {
      description: 'Input JSON file path',
      alias: 'i',
      type: 'string',
      demandOption: true,
    },
    source: {
      description: 'Source directory path (same as used for clone)',
      alias: 's',
      type: 'string',
      demandOption: true,
    },
    output: {
      description: 'Output JSON file path (to save content)',
      alias: 'o',
      type: 'string',
      demandOption: true,
    },
    verbose: {
      description: 'Enable verbose logging',
      alias: 'v',
      type: 'boolean',
      default: false,
    },
  })
  .command('rebuild', 'Rebuild directory from JSON', {
    input: {
      description: 'Input JSON file path',
      alias: 'i',
      type: 'string',
      demandOption: true,
    },
    destination: {
      description: 'Destination directory path',
      alias: 'd',
      type: 'string',
      demandOption: true,
    },
    content: {
      description: 'Data JSON file path',
      alias: 'c',
      type: 'string',
      default: false,
    },
    overwrite: {
      description: 'Overwrite existing files with content from JSON',
      alias: 'o',
      type: 'boolean',
      default: false,
    },
    verbose: {
      description: 'Enable verbose logging',
      alias: 'v',
      type: 'boolean',
      default: false,
    },
  })
  .demandCommand(1, 'You need at least one command before moving on')
  .help()
  .alias('help', 'h')
  .argv;

const isAudioVideoFile = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  return AUDIO_VIDEO_EXTENSIONS.includes(ext);
};

const handleError = (operation, err) => {
  console.error(`Error during ${operation}:`, err.message);
};

const cloneDirectoryToJson = (dirPath) => {
  const clone = (currentPath) => {
    let stat;
    try {
      stat = fs.statSync(currentPath);
    } catch (err) {
      handleError(`reading ${currentPath}`, err);
      return null;
    }
    if (stat.isDirectory()) {
      const dirName = path.basename(currentPath);
      if (dirName === 'node_modules' || dirName.startsWith('.')) {
        return null;
      }
      return {
        name: dirName,
        type: 'directory',
        skip: false,
        children: fs.readdirSync(currentPath)
          .map((child) => clone(path.join(currentPath, child)))
          .filter((child) => child !== null),
      };
    } else if (stat.isFile()) {
      if (isAudioVideoFile(currentPath)) {
        return null;
      }
      return {
        name: path.basename(currentPath),
        type: 'file',
        skip: false,
        copyContent: false,
        content: null,
      };
    }
  };

  return clone(dirPath);
};

const copyFileContentsToJson = (jsonNode, sourceDir, contentMap, verbose = false) => {
  if (jsonNode.type === 'file' && !jsonNode.skip) {
    const srcPath = path.join(sourceDir, jsonNode.name);
    // Compute relative path instead of using absolute path
    const relativePath = path.relative(path.dirname(sourceDir), srcPath);

    if (jsonNode.copyContent) {
      try {
        const content = fs.readFileSync(srcPath);
        contentMap[relativePath] = content.toString('base64');
        if (verbose) console.log(`Copied content from ${srcPath} to content map.`);
      } catch (err) {
        handleError(`copying content from ${srcPath}`, err);
      }
    }
  }

  if (jsonNode.type === 'directory' && !jsonNode.skip) {
    (jsonNode.children || []).forEach((child) => {
      copyFileContentsToJson(child, path.join(sourceDir, jsonNode.name), contentMap, verbose);
    });
  }
};

const promptUser = (question) => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
};

const rebuildDirectoryFromJson = async (json, destPath, contentMap, overwrite = false, verbose = false) => {
  const build = async (node, currentPath) => {
    const fullPath = path.join(currentPath, node.name);
    if (node.skip) return;

    if (node.type === 'directory') {
      try {
        fs.ensureDirSync(fullPath);
        if (verbose) console.log(`Directory created: ${fullPath}`);
        for (const child of node.children) {
          await build(child, fullPath);
        }
      } catch (err) {
        handleError(`creating directory ${fullPath}`, err);
      }
    } else if (node.type === 'file') {
      try {
        if (fs.existsSync(fullPath)) {
          if (overwrite) {
            const content = contentMap[path.relative(destPath, path.join(currentPath, node.name))];
            if (content) {
              fs.writeFileSync(fullPath, Buffer.from(content, 'base64'));
              if (verbose) console.log(`File overwritten with content at ${fullPath}`);
            }
          } else {
            const userResponse = await promptUser(`File ${fullPath} already exists. Overwrite content? (y/n): `);
            if (userResponse) {
              const content = contentMap[path.join(currentPath, node.name)];
              if (content) {
                fs.writeFileSync(fullPath, Buffer.from(content, 'base64'));
                if (verbose) console.log(`File overwritten with content at ${fullPath}`);
              }
            } else {
              if (verbose) console.log(`Skipped overwriting file at ${fullPath}`);
            }
          }
        } else {
          fs.ensureFileSync(fullPath);
          const content = contentMap[path.relative(destPath, path.join(currentPath, node.name))];
          if (content) {
            fs.writeFileSync(fullPath, Buffer.from(content, 'base64'));
            if (verbose) console.log(`File created with content at ${fullPath}`);
          }
        }
      } catch (err) {
        handleError(`writing file ${fullPath}`, err);
      }
    } else if (node.type === 'symlink') {
      try {
        fs.ensureSymlinkSync(node.target, fullPath);
        if (verbose) console.log(`Symlink created at ${fullPath} pointing to ${node.target}`);
      } catch (err) {
        handleError(`creating symlink ${fullPath}`, err);
      }
    }
  };

  await build(json, destPath);
};

const main = async () => {
  if (argv._.includes('clone')) {
    const sourcePath = path.resolve(argv.source);
    let outputPath = path.resolve(argv.output);
    if (!outputPath.endsWith('.json')) {
      // If it's not a `.json` file, append `directoryStructure.json` to the path
      outputPath = path.join(outputPath, 'directoryStructure.json');
    }
    try {
      const directoryJson = cloneDirectoryToJson(sourcePath);
      fs.writeJsonSync(outputPath, directoryJson, { spaces: 2 });
      console.log(`Directory structure has been cloned to ${outputPath}`);
    } catch (err) {
      handleError('cloning directory', err);
    }
  } else if (argv._.includes('copy-content')) {
    const inputPath = path.resolve(argv.input);
    const sourcePath = path.resolve(argv.source);
    // Remove the last directory (get the parent directory)
    const updatedSourcePath = path.dirname(sourcePath);
    const outputPath = path.resolve(argv.output);
    const verbose = argv.verbose;
    const contentMap = {};
    try {
      const directoryJson = fs.readJsonSync(inputPath);
      copyFileContentsToJson(directoryJson, updatedSourcePath, contentMap, verbose);
      fs.writeJsonSync(outputPath, contentMap, { spaces: 2 });
      console.log(`File contents have been copied and saved to ${outputPath}`);
    } catch (err) {
      handleError('copying content to JSON', err);
    }
  } else if (argv._.includes('rebuild')) {
    const inputPath = path.resolve(argv.input);
    const destPath = path.resolve(argv.destination);
    const overwrite = argv.overwrite;
    console.log(path.resolve(argv.content))
    const contentPath = path.resolve(argv.content);
    let content = fs.readJsonSync(contentPath) || {};
    console.log(content)
    const verbose = argv.verbose;
    try {
      const directoryJson = fs.readJsonSync(inputPath);
      await rebuildDirectoryFromJson(directoryJson, destPath, content, overwrite, verbose);
      console.log(`Directory has been rebuilt at ${destPath}`);
    } catch (err) {
      handleError('rebuilding directory from JSON', err);
    }
  }
};

main();
