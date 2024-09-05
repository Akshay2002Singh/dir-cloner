# Dir-Cloner

**Dir-Cloner** is a command-line tool for cloning directory structures into a JSON format, allowing you to selectively copy file contents, skip specific files or directories, and rebuild directory structures from the JSON file. This tool is particularly useful for replicating directory structures while avoiding large audio or video files or customizing the contents to be copied.

## Features

- **Clone a Directory**: Creates a JSON representation of the directory structure, including file and directory names. The JSON includes fields to indicate whether to copy file contents and whether to skip specific files or directories. Audio and video files are automatically excluded during the cloning process.
- **Selective Content Copying**: You can rerun a command to copy the contents of files that are marked for content copying in a separate JSON file. This keeps the main JSON file easier to edit manually.
- **Rebuild Directory**: Rebuild the directory structure from the JSON, optionally including file contents. The rebuild process only creates directories and files if they do not already exist.

## Installation

To install **Dir-Cloner**, ensure you have [Node.js](https://nodejs.org/) installed, and then use npm to install the tool globally:

```bash
npm install -g dir-cloner
```

This will make the dir-cloner command available globally on your system.

## Usage

### 1. Clone a Directory

The `clone` command generates a JSON file that represents the structure of a directory. By default, audio and video files will not have their contents copied.

```bash
dir-cloner clone -s /path/to/source/directory -o /path/to/output.json
```

- `-s, --source`: Path to the source directory to be cloned.
- `-o, --output`: Path to the output JSON file.

### 2. Edit the JSON

You can manually edit the generated JSON file to customize the structure:

- Set `"skip": true` to skip a file or directory during the rebuild.
- Set `"copyContent": true or "copyContent": false` to control whether the content of a file should be copied.

### 3. Copy Content of Files

Once the JSON file is configured, use the `copy-content` command to copy the contents of files that are marked for content copying. This command saves the content in a separate JSON file to keep the main JSON easier to manage.

```bash
dir-cloner copy-content -i /my/config/folder-structure.json -s /my/source/folder -o /my/config/updated-folder-structure.json
```

- `-i, --input`: Path to the JSON file.
- `-s, --source`: Path to the original source directory (used during cloning).
- `-d, --destination`: Path to the output JSON file where updated content will be saved.
- `-v, --verbose`: Enable verbose logging (optional).

### 4. Rebuild the Directory

The `rebuild` command reconstructs the directory structure from the JSON file. This will create directories and files as specified in the JSON. The content will be copied from a separate JSON file if it was previously done using the `copy-content` command.

```bash
dir-cloner rebuild -i /path/to/folder-structure.json -c /path/to/file-contents.json -d /path/to/destination
```

- `-i, --input`: Path to the JSON file with directory structure.
- `-c, --content`: Path to the JSON file with file contents.
- `-d, --destination`: Path to the destination directory where the structure will be rebuilt.
- `-o, --overwrite`: Overwrite existing files with content from JSON (optional, default: false).
- `-v, --verbose`: Enable verbose logging (optional).

## Example Workflow
Follow these steps to clone, customize, and rebuild a directory structure:

1. Clone the directory:
```bash
dir-cloner clone -s /my/source/folder -o /my/config folder-structure.json
```
This command creates a JSON file representing the structure of `/my/source/folder`.

2. Edit the JSON: Open `/my/config/folder-structure.json` and modify it according to your requirements. For example, set `"skip": true` for files you want to exclude or `"copyContent": true` for files you want to include content.

3. Copy contents of specific files:
```bash
dir-cloner copy-content -i /my/config/folder-structure.json -s /my/source/folder -o /my/config/file-contents.json
```
This copies the contents of files marked with `"copyContent": true` from the source and saves the updated JSON to the specified output file.

4. Rebuild the directory structure:
```bash
dir-cloner rebuild -i /my/config/folder-structure.json -c /my/config/file-contents.json -d /my/target/folder -o -v
```
This reconstructs the directory structure in `/my/target/` folder as defined in the JSON file, and copies the file contents from the separate JSON file.

## Contributing
Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Commit your changes with clear and descriptive messages.
4. Push to your fork and submit a pull request.

## Support
If you encounter any issues or have questions, feel free to open an issue on GitHub.

## License
This project is licensed under the MIT License.