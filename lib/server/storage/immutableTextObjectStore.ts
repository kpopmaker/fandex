export type ImmutableTextObjectPutResult =
  | Readonly<{ status: 'created'; pathname: string }>
  | Readonly<{ status: 'idempotent-existing'; pathname: string }>
  | Readonly<{ status: 'conflict'; pathname: string }>;

export interface ImmutableTextObjectStore {
  readText(pathname: string): Promise<string | null>;
  listPathnames(prefix: string): Promise<readonly string[]>;
  putTextIfAbsent(
    pathname: string,
    body: string,
  ): Promise<ImmutableTextObjectPutResult>;
}
