class TokenType {
    source: string;
    shown: string;

    constructor(source: string, shown?: string) {
        this.source = source;
        this.shown = shown ?? source;
    }
}

class DigitTokenType extends TokenType {
    constructor(public digit: number) {
        super(digit.toString());
    }
}

type ValuedFunc = (context: Context) => number;
class ValuedTokenType extends TokenType {
    fn: ValuedFunc;

    constructor(source: string, shown: string, fn: number);
    constructor(source: string, fn: number);
    constructor(source: string, shown: string, fn: ValuedFunc);
    constructor(source: string, fn: ValuedFunc);
    constructor(source: string, arg1: string | ValuedFunc | number, arg2?: ValuedFunc | number) {
        if (arg2 !== undefined) {
            // 1st definiiton
            const shown = arg1 as string;
            super(source, shown);
            this.fn = (typeof arg2 === "number") ? (() => arg2) : arg2;
        } else {
            // 2nd definition
            super(source, undefined);
            this.fn = (typeof arg1 === "number") ? (() => arg1) : (arg1 as ValuedFunc);
        }
    }
}

class VariableTokenType extends ValuedTokenType {
    constructor(public varName: VariableName) {
        super(varName, (context) => context.variables[varName]);
    }
}

type ThrowMsg = (msg: string) => never;

type SuffixFunc = (throwMath: ThrowMsg, context: Context, x: number) => number;
class SuffixFuncTokenType extends TokenType {
    fn: SuffixFunc;

    constructor(source: string, shown: string, fn: SuffixFunc);
    constructor(source: string, fn: SuffixFunc);
    constructor(source: string, arg1: string | SuffixFunc, arg2?: SuffixFunc) {
        if (arg2 !== undefined) {
            // 1st definiiton
            const shown = arg1 as string;
            super(source, shown);
            this.fn = arg2;
        } else {
            // 2nd definition
            super(source, undefined);
            this.fn = arg1 as SuffixFunc;
        }
    }
}

type InfixFunc = (throwMath: ThrowMsg, context: Context, l: number, r: number) => number;
class InfixFuncTokenType extends TokenType {
    fn: InfixFunc;

    constructor(source: string, shown: string, fn: InfixFunc);
    constructor(source: string, fn: InfixFunc);
    constructor(source: string, arg1: string | InfixFunc, arg2?: InfixFunc) {
        if (arg2 !== undefined) {
            // 1st definiiton
            const shown = arg1 as string;
            super(source, shown);
            this.fn = arg2;
        } else {
            // 2nd definition
            super(source, undefined);
            this.fn = arg1 as InfixFunc;
        }
    }
}
class InfixParenFuncTokenType extends InfixFuncTokenType {
    stuff: boolean = true;
}

type ArrayOfLength<T, N extends number, Arr extends T[] = []> =
    Arr["length"] extends N
    ? Arr | (N extends Arr["length"]
        ? never
        : ArrayOfLength<T, Exclude<N, Arr["length"]>>
    ) : ArrayOfLength<T, N, [T, ...Arr]>

type ParenFuncArgNum = number | number[];
type ParenFunc<ArgNum extends ParenFuncArgNum> =
    ArgNum extends number[]
    ? ParenFunc<ArgNum[number]>
    : (ArgNum extends number
       // @ts-expect-error:
       // Typescript complains that this may be infinitely deep. I'm deferring the error when this type is actually used.
        ? (throwMath: ThrowMsg, context: Context, ...args: ArrayOfLength<number, ArgNum>) => number
        : never);

class ParenFuncTokenType<ArgNum extends ParenFuncArgNum> extends TokenType {
    argNum: ArgNum;
    fn: ParenFunc<ArgNum>;

   // @ts-expect-error:
   // Typescript complains that this may be infinitely deep. I'm deferring the error when this type is actually used.
    constructor(source: string, shown: string, argNum: ArgNum, fn: ParenFunc<ArgNum>);
    constructor(source: string, argNum: ArgNum, fn: ParenFunc<ArgNum>);
    constructor(source: string, arg1: string | ParenFuncArgNum, arg2: ParenFuncArgNum | ParenFunc<ArgNum>, arg3?: ParenFunc<ArgNum>) {
        if (arg3 !== undefined) {
            // 1st definiton
            const shown = arg1 as string;
            super(source, shown);
            this.argNum = arg2 as ArgNum;
            this.fn = arg3;
        } else {
            // 2nd definition
            super(source, undefined);
            this.argNum = arg1 as ArgNum;
            this.fn = arg2 as ParenFunc<ArgNum>;
        }
    }
}

const digitTokenTypes = {
    num0: new DigitTokenType(0),
    num1: new DigitTokenType(1),
    num2: new DigitTokenType(2),
    num3: new DigitTokenType(3),
    num4: new DigitTokenType(4),
    num5: new DigitTokenType(5),
    num6: new DigitTokenType(6),
    num7: new DigitTokenType(7),
    num8: new DigitTokenType(8),
    num9: new DigitTokenType(9),
};
const literalTokenTypes = {
    ...digitTokenTypes,

    exp: new TokenType("E"),
    dot: new TokenType("."),
};

const variableTokenTypes = {
    varA: new VariableTokenType("A"),
    varB: new VariableTokenType("B"),
    varC: new VariableTokenType("C"),
    varD: new VariableTokenType("D"),
    varX: new VariableTokenType("X"),
    varY: new VariableTokenType("Y"),
    varM: new VariableTokenType("M"),
    ans: new VariableTokenType("Ans"),
};

const valuedTokenTypes = {
    pi: new ValuedTokenType("pi", "π", 3.141_592_653_589_8),
    e: new ValuedTokenType("e", 2.718_281_828_459_04),

    ...variableTokenTypes,

    ran: new ValuedTokenType("Ran#", () => Math.floor(Math.random() * 1000) / 1000),

    massProton: new ValuedTokenType("mp", "m_p", 1.672_621_777e-27),
    massNeutron: new ValuedTokenType("mn", "m_n", 1.674_927_351e-27),
    massElectron: new ValuedTokenType("me", "m_e", 9.109_382_91e-31),
    massMuon: new ValuedTokenType("mmu", "m_μ", 1.883_531_475e-28),

    bohrRadius: new ValuedTokenType("a0", "a_0", 5.291_772_109_2e-11),
    planckConst: new ValuedTokenType("h", 6.626_069_57e-34),
    nuclearMagneton: new ValuedTokenType("muN", "μ_N", 5.050_783_53e-27),
    bohrMagneton: new ValuedTokenType("muB", "μ_B", 9.274_009_68e-24),

    reducedPlankConst: new ValuedTokenType("hbar", "ħ", 1.054_571_726e-34),
    fineStructureConst: new ValuedTokenType("alpha", "α", 7.297_352_569_8e-3),
    classicalElectronRadius: new ValuedTokenType("re", "r_e", 2.817_940_326_7e-15),
    comptonWavelength: new ValuedTokenType("lambdap", "λ_c", 2.426_310_238_9e-12),

    protonGyromagnticRatio: new ValuedTokenType("gammap", "γ_p", 2.675_222_005e-8),
    protonComptonWavelength: new ValuedTokenType("lambdacp", "λ_cp", 1.321_409_856_23e-15),
    neutronComptonWavelength: new ValuedTokenType("lambdacn", "λ_cn", 1.319_590_906_8e-15),
    RydbergConst: new ValuedTokenType("Rinf", "R_∞", 1.097_373_156_853_9e7),

    atomicUnitConst: new ValuedTokenType("u", 1.660_538_921e-27),
    protonMagneticMoment: new ValuedTokenType("mup", "μ_p", 1.410_606_743e-26),
    electronMagneticMoment: new ValuedTokenType("mue", "μ_e", -9.284_764_3e-24),
    neutronMagneticMoment: new ValuedTokenType("mun", "μ_n", -9.662_364_7e-27),

    muonMagneticMoment: new ValuedTokenType("mumu", "μ_μ", -9.662_364_7e-27),
    faradayConst: new ValuedTokenType("F", 96_485.336_5),
    elementaryCharge: new ValuedTokenType("eC", "𝑒", 1.602_176_565e-19), // e in Coloumb, that's the best way i could think of to distinguish from Euler constant
    avogadroConst: new ValuedTokenType("NA", "N_A", 6.022_141_29e23),

    boltzmannConst: new ValuedTokenType("k", 1.380_648_8e-23),
    idealGasMolarVolume: new ValuedTokenType("Vm", "V_m", 0.022_710_953),
    molarGasConst: new ValuedTokenType("R", 8.314_462_1),
    vacuumLightSpeed: new ValuedTokenType("c0", "c_0", 299_792_458),

    firstRadiationConst: new ValuedTokenType("c1", "c_1", 3.741_771_53e-16),
    secondRadiationConst: new ValuedTokenType("c2", "c_2", 0.014_387_77),
    stefanBoltzmannConst: new ValuedTokenType("sigma", "σ", 5.670_373e-8),
    electricConst: new ValuedTokenType("epsilon0", "ε_0", 8.854_187_817e-12),

    magneticConst: new ValuedTokenType("mu0", "μ_0", 1.256_637_061_4e-6),
    magneticFluxQuantum: new ValuedTokenType("phi0", "phi_0", 2.067_833_758e-15),
    gravitationalAccel: new ValuedTokenType("g", 9.806_65),
    conductanceQuantum: new ValuedTokenType("G0", "G_0", 7.748_091_734_6e-5),

    characteristicVacuumImpedance: new ValuedTokenType("Z0", "Z_0", 376.730_313_461),
    celsiusTemperature: new ValuedTokenType("t", 273.15),
    gravitationalConst: new ValuedTokenType("G", 6.673_84e-11),
    atmosphere: new ValuedTokenType("atm", 101_325),
};

const suffixFuncTokenTypes = {
    reciprocal: new SuffixFuncTokenType("^-1", "⁻¹", (throwMath, _, x) => {
        if (x === 0) throwMath("Division by 0");
        return 1/x;
    }),
    fact: new SuffixFuncTokenType("!", (throwMath, _, x) => {
        if (!Number.isInteger(x)) throwMath("Cannot take the factorial of a non-integer");
        if (x < 0) throwMath("Cannot take the factorial of a negative value");
        if (x > 69) throwMath("Cannot take the factorial of an integer larger than 69 (too large)");

        let ans = 1;
        for (let k = 2; k <= x; ++k) {
            ans *= k;
        }
        return ans;
    }),

    cube: new SuffixFuncTokenType("^3", "³", (_, __, x) => Math.pow(x,3)),

    square: new SuffixFuncTokenType("^2", "²", (_, __, x) => Math.pow(x,2)),

    percentage: new SuffixFuncTokenType("%", (_, __, x) => x/100),

    asD: new SuffixFuncTokenType("asD", "°", (_, context, x) => x * angleUnitToRad(AngleUnit.Deg) / angleUnitToRad(context.setupSettings.angle)),
    asR: new SuffixFuncTokenType("asR", "ʳ", (_, context, x) => x * angleUnitToRad(AngleUnit.Rad) / angleUnitToRad(context.setupSettings.angle)),
    asG: new SuffixFuncTokenType("asG", "ᵍ", (_, context, x) => x * angleUnitToRad(AngleUnit.Gra) / angleUnitToRad(context.setupSettings.angle)),
};

const relationTokenTypes = {
    eq: new InfixFuncTokenType("=", (_, __, l, r) => (l-r === 0) ? 1 : 0),
    neq: new InfixFuncTokenType("<>", "≠", (_, __, l, r) => (l-r !== 0) ? 1 : 0),
    greater: new InfixFuncTokenType(">", (_, __, l, r) => (l-r > 0) ? 1 : 0),
    less: new InfixFuncTokenType("<", (_, __, l, r) => (l-r < 0) ? 1 : 0),
    geq: new InfixFuncTokenType(">=", "≥", (_, __, l, r) => (l-r >= 0) ? 1 : 0),
    leq: new InfixFuncTokenType("<=", "≤", (_, __, l, r) => (l-r <= 0) ? 1 : 0),
};

function validatePerComArguments(n: number, r: number, throwMath: (msg: string) => void) {
    if (!Number.isInteger(n) || !Number.isInteger(r)) throwMath("n and r in nPr must be integer");
    if (!(0 <= r)) throwMath("r cannot be negative in nPr");
    if (!(r <= n)) throwMath("n must be no less than r in nPr");
    if (!(n < Math.pow(10, 10))) throwMath("n must be less than 10^10 in nPr");
}
const infixFuncTokenTypes = {
    ...relationTokenTypes,

    multiply: new InfixFuncTokenType("*", (_, __, l, r) => l*r),
    divide: new InfixFuncTokenType("div", "÷", (throwMath, __, l, r) => {
        if (r === 0) throwMath("Division by 0");
        return l/r;
    }),

    permutation: new InfixFuncTokenType("Per", "𝐏", (throwMath, _, n, r) => {
        validatePerComArguments(n, r, throwMath);

        let ans = 1;
        for (let k = 0; k < r; ++k) {
            ans *= n-k;
        }
        return ans;
    }),
    combination: new InfixFuncTokenType("Com", "𝐂", (throwMath, _, n, r) => {
        validatePerComArguments(n, r, throwMath);

        let ans = 1;
        for (let k = 0; k < r; ++k) {
            ans = ans * (n-k) / (k+1);
        }
        return ans;
    }),
};

const parenFuncTokenTypes = {
    cbrt: new ParenFuncTokenType("cbrt(", "³√(", 1, (_, __, x) => Math.cbrt(x)),
    sqrt: new ParenFuncTokenType("sqrt(", "√(", 1, (throwMath, _, x) => {
        if (x < 0) throwMath("Cannot take the square root of negative value");
        return Math.sqrt(x);
    }),
    log: new ParenFuncTokenType<[1,2]>("log(", [1,2], (throwMath: ThrowMsg, _: Context, arg2: number, arg3?: number) => {
        if (arg3 === undefined) {
            if (arg2 <= 0) throwMath("Cannot take the log of a non-positive value");
            return Math.log10(arg2);
        } else {
            if (arg2 == 1) throwMath("Base of log cannot be 1");
            if (arg2 <= 0) throwMath("Base of log cannot be non-positive");
            if (arg3 <= 0) throwMath("Cannot take the log of a non-positive value");
            return Math.log(arg3)/Math.log(arg2);
        }
    }),
    tenExp: new ParenFuncTokenType("10^(", 1, (_, __, x) => Math.pow(10, x)),
    ln: new ParenFuncTokenType("ln(", 1, (throwMath, _, x) => {
        if (x <= 0) throwMath("Cannot take the ln of a non-positive value");
        return Math.log(x)
    }),
    eExp: new ParenFuncTokenType("e^(", 1, (_, __, x) => Math.exp(x)),
    sin: new ParenFuncTokenType("sin(", 1, (throwMath, context, x) => {
        const range: number = {
            [AngleUnit.Deg]: 8_999_999_999.999_92,
            [AngleUnit.Rad]: 157_079_632.679_488,
            [AngleUnit.Gra]: 9_999_999_999.999_90,
        }[context.setupSettings.angle];
        if (Math.abs(x) > range) throwMath(`Cannot take the sin of a value with an absolute value greater than ${range} in this angle unit`);
        return Math.sin(x * angleUnitToRad(context.setupSettings.angle));
    }),
    asin: new ParenFuncTokenType("asin(", "sin^-1(", 1, (throwMath, context, x) => {
        if (Math.abs(x) > 1) throwMath("Cannot take the arcsin of a value with an absolute value greater than 1");
        return Math.asin(x) / angleUnitToRad(context.setupSettings.angle);
    }),
    sinh: new ParenFuncTokenType("sinh(", 1, (_, __, x) => Math.sinh(x)),
    asinh: new ParenFuncTokenType("asinh(", "sinh^-1(", 1, (_, __, x) => Math.asinh(x)),
    cos: new ParenFuncTokenType("cos(", 1, (throwMath, context, x) => {
        const range: number = {
            [AngleUnit.Deg]: 8_999_999_999.999_92,
            [AngleUnit.Rad]: 157_079_632.679_488,
            [AngleUnit.Gra]: 9_999_999_999.999_90,
        }[context.setupSettings.angle];
        if (Math.abs(x) > range) throwMath(`Cannot take the cos of a value with an absolute value greater than ${range} in this angle unit`);
        return Math.cos(x * angleUnitToRad(context.setupSettings.angle));
    }),
    acos: new ParenFuncTokenType("acos(", "cos^-1(", 1, (throwMath, context, x) => {
        if (Math.abs(x) > 1) throwMath("Cannot take the arccos of a value with an absolute value greater than 1");
        return Math.acos(x) / angleUnitToRad(context.setupSettings.angle);
    }),
    cosh: new ParenFuncTokenType("cosh(", 1, (_, __, x) => Math.cosh(x)),
    acosh: new ParenFuncTokenType("acosh(", "cosh^-1(", 1, (_, __, x) => Math.asinh(x)),
    tan: new ParenFuncTokenType("tan(", 1, (throwMath, context, x) => {
        const range: number = {
            [AngleUnit.Deg]: 8_999_999_999.999_92,
            [AngleUnit.Rad]: 157_079_632.679_488,
            [AngleUnit.Gra]: 9_999_999_999.999_90,
        }[context.setupSettings.angle];
        if (Math.abs(x) > range) throwMath(`Cannot take the tan of a value with an absolute value greater than ${range} in this angle unit`);

        const undefinedAt: number = {
            [AngleUnit.Deg]: 90,
            [AngleUnit.Rad]: 1.570_796_326_794_90,
            [AngleUnit.Gra]: 100,
        }[context.setupSettings.angle];
        const quotient = Math.round(x / undefinedAt);
        if (quotient % 2 === 1) {
            const closest = quotient * undefinedAt;
            if (x - closest === 0) throwMath(`Tan of this value is undefined`);
        }

        return Math.tan(x * angleUnitToRad(context.setupSettings.angle));
    }),
    atan: new ParenFuncTokenType("atan(", "tan^-1(", 1, (_, context, x) => {
        return Math.atan(x) / angleUnitToRad(context.setupSettings.angle);
    }),
    tanh: new ParenFuncTokenType("tanh(", 1, (_, __, x) => Math.tanh(x)),
    atanh: new ParenFuncTokenType("atanh(", "tanh^-1(", 1, (_, __, x) => Math.asinh(x)),
    polar: new ParenFuncTokenType("Pol(", 2, (throwMath, context, x, y) => {
        if (x === 0 && y === 0) throwMath("Cannot convert (0,0) to polar form");
        context.variables.Y = Math.atan2(y, x) / angleUnitToRad(context.setupSettings.angle);
        return context.variables.X = Math.sqrt(x*x + y*y);
    }),
    rect: new ParenFuncTokenType("Rec(", 2, (_, context, r, theta) => {
        const angleInRad = theta * angleUnitToRad(context.setupSettings.angle);
        context.variables.Y = r * Math.sin(angleInRad);
        return context.variables.X = r * Math.cos(angleInRad);
    }),
    rnd: new ParenFuncTokenType("Rnd(", 1, (_, context, x) => {
        const digits = context.setupSettings.displayDigits.digits;
        switch (context.setupSettings.displayDigits.kind) {
            case DisplayDigitsKind.Fix:
                const pow10 = Math.pow(10, digits);
                return Math.round(x * pow10) / pow10;
            case DisplayDigitsKind.Sci:
                return Number(x.toExponential(digits - 1));
            case DisplayDigitsKind.Norm:
                return Number(x.toExponential(9)); // round to 10 significant figures
        }
    }),
    abs: new ParenFuncTokenType("Abs(", 1, (_, __, x) => Math.abs(x)),
    openBracket: new ParenFuncTokenType("(", 1, (_, __, x) => x),
};

const expressionTokenTypes = {
    ...literalTokenTypes,
    ...valuedTokenTypes,
    ...suffixFuncTokenTypes,
    ...infixFuncTokenTypes,
    ...parenFuncTokenTypes,

    frac: new TokenType("/", "┘"),

    neg: new TokenType("neg", "-"),

    deg: new TokenType("deg", "°"),

    closeBracket: new TokenType(")"),

    comma: new TokenType(","),

    mPlus: new TokenType("M+"),
    mMinus: new TokenType("M-"),

    plus: new TokenType("+"),
    minus: new TokenType("-"),

    power: new InfixParenFuncTokenType("^(", (throwMath, _, l, r) => {
        // TODO deal with fractional power of negative number
        return Math.pow(l, r);
    }),

    root: new InfixParenFuncTokenType("rt(", "x√(", (throwMath, _, l, r) => {
        // TODO deal with fractional power of negative number
        return Math.pow(r, 1/l);
    }),

    clrMemory: new TokenType("ClrMemory"),
};

const setupTokenTypes = {
    degMode: new TokenType("Deg"),
    radMode: new TokenType("Rad"),
    graMode: new TokenType("Gra"),
    fixMode: new TokenType("Fix", "Fix "),
    sciMode: new TokenType("Sci", "Sci "),
    normMode: new TokenType("Norm", "Norm "),
    freqOn: new TokenType("FreqOn"),
    freqOff: new TokenType("FreqOff"),
};

const programTokenTypes = {

    ...setupTokenTypes,

    prompt: new TokenType("?"),
    assign: new TokenType("->", "→"),
    separator: new TokenType(":", ": "),
    disp: new TokenType("disp", "◢ "),
    fatArrow: new TokenType("=>", "⇒"),
    goto: new TokenType("Goto", "Goto "),
    lbl: new TokenType("Lbl", "Lbl "),
    while: new TokenType("While", "While "),
    whileEnd: new TokenType("WhileEnd"),
    next: new TokenType("Next"),
    break: new TokenType("Break"),
    for: new TokenType("For", "For "),
    to: new TokenType("To", " To "),
    step: new TokenType("Step", " Step "),
    else: new TokenType("Else", "Else "),
    ifEnd: new TokenType("IfEnd"),
    if: new TokenType("If", "If "),
    then: new TokenType("Then", "Then "),
};

const allTokenTypes = {
    ...expressionTokenTypes,
    ...programTokenTypes,
};
