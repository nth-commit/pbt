import * as fs from 'fs';

const fixTypeScriptDefinition = (moduleFormat: string): void => {
  const propertyDefinitionPath = __dirname + `/../lib/${moduleFormat}/Property.d.ts`;

  const fileText = fs.readFileSync(propertyDefinitionPath, { encoding: 'utf8' });

  const searchString =
    'export declare const property: <TGens extends import("pbt-core").Gen<any>[]>(...args_0: TGens, args_1: PropertyFunction<GenValues<TGens>>) => Property<GenValues<TGens>>;';
  const replaceString =
    'export declare const property: <TGens extends import("pbt-core").Gen<any>[]>(...args: [...TGens, PropertyFunction<GenValues<TGens>>]) => Property<GenValues<TGens>>;';

  if (fileText.indexOf(searchString) === -1) {
    throw new Error('Bad generated declaration not detected');
  }

  fs.writeFileSync(propertyDefinitionPath, fileText.replace(searchString, replaceString));
};

fixTypeScriptDefinition('cjs');
fixTypeScriptDefinition('esm');
