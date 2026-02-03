const { withAppBuildGradle } = require('@expo/config-plugins');

const withMonorepoAndroidFix = (config) => {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = applyMonorepoFix(config.modResults.contents);
    } else {
      console.warn('withMonorepoAndroidFix: Cannot patch build.gradle because it is not in Groovy');
    }
    return config;
  });
};

function applyMonorepoFix(buildGradle) {
  const pattern = /react\s*\{/g;
  
  // Code to inject inside the react { ... } block
  // We explicitly calculate paths and force the root and entryFile
  // This overrides any default logic that might come later in the block or plugin
  const fix = `
    // [Monorepo Fix Start]
    // Re-calculate project root (apps/child) from Gradle root (apps/child/android)
    def localProjectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()
    // Calculate Monorepo Root (root of the whole repo)
    def monorepoRoot = new File(localProjectRoot).getParentFile().getParentFile().getAbsolutePath()

    // 1. Set React Root to Monorepo Root so Metro runs in the correct context
    root = file(monorepoRoot)
    
    // 2. Point entryFile to the local proxy index.js
    // This provides a clean relative path (apps/child/index.js) for Metro
    entryFile = file("\${localProjectRoot}/index.js")
    
    // 3. Explicitly tell Metro where the config is
    extraPackagerArgs = ["--config", "\${localProjectRoot}/metro.config.js"]
    // [Monorepo Fix End]
`;

  // Insert the fix immediately after 'react {'
  return buildGradle.replace(pattern, `react {${fix}`);
}

module.exports = withMonorepoAndroidFix;
