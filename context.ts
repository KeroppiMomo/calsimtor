// typescript magic
type UnionValues<TObj> = TObj[keyof TObj];
type UnionFlattedValues<TObj, Key extends keyof TObj> = UnionValues<Omit<TObj, Key>> | UnionValues<TObj[Key]>;
type Enumerate<N extends number, Arr extends number[] = []> = Arr["length"] extends N ? Arr[number] : Enumerate<N, [...Arr, Arr["length"]]>;
type IntRange<Start extends number, End extends number> = Exclude<Enumerate<End>, Enumerate<Start>>;

const CalculationMode = {
    Comp: { index: 1 },
    Cmplx: { index: 2 },
    Base: { index: 3 },
    SD: { index: 4 },
    Reg: {
        Lin: { index: 5, subIndex: 1 },
        Log: { index: 5, subIndex: 2 },
        Exp: { index: 5, subIndex: 3 },
        Pwr: { index: 5, subIndex: 4 },
        Inv: { index: 5, subIndex: 5 },
        Quad: { index: 5, subIndex: 6 },
        ABExp: { index: 5, subIndex: 7 },
    },
} as const;
type CalculationMode = UnionFlattedValues<typeof CalculationMode, "Reg">;

enum AngleUnit {
    Deg = "Deg",
    Rad = "Rad",
    Gra = "Gra",
}
function angleUnitToRad(unit: AngleUnit): number {
    switch (unit) {
        case AngleUnit.Deg: return Math.PI / 180;
        case AngleUnit.Rad: return 1;
        case AngleUnit.Gra: return Math.PI / 200;
        default: throw new Error("Invalid angle unit");
    }
}

const DisplayDigitsKind = {
    Fix: "Fix",
    Sci: "Sci",
    Norm: "Norm",
} as const;
const DisplayDigits = {
    Fix: (digits: IntRange<0, 10>) => ({ kind: DisplayDigitsKind.Fix, digits }),
    Sci: (digits: IntRange<1, 11>) => ({ kind: DisplayDigitsKind.Sci, digits }),
    Norm: (digits: 1 | 2) => ({ kind: DisplayDigitsKind.Norm, digits }),
};
type DisplayDigits = ReturnType<UnionValues<typeof DisplayDigits>>;

enum FractionFormat {
    Mixed = "Mixed",
    Improper = "Improper",
}

enum ComplexFormat {
    Rectangular = "Rectangular",
    Polar = "Polar",
}

type SetupSettings = {
    angle: AngleUnit,
    displayDigits: DisplayDigits,
    fractionFormat: FractionFormat,
    complexFormat: ComplexFormat,
    frequencyOn: boolean,
};
const defaultSetupSettings: SetupSettings = {
    angle: AngleUnit.Deg,
    displayDigits: DisplayDigits.Norm(2),
    fractionFormat: FractionFormat.Mixed,
    complexFormat: ComplexFormat.Rectangular,
    frequencyOn: true,
};

type Variables = {
    A: number,
    B: number,
    C: number,
    D: number,
    X: number,
    Y: number,
    M: number,
    Ans: number,
};
const defaultVariables: Variables = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    X: 0,
    Y: 0,
    M: 0,
    Ans: 0,
};

type Context = {
    mode: CalculationMode,
    setupSettings: SetupSettings,
    variables: Variables,
};
const defaultContext: Context = {
    mode: CalculationMode.Comp,
    setupSettings: defaultSetupSettings,
    variables: defaultVariables,
};
