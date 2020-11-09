require('pbt-jest');
const fc = require('fast-check');
const pbt = require('pbt');

const fastCheckRuns = process.env.fastCheckRuns ? Number(process.env.fastCheckRuns) : undefined;

fc.configureGlobal({ numRuns: fastCheckRuns });
pbt.defaultConfig({ iterations: fastCheckRuns })