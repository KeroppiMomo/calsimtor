class TokenType {
    source: string;
    shown: string;

    constructor(source: string, shown?: string) {
        this.source = source;
        this.shown = shown ?? source;
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

const literalTokenTypes = {
    num0: new TokenType("0"),
    num1: new TokenType("1"),
    num2: new TokenType("2"),
    num3: new TokenType("3"),
    num4: new TokenType("4"),
    num5: new TokenType("5"),
    num6: new TokenType("6"),
    num7: new TokenType("7"),
    num8: new TokenType("8"),
    num9: new TokenType("9"),

    exp: new TokenType("E"),
    dot: new TokenType("."),
};

const valuedTokenTypes = {
    pi: new ValuedTokenType("pi", "π", 3.141_592_653_589_8),
    e: new ValuedTokenType("e", 2.718_281_828_459_04),

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

    // asD: new TokenType("asD", "°"),
    // asR: new TokenType("asR", "ʳ"),
    // asG: new TokenType("asG", "ᵍ"),
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
    sin: new ParenFuncTokenType("sin(", 1, (_, __, x) => {
        // TODO
        return Math.sin(x)
    }),
    asin: new ParenFuncTokenType("asin(", "sin^-1(", 1, (_, __, x) => Math.asin(x)),
    sinh: new ParenFuncTokenType("sinh(", 1, (_, __, x) => Math.sinh(x)),
    asinh: new ParenFuncTokenType("asinh(", "sinh^-1(", 1, (_, __, x) => Math.asinh(x)),
    cos: new ParenFuncTokenType("cos(", 1, (_, __, x) => Math.cos(x)),
    acos: new ParenFuncTokenType("acos(", "cos^-1(", 1, (_, __, x) => Math.acos(x)),
    cosh: new ParenFuncTokenType("cosh(", 1, (_, __, x) => Math.cosh(x)),
    acosh: new ParenFuncTokenType("acosh(", "cosh^-1(", 1, (_, __, x) => Math.acosh(x)),
    tan: new ParenFuncTokenType("tan(", 1, (_, __, x) => Math.tan(x)),
    atan: new ParenFuncTokenType("atan(", "tan^-1(", 1, (_, __, x) => Math.atan(x)),
    tanh: new ParenFuncTokenType("tanh(", 1, (_, __, x) => Math.tanh(x)),
    atanh: new ParenFuncTokenType("atanh(", "tanh^-1(", 1, (_, __, x) => Math.atanh(x)),
    // TODO
    polar: new ParenFuncTokenType("Pol(", 2, (_, __, x, y) => {
        return Math.sqrt(x*x + y*y);
    }),
    rect: new ParenFuncTokenType("Rec(", 2, (_, __, r, theta) => {
        return r*Math.cos(theta);
    }),
    rnd: new ParenFuncTokenType("Rnd(", 1, (_, __, x) => Math.round(x)),
    abs: new ParenFuncTokenType("Abs(", 1, (_, __, x) => Math.abs(x)),
    openBracket: new ParenFuncTokenType("(", 1, (_, __, x) => x),
};

const expressionTokenTypes = {
    ...literalTokenTypes,
    ...valuedTokenTypes,
    ...suffixFuncTokenTypes,
    ...parenFuncTokenTypes,

    frac: new TokenType("/", "┘"),

    power: new TokenType("^("),

    root: new TokenType("rt(", "x√"),

    neg: new TokenType("neg", "-"),
    varA: new TokenType("A"),

    deg: new TokenType("deg", "°"),
    varB: new TokenType("B"),

    varC: new TokenType("C"),

    varD: new TokenType("D"),

    closeBracket: new TokenType(")"),
    varX: new TokenType("X"),

    comma: new TokenType(","),
    varY: new TokenType("Y"),

    mPlus: new TokenType("M+"),
    mMinus: new TokenType("M-"),
    varM: new TokenType("M"),

    plus: new TokenType("+"),
    minus: new TokenType("-"),
    multiply: new TokenType("*"),
    divide: new TokenType("div", "÷"),

    permutation: new TokenType("Per", "𝐏"),
    combination: new TokenType("Com", "𝐂"),

    ans: new TokenType("Ans"),
};


const programTokenTypes = {
    clrMemory: new TokenType("ClrMemory"),

    prompt: new TokenType("?"),
    assign: new TokenType("->", "→"),
    separator: new TokenType(":", ": "),
    disp: new TokenType("disp", "◢ "),
    fatArrow: new TokenType("=>", "⇒"),
    eq: new TokenType("="),
    neq: new TokenType("<>", "≠"),
    greater: new TokenType(">"),
    less: new TokenType("<"),
    geq: new TokenType(">=", "≥"),
    leq: new TokenType("<=", "≤"),
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
