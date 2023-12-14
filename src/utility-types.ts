// typescript magic
export type UnionValues<TObj> = TObj[keyof TObj];
export type UnionFlattedValues<TObj, Key extends keyof TObj> = UnionValues<Omit<TObj, Key>> | UnionValues<TObj[Key]>;
export type Enumerate<N extends number, Arr extends number[] = []> = Arr["length"] extends N ? Arr[number] : Enumerate<N, [...Arr, Arr["length"]]>;
export type IntRange<Start extends number, End extends number> = Exclude<Enumerate<End>, Enumerate<Start>>;

