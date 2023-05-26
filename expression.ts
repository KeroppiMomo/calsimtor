class TokenType {
    source: string;
    shown: string;

    constructor(source: string, shown?: string) {
        this.source = source;
        this.shown = shown ?? source;
    }
}

type ValuedFunc = () => number;
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

type SuffixFunc = (throwMath: ThrowMsg, x: number) => number;
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

type ParenFuncArgNum = number | number[];
type ParenFunc = (throwMath: ThrowMsg, ...args: number[]) => number;
class ParenFuncTokenType extends TokenType {
    argNum: ParenFuncArgNum;
    fn: ParenFunc;

    constructor(source: string, shown: string, argNum: ParenFuncArgNum, fn: ParenFunc);
    constructor(source: string, argNum: ParenFuncArgNum, fn: ParenFunc);
    constructor(source: string, arg1: string | ParenFuncArgNum, arg2: ParenFuncArgNum | ParenFunc, arg3?: ParenFunc) {
        if (arg3 !== undefined) {
            // 1st definiton
            const shown = arg1 as string;
            super(source, shown);
            this.argNum = arg2 as ParenFuncArgNum;
            this.fn = arg3;
        } else {
            // 2nd definition
            super(source, undefined);
            this.argNum = arg1 as ParenFuncArgNum;
            this.fn = arg2 as ParenFunc;
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
    pi: new ValuedTokenType("pi", "π", Math.PI),
    e: new ValuedTokenType("e", Math.E),

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
    reciprocal: new SuffixFuncTokenType("^-1", "⁻¹", (throwMath, x) => {
        if (x === 0) throwMath("Division by 0");
        return 1/x;
    }),
    fact: new SuffixFuncTokenType("!", (throwMath, x) => {
        if (!Number.isInteger(x)) throwMath("Cannot take the factorial of a non-integer");
        if (x < 0) throwMath("Cannot take the factorial of a negative value");
        if (x > 69) throwMath("Cannot take the factorial of an integer larger than 69 (too large)");

        let ans = 1;
        for (let k = 2; k <= x; ++k) {
            ans *= k;
        }
        return ans;
    }),

    cube: new SuffixFuncTokenType("^3", "³", (_, x) => Math.pow(x,3)),

    square: new SuffixFuncTokenType("^2", "²", (_, x) => Math.pow(x,2)),

    percentage: new SuffixFuncTokenType("%", (_, x) => x/100),

    // asD: new TokenType("asD", "°"),
    // asR: new TokenType("asR", "ʳ"),
    // asG: new TokenType("asG", "ᵍ"),
};

const parenFuncTokenTypes = {
    cbrt: new ParenFuncTokenType("cbrt(", "³√(", 1, (_, x) => Math.cbrt(x)),
    sqrt: new ParenFuncTokenType("sqrt(", "√(", 1, (throwMath, x) => {
        if (x < 0) throwMath("Cannot take the square root of negative value");
        return Math.sqrt(x);
    }),
    log: new ParenFuncTokenType("log(", [1,2], (throwMath, arg1, arg2) => {
        if (arg2 === undefined) {
            if (arg1 <= 0) throwMath("Cannot take the log of a non-positive value");
            return Math.log10(arg1);
        } else {
            if (arg1 == 1) throwMath("Base of log cannot be 1");
            if (arg1 <= 0) throwMath("Base of log cannot be non-positive");
            if (arg2 <= 0) throwMath("Cannot take the log of a non-positive value");
            return Math.log(arg2)/Math.log(arg1);
        }
    }),
    tenExp: new ParenFuncTokenType("10^(", 1, (_, x) => Math.pow(10, x)),
    ln: new ParenFuncTokenType("ln(", 1, (throwMath, x) => {
        if (x <= 0) throwMath("Cannot take the ln of a non-positive value");
        return Math.log(x)
    }),
    eExp: new ParenFuncTokenType("e^(", 1, (_, x) => Math.exp(x)),
    sin: new ParenFuncTokenType("sin(", 1, (_, x) => {
        // TODO
        return Math.sin(x)
    }),
    asin: new ParenFuncTokenType("asin(", "sin^-1(", 1, (_, x) => Math.asin(x)),
    sinh: new ParenFuncTokenType("sinh(", 1, (_, x) => Math.sinh(x)),
    asinh: new ParenFuncTokenType("asinh(", "sinh^-1(", 1, (_, x) => Math.asinh(x)),
    cos: new ParenFuncTokenType("cos(", 1, (_, x) => Math.cos(x)),
    acos: new ParenFuncTokenType("acos(", "cos^-1(", 1, (_, x) => Math.acos(x)),
    cosh: new ParenFuncTokenType("cosh(", 1, (_, x) => Math.cosh(x)),
    acosh: new ParenFuncTokenType("acosh(", "cosh^-1(", 1, (_, x) => Math.acosh(x)),
    tan: new ParenFuncTokenType("tan(", 1, (_, x) => Math.tan(x)),
    atan: new ParenFuncTokenType("atan(", "tan^-1(", 1, (_, x) => Math.atan(x)),
    tanh: new ParenFuncTokenType("tanh(", 1, (_, x) => Math.tanh(x)),
    atanh: new ParenFuncTokenType("atanh(", "tanh^-1(", 1, (_, x) => Math.atanh(x)),
    // TODO
    polar: new ParenFuncTokenType("Pol(", 2, (_, x, y) => {
        return Math.sqrt(x*x + y*y);
    }),
    rect: new ParenFuncTokenType("Rec(", 2, (_, r, theta) => {
        return r*Math.cos(theta);
    }),
    rnd: new ParenFuncTokenType("Rnd(", 1, (_, x) => Math.round(x)),
    abs: new ParenFuncTokenType("Abs(", 1, (_, x) => Math.abs(x)),
    openBracket: new ParenFuncTokenType("(", 1, (_, x) => x),
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

function throwSyntax(i: number, tokens: Token[], failedMessage: string): never {
    const pos = (i >= tokens.length) ? tokens.at(-1)!.sourceEnd : tokens[i]!.sourceStart;
    throw new RuntimeSyntaxError(pos, i, failedMessage);
}
function throwMath(i: number, tokens: Token[], failedMessage: string): never {
    const pos = (i >= tokens.length) ? tokens.at(-1)!.sourceEnd : tokens[i]!.sourceStart;
    throw new RuntimeMathError(pos, i, failedMessage);
}

enum Precedence {
    lowest = -999,
    comma = -2,
    closeBracket = -1, // don't really know if the order matters
    L1 = 1, //
    L2,
    L3,
    /** Precedence of +, - */
    L4,
    /** Precedence of *, div */
    L5,
    /** Precedence of permutation, combination, angle */
    L6,
    /** Precedence of omitted multiplication */
    L7,
    /** Precedence of x hat, y hat etc */
    L8,
    /** Precedence of neg */
    L9,
    /** Precedence of frac */
    L10,
    /** Precedence of suffix functions */
    L11,
}

function acceptLiteral(tokens: Token[], i: number): {
    value: number,
    newI: number,
} {
    function isInBound() {
        return i >= 0 && i < tokens.length;
    }
    function isTokenNumber(token: Token): boolean {
        return Object.values(literalTokenTypes).includes(token.type) && token.type !== literalTokenTypes.exp && token.type !== literalTokenTypes.dot;
    }
    function tokenToNumber(token: Token): number {
        return parseInt(token.source);
    }

    const NEG_TYPE = [ allTokenTypes.minus, allTokenTypes.neg ];
    const POS_TYPE = [ allTokenTypes.plus ];

    let significand = 0;
    let exp = 0;

    // ((xxxxx)(.xxxxxx))(E(-)xx)

    if (tokens[i]!.type === literalTokenTypes.exp) {
        significand = 1;
    }

    for (; isInBound() && isTokenNumber(tokens[i]!); ++i) {
        significand = significand * 10 + tokenToNumber(tokens[i]!);
    }
    // Decimal point
    if (isInBound() && tokens[i]!.type === literalTokenTypes.dot) {
        ++i;
        for (let j = 1; isInBound() && isTokenNumber(tokens[i]!); ++i, ++j) {
            significand += tokenToNumber(tokens[i]!) * Math.pow(10, -j);
        }
    }
    // Exponent
    if (isInBound() && tokens[i]!.type === literalTokenTypes.exp) {
        ++i;

        let sign = +1;
        for (; isInBound(); ++i) {
            if (NEG_TYPE.includes(tokens[i]!.type)) sign *= -1;
            else if (POS_TYPE.includes(tokens[i]!.type)) {}
            else break;
        }

        if (!(isInBound() && isTokenNumber(tokens[i]!))) throwSyntax(i, tokens, "Missing number after exp");
        exp = tokenToNumber(tokens[i]!);
        ++i;

        if (isInBound() && isTokenNumber(tokens[i]!)) {
            exp = exp * 10 + tokenToNumber(tokens[i]!);
            ++i;

            if (isInBound() && isTokenNumber(tokens[i]!)) throwSyntax(i, tokens, "Exponents cannot have more than 2 numbers");
        }

        exp *= sign;
    }

    if (isInBound() && tokens[i]!.type === literalTokenTypes.dot)
        throwSyntax(i, tokens, "Dot is not allowed in exponent or after another dot");
    if (isInBound() && tokens[i]!.type === literalTokenTypes.exp)
        throwSyntax(i, tokens, "Literal cannot have more than one Exp");

    return {
        value: significand * Math.pow(10, exp),
        newI: i-1,
    };
}

function evaluateExpression(tokens: Token[]) {
    /**
     * returns whether to propagate further in the stack
     */
    type Command = (cs: CommandStack, ns: NumericStack, pre: Precedence, throwSyntax: (message: string) => never, throwMath: (message: string) => never) => boolean;
    type CommandStack = {
        tokenType: TokenType | null,
        cmd: Command
    }[];
    type NumericStack = number[];

    const commandStack: CommandStack = [];
    const numericStack: NumericStack = [];

    function evalUntil(errorI: number, precedence: Precedence) {
        while (commandStack.length !== 0 && commandStack.at(-1)!.cmd(
            commandStack,
            numericStack,
            precedence,
            (msg) => throwSyntax(errorI, tokens, msg),
            (msg) => throwMath(errorI, tokens, msg),
        ));
    }

    function unaryCommand(cmdPrecedence: Precedence, fn: (throwSyntax: ThrowMsg, throwMath: ThrowMsg, x: number) => number): Command {
        return (cs, ns, pre, throwSyntax, throwMath) => {
            if (pre > cmdPrecedence) return false;
            if (ns.length === 0) throw new Error("Unary command expects at least one element in the numeric stack");
            ns.push(fn(throwSyntax, throwMath, ns.pop()!));
            cs.pop();
            return true;
        };
    }
    function binaryCommand(cmdPrecedence: Precedence, fn: (throwSyntax: ThrowMsg, throwMath: ThrowMsg, left: number, right: number) => number): Command {
        return (cs, ns, pre, throwSyntax, throwMath) => {
            if (pre > cmdPrecedence) return false;
            if (ns.length < 2) throw new Error("Binary command expects >=2 elemens in the numeric stack");
            const right = ns.pop()!;
            const left = ns.pop()!;
            ns.push(fn(throwSyntax, throwMath, left, right));
            cs.pop();
            return true;
        };
    }

    let expectNumber = true;
    for (let i = 0; i < tokens.length; ++i) {
        const cur = tokens[i]!;
        if (Object.values(literalTokenTypes).includes(cur.type)) {
            if (!expectNumber) throwSyntax(i, tokens, "Unexpected number");
            const {value, newI} = acceptLiteral(tokens, i);
            numericStack.push(value);
            i = newI;
            expectNumber = false;

        } else if (cur.type instanceof ValuedTokenType) {
            if (!expectNumber) {
                evalUntil(i, Precedence.L7);
                commandStack.push({
                    tokenType: null,
                    cmd: binaryCommand(Precedence.L7, (_, __, l, r) => l*r),
                });
            }
            numericStack.push(cur.type.fn());
            expectNumber = false;

        } else if (cur.type === allTokenTypes.plus) {
            if (expectNumber) {
                // nothing happens: more than 24 + does not cause STACK error
                expectNumber = true;
            } else {
                evalUntil(i, Precedence.L4);
                commandStack.push({
                    tokenType: allTokenTypes.plus,
                    cmd: binaryCommand(Precedence.L4, (_, __, left, right) => left + right),
                });
                expectNumber = true;
            }

        } else if (cur.type === allTokenTypes.minus || cur.type === allTokenTypes.neg) {
            if (expectNumber) {
                evalUntil(i, Precedence.L9);
                commandStack.push({
                    tokenType: allTokenTypes.neg,
                    cmd: unaryCommand(Precedence.L9, (_, __, x) => -x),
                });
                expectNumber = true;
            } else {
                if (cur.type === allTokenTypes.neg) throwSyntax(i, tokens, "Negative sign cannot follow a number");
                evalUntil(i, Precedence.L4);
                commandStack.push({
                    tokenType: allTokenTypes.minus,
                    cmd: binaryCommand(Precedence.L4, (_, __, left, right) => left - right),
                });
                expectNumber = true;
            }

        } else if (cur.type === allTokenTypes.multiply || cur.type === allTokenTypes.divide) {
            if (expectNumber) throwSyntax(i, tokens, "Expect number but found multiply or divide instead");
            evalUntil(i, Precedence.L5);
            const fn: (_: ThrowMsg, throwMath: ThrowMsg, left: number, right: number) => number = (() => {
                if (cur.type === allTokenTypes.multiply)
                    return (_: ThrowMsg, __: ThrowMsg, l: number, r: number) => l*r;
                else
                    return (_: ThrowMsg, throwMath: ThrowMsg, l: number, r: number) => {
                        if (r === 0) throwMath("Division by 0");
                        return l/r;
                    };
            })();
            commandStack.push({
                tokenType: cur.type,
                cmd: binaryCommand(Precedence.L5, fn),
            });
            expectNumber = true;

        } else if (cur.type === allTokenTypes.permutation || cur.type === allTokenTypes.combination) {
            if (expectNumber) throwSyntax(i, tokens, "Expect number but found permutation or combination instead");
            evalUntil(i, Precedence.L6);
            const isComb = cur.type === allTokenTypes.combination;
            commandStack.push({
                tokenType: cur.type,
                cmd: binaryCommand(Precedence.L6, (_, throwMath: ThrowMsg, n: number, r: number) => {
                    if (!Number.isInteger(n) || !Number.isInteger(r)) throwMath("n and r in nPr must be integer");
                    if (!(0 <= r)) throwMath("r cannot be negative in nPr");
                    if (!(r <= n)) throwMath("n must be no less than r in nPr");
                    if (!(n < Math.pow(10, 10))) throwMath("n must be less than 10^10 in nPr");

                    let ans = 1;
                    for (let k = 0; k < r; ++k) {
                        ans *= n-k;
                        if (isComb) ans /= k+1;
                    }
                    return ans;
                }),
            });
            expectNumber = true;

        } else if (cur.type === allTokenTypes.frac) {
            if (expectNumber) throwSyntax(i, tokens, "Expect number but found frac instead");
            evalUntil(i, Precedence.L10);
            if (commandStack.length > 0 && commandStack.at(-1)!.tokenType === allTokenTypes.frac) {
                if (commandStack.length > 1 && commandStack.at(-2)!.tokenType === allTokenTypes.frac) throwSyntax(i, tokens, "3 Frac not allowed");
                commandStack.push({
                    tokenType: cur.type,
                    cmd: (cs, ns, pre, _, throwMath) => {
                        if (pre === Precedence.L10) throw new Error("what? i thought 3 fracs are thrown already");
                        // Later frac evaluates first, then negative sign (L8), then this frac
                        if (pre >= Precedence.L9) return false;
                        if (ns.length < 3) throw new Error("Second frac command expects >=3 elements in the numeric stack");
                        cs.pop();
                        cs.pop();
                        const den = ns.pop()!;
                        const num = ns.pop()!;
                        const int = ns.pop()!;
                        if (den === 0) throwMath("Division by 0");
                        if (num === 0) ns.push(int);
                        else if (int === 0) ns.push(num/den);
                        else {
                            const sign = Math.sign(den) * Math.sign(num) * Math.sign(int);
                            const magnitude = Math.abs(int) + Math.abs(num) / Math.abs(den);
                            ns.push(sign * magnitude);
                        }
                        return true;
                    },
                });
            } else {
                commandStack.push({
                    tokenType: cur.type,
                    cmd: (cs, ns, pre, _, throwMath) => {
                        // If another frac appears later (L9), this should not evaluate
                        // Later frac evaluates first, then negative sign (L8), then this frac
                        if (pre >= Precedence.L9) return false;
                        if (ns.length < 2) throw new Error("Frac command expects >=2 elemens in the numeric stack");
                        const den = ns.pop()!;
                        const num = ns.pop()!;
                        if (den === 0) throwMath("Division by 0");
                        ns.push(num / den);
                        cs.pop();
                        return true;
                    },
                });
            }
            expectNumber = true;

        } else if (cur.type instanceof SuffixFuncTokenType) {
            if (expectNumber) throwSyntax(i, tokens, "Expect number but found suffix function instead");
            const fn = (cur.type as SuffixFuncTokenType).fn;
            commandStack.push({
                tokenType: cur.type,
                cmd: (cs, ns, pre, _, throwMath) => {
                    if (pre > Precedence.L11) return false; // delete this?
                    if (ns.length === 0) throw new Error("Suffix function command expects >=1 elements in the numeric stack");
                    const x = ns.pop()!;
                    ns.push(fn(throwMath, x));
                    cs.pop();
                    return true;
                },
            });
            evalUntil(i, Precedence.L11);
            expectNumber = false;

        } else if (cur.type instanceof ParenFuncTokenType) {
            if (!expectNumber) {
                evalUntil(i, Precedence.L7);
                commandStack.push({
                    tokenType: null,
                    cmd: binaryCommand(Precedence.L7, (_, __, l, r) => l*r),
                });
            }
            const oriNSLen = numericStack.length;
            const argNum = cur.type.argNum;
            const maxArgNum = (typeof argNum === "number") ? argNum : Math.max(...argNum);
            const fn = cur.type.fn;
            commandStack.push({
                tokenType: cur.type,
                cmd: (cs, ns, pre, throwSyntax, throwMath) => {
                    if (pre !== Precedence.comma && pre !== Precedence.closeBracket && pre !== Precedence.lowest) return false;

                    const curArgNum = ns.length - oriNSLen;
                    if (pre === Precedence.comma && curArgNum !== maxArgNum) return false;

                    const isArgNumAcceptable = (typeof argNum === "number") ? (curArgNum === argNum) : argNum.includes(curArgNum);
                    if ((pre === Precedence.closeBracket || Precedence.lowest) && !isArgNumAcceptable)
                        throwSyntax("Incorrect number of parenthetical function arguments");

                    const args: number[] = [];
                    for (let argI = 0; argI < curArgNum; ++argI) {
                        args.push(ns.pop()!);
                    }
                    args.reverse();

                    ns.push(fn(throwMath, ...args));
                    cs.pop();

                    if (pre === Precedence.closeBracket) return false;

                    return true;
                },
            });
            expectNumber = true;
        } else if (cur.type === allTokenTypes.comma) {
            if (expectNumber) throwSyntax(i, tokens, "Expect number but found comma instead");
            evalUntil(i, Precedence.comma);
            if (commandStack.length === 0 || !(commandStack.at(-1)!.tokenType instanceof ParenFuncTokenType))
                throwSyntax(i, tokens, "Found comma at top level");
            expectNumber = true;
        } else if (cur.type === allTokenTypes.closeBracket) {
            if (expectNumber) throwSyntax(i, tokens, "Expect number but found close bracket instead");
            if (!commandStack.some((cmdEl) => cmdEl.tokenType instanceof ParenFuncTokenType)) throwSyntax(i, tokens, "Found close bracket at top level");
            evalUntil(i, Precedence.closeBracket);
            expectNumber = false;
        } else {
            throw new Error("not supported token");
        }

        console.log(numericStack, commandStack);
    }
    if (expectNumber) {
        throwSyntax(tokens.length, tokens, "Expect number");
    }
    evalUntil(tokens.length, Precedence.lowest);

    return { numericStack, commandStack };
}
