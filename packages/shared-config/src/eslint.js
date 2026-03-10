export function createAppEslintConfig(options = {}) {
  const {
    js,
    prettier,
    pluginPrettierRecommended,
    appRoot = "",
    includeSharedBase = true,
    browserGlobals = {},
    nodeGlobals = {},
  } = options;

  const withRoot = (pattern) => (appRoot ? `${appRoot}/${pattern}` : pattern);

  const config = [];

  if (includeSharedBase) {
    config.push(
      {
        ignores: [
          "**/node_modules/",
          "**/dist/",
          "**/build/",
          ".git/",
          "**/*.min.js",
          "**/*.ejs",
        ],
      },
      js.configs.recommended,
      pluginPrettierRecommended,
      prettier,
    );
  }

  config.push(
    {
      files: [withRoot("public/**/*.js")],
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "script",
        globals: {
          document: "readonly",
          window: "readonly",
          localStorage: "readonly",
          console: "readonly",
          ...browserGlobals,
        },
      },
    },
    {
      files: [withRoot("**/*.js")],
      ignores: [withRoot("public/**/*.js")],
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        globals: {
          __dirname: "readonly",
          process: "readonly",
          console: "readonly",
          ...nodeGlobals,
        },
      },
    },
  );

  return config;
}
