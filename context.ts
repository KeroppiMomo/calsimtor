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

class SetupSettings {
    angle: AngleUnit = AngleUnit.Deg;
    displayDigits: DisplayDigits = DisplayDigits.Norm(2);
    fractionFormat: FractionFormat = FractionFormat.Mixed;
    complexFormat: ComplexFormat = ComplexFormat.Rectangular;
    frequencyOn: boolean = true;

    constructor(options: Partial<SetupSettings> = {}) {
        Object.assign(this, options);
    }

    equals(other: SetupSettings): boolean {
        return this.angle === other.angle
            && this.displayDigits.kind === other.displayDigits.kind
            && this.displayDigits.digits === other.displayDigits.digits
            && this.fractionFormat === other.fractionFormat
            && this.complexFormat === other.complexFormat
            && this.frequencyOn === other.frequencyOn;
    }
}

class Variables {
    A = 0;
    B = 0;
    C = 0;
    D = 0;
    X = 0;
    Y = 0;
    M = 0;
    Ans = 0;

    constructor(options: Partial<Variables> = {}) {
        Object.assign(this, options);
    }

    equals(other: Variables): boolean {
        return this.A === other.A
            && this.B === other.B
            && this.C === other.C
            && this.D === other.D
            && this.X === other.X
            && this.Y === other.Y
            && this.M === other.M
            && this.Ans === other.Ans;
    }
};
type VariableName = Exclude<keyof Variables, "equals">;

class Context {
    mode: CalculationMode = CalculationMode.Comp;
    setupSettings: SetupSettings = new SetupSettings();
    variables: Variables = new Variables();

    constructor(options: Partial<Context> = {}) {
        Object.assign(this, options);
    }

    equals(other: Context): boolean {
        return this.mode === other.mode
            && this.setupSettings.equals(other.setupSettings)
            && this.variables.equals(other.variables);
    }
}
