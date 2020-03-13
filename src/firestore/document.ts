import {Collection} from "./collection";
import {CollectionReference, DocumentReference, DocumentSnapshot} from "@google-cloud/firestore";

export class Document {
  public queryRef: string;
  public id: string;
  public getCollections: () => Promise<Collection[]>;
  public data: any;

  static fromDocumentReference(reference: DocumentReference): Document {
    const document: Document = new Document();
    document.id = reference.id;
    document.queryRef = reference.path;
    document.getCollections = async () => {
      const collections: CollectionReference[] = await reference.listCollections();
      return collections.map((collection: CollectionReference) => {
        return Collection.fromCollectionReference(collection);
      });
    };
    return document;
  }

  setData(snapshot: DocumentSnapshot): void {
    this.data = snapshot.data();
  }

}
