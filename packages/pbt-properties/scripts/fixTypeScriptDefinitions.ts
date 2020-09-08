import * as fs from 'fs';

const fixTypeScriptDefinition = (moduleFormat: string): void => {
  const propertyDefinitionPath = __dirname + `/../lib/${moduleFormat}/Property.d.ts`;

  const fileText = fs.readFileSync(propertyDefinitionPath, { encoding: 'utf8' });

  const searchString =
    'export declare const property: <TGens extends Gens>(...args_0: TGens, args_1: PropertyFunction<TGens>) => Property<TGens>;';
  const replaceString =
    'export declare const property: <TGens extends Gens>(...args: [...TGens, PropertyFunction<TGens>]) => Property<TGens>;';

  if (fileText.indexOf(searchString) === -1) {
    throw new Error('Bad generated declaration not detected');
  }

  fs.writeFileSync(propertyDefinitionPath, fileText.replace(searchString, replaceString));
};

fixTypeScriptDefinition('cjs');
fixTypeScriptDefinition('esm');
