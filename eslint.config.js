import js from '@eslint/js';
import globals from 'globals';
export default [js.configs.recommended, { files:['**/*.js','**/*.mjs'], languageOptions:{globals:{...globals.browser,...globals.node}}, rules:{'no-unused-vars':['error',{caughtErrors:'none'}]} }];
