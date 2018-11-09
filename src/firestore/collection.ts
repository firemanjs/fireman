import {Document} from "./document";
import {CollectionReference} from "@google-cloud/firestore";

export class Collection {
  public queryRef: string;
  public id: string;
  public get: () => Document[];

  static fromCollectionReference(reference: CollectionReference): Collection {
    const collection: Collection = new Collection();
    collection.id = reference.id;
    collection.queryRef = reference.path;
    // TODO collection.get = () => reference.listDocuments();
    return collection;
  }
}
