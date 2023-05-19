const { defineConfig } = require('@covbot/configs/clean-publish');

module.exports = defineConfig({
    files: [
        'tests',
        'dtsBundleGenerator.config.json'
    ]
});