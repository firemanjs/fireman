export declare const query: (queryString: string, callback?: (result: any, error: Error) => void) => Promise<any>;
export declare class Document {
    queryRef: string;
    id: string;
    collections: Collection[];
    data: any;
}
export declare class Collection {
    queryRef: string;
    id: string;
    get: () => any;
}
