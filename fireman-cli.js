#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const query_result_1 = require("./query-result");
const readLine = require("readline");
const rl = readLine.createInterface({
    input: process.stdin,
    output: process.stdout,
});
rl.on('line', (input) => __awaiter(this, void 0, void 0, function* () {
    if (input === 'exit')
        process.exit();
    console.log(yield query_result_1.query(input));
}));
//# sourceMappingURL=fireman-cli.js.map