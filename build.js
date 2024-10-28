const { minify } = require('terser');
const fs = require('fs');
const path = require('path');

// Files to process
const FILES = [
    { input: 'content.js', output: 'content.min.js' },
    { input: 'background.js', output: 'background.min.js' }
];

const OUTPUT_DIR = 'dist';

async function buildFile(inputFile, outputFile) {
    try {
        const code = fs.readFileSync(inputFile, 'utf8');
        const result = await minify(code, {
            compress: {
                dead_code: true,
                drop_console: true,
                drop_debugger: true,
                keep_classnames: true,
                keep_fnames: true
            },
            mangle: {
                keep_classnames: true,
                keep_fnames: true
            },
            format: {
                comments: false
            }
        });
        fs.writeFileSync(path.join(OUTPUT_DIR, outputFile), result.code);
        console.log(`Built ${outputFile} successfully!`);
    } catch (error) {
        console.error(`Failed to build ${outputFile}:`, error);
    }
}

async function copyManifest() {
    try {
        const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
        // Update manifest paths to use minified files
        manifest.content_scripts[0].js = ['content.min.js'];
        manifest.background.service_worker = 'background.min.js';

        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'manifest.json'),
            JSON.stringify(manifest, null, 2)
        );
        console.log('Manifest copied and updated successfully!');
    } catch (error) {
        console.error('Failed to copy manifest:', error);
    }
}

async function copyAssets() {
    try {
        // Copy image
        fs.copyFileSync('image.png', path.join(OUTPUT_DIR, 'image.png'));
        // Copy any other static files
        if (fs.existsSync('access_network_req.json')) {
            fs.copyFileSync(
                'access_network_req.json',
                path.join(OUTPUT_DIR, 'access_network_req.json')
            );
        }
        console.log('Assets copied successfully!');
    } catch (error) {
        console.error('Failed to copy assets:', error);
    }
}

async function build() {
    // Create dist directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR);
    }

    // Build all JS files
    for (const file of FILES) {
        await buildFile(file.input, file.output);
    }

    // Copy and update manifest
    await copyManifest();

    // Copy static assets
    await copyAssets();
}

build();
