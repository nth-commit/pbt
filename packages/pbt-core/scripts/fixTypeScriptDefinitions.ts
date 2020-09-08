import * as fs from 'fs';

const fixTypeScriptDefinition = (moduleFormat: string): void => {
  const propertyDefinitionPath = __dirname + `/../lib/${moduleFormat}/GenInstance.d.ts`;

  const fileText = fs.readFileSync(propertyDefinitionPath, { encoding: 'utf8' });

  const searchString =
    'const mapMany: <TGenInstances extends GenInstances, TResult>(...args_0: TGenInstances, args_1: GenInstanceMapper<TGenInstances>) => GenInstance<TResult>;';
  const replaceString =
    'const mapMany: <TGenInstances extends GenInstances, TResult>(...args: [...TGenInstances, GenInstanceMapper<TGenInstances>]) => GenInstance<TResult>;';

  if (fileText.indexOf(searchString) === -1) {
    throw new Error('Bad generated declaration not detected');
  }

  fs.writeFileSync(propertyDefinitionPath, fileText.replace(searchString, replaceString));
};

fixTypeScriptDefinition('cjs');
fixTypeScriptDefinition('esm');
