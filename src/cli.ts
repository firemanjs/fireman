#!/usr/bin/env node

import {query} from './query';

import * as readLine from "readline";

const rl = readLine.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.on('line', async (input): Promise<void> => {
    if (input === 'exit') process.exit();

    console.log(await query(input));
});