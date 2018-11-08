import {Collection} from "./collection";
import {DocumentReference, CollectionReference, DocumentSnapshot} from "@google-cloud/firestore";

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
      const collections: CollectionReference[] = await reference.getCollections();
      return collections.map((collection: CollectionReference) => {
        return Collection.fromCollectionReference(collection);
      });
    };
    return document;
  }

  setData(snapshot: DocumentSnapshot, specificProperties: string[]): void {
    this.data = {};
    let snapshotData: any = snapshot.data();
    if (specificProperties && specificProperties.length > 0) {
      specificProperties.forEach(p => {
        if (snapshotData.hasOwnProperty(p)) {
          this.data[p] = snapshotData[p];
        }
      });
    } else {
      this.data = snapshotData;
    }
  }

}