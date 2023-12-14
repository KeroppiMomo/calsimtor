import {UnionFlattedValues, IntRange, UnionValues} from "./utility-types";

export const CalculationMode = {
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
export type CalculationMode = UnionFlattedValues<typeof CalculationMode, "Reg">;

export enum AngleUnit {
    Deg = "Deg",
    Rad = "Rad",
    Gra = "Gra",
}
export function angleUnitToRad(unit: AngleUnit): number {
    switch (unit) {
        case AngleUnit.Deg: return Math.PI / 180;
        case AngleUnit.Rad: return 1;
        case AngleUnit.Gra: return Math.PI / 200;
        default: throw new Error("Invalid angle unit");
    }
}

export const DisplayDigitsKind = {
    Fix: "Fix",
    Sci: "Sci",
    Norm: "Norm",
} as const;
export const DisplayDigits = {
    Fix: (digits: IntRange<0, 10>) => ({ kind: DisplayDigitsKind.Fix, digits }),
    Sci: (digits: IntRange<1, 11>) => ({ kind: DisplayDigitsKind.Sci, digits }),
    Norm: (digits: 1 | 2) => ({ kind: DisplayDigitsKind.Norm, digits }),
};
export type DisplayDigits = ReturnType<UnionValues<typeof DisplayDigits>>;

export enum FractionFormat {
    Mixed = "Mixed",
    Improper = "Improper",
}

export enum ComplexFormat {
    Rectangular = "Rectangular",
    Polar = "Polar",
}

export class SetupSettings {
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

export class Variables {
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
export type VariableName = Exclude<keyof Variables, "equals">;

export class Context {
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
