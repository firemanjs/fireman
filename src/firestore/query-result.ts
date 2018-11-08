import {Document} from "./document";

export class QueryResult {
  constructor(public data: Document[], public documentExpression: boolean) {
  }
}