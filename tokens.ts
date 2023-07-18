class TokenType {
    source: string;
    shown: string;

    constructor(source: string, shown?: string) {
        this.source = source;
        this.shown = shown ?? source;
    }
}

class DigitTokenType extends TokenType {
    constructor(public value: number) {
        super(value.toString());
    }
}
class VariableTokenType extends TokenType {
    constructor(public varName: VariableName) {
        super(varName);
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

const constantTokenTypes = {
    pi: new TokenType("pi", "π"),
    e: new TokenType("e"),

    massProton: new TokenType("mp", "m_p"),
    massNeutron: new TokenType("mn", "m_n"),
    massElectron: new TokenType("me", "m_e"),
    massMuon: new TokenType("mmu", "m_μ"),

    bohrRadius: new TokenType("a0", "a_0"),
    planckConst: new TokenType("h"),
    nuclearMagneton: new TokenType("muN", "μ_N"),
    bohrMagneton: new TokenType("muB", "μ_B"),

    reducedPlankConst: new TokenType("hbar", "ħ"),
    fineStructureConst: new TokenType("alpha", "α"),
    classicalElectronRadius: new TokenType("re", "r_e"),
    comptonWavelength: new TokenType("lambdap", "λ_c"),

    protonGyromagnticRatio: new TokenType("gammap", "γ_p"),
    protonComptonWavelength: new TokenType("lambdacp", "λ_cp"),
    neutronComptonWavelength: new TokenType("lambdacn", "λ_cn"),
    RydbergConst: new TokenType("Rinf", "R_∞"),

    atomicUnitConst: new TokenType("u"),
    protonMagneticMoment: new TokenType("mup", "μ_p"),
    electronMagneticMoment: new TokenType("mue", "μ_e"),
    neutronMagneticMoment: new TokenType("mun", "μ_n"),

    muonMagneticMoment: new TokenType("mumu", "μ_μ"),
    faradayConst: new TokenType("F"),
    elementaryCharge: new TokenType("eC", "𝑒"),
    avogadroConst: new TokenType("NA", "N_A"),

    boltzmannConst: new TokenType("k"),
    idealGasMolarVolume: new TokenType("Vm", "V_m"),
    molarGasConst: new TokenType("R"),
    vacuumLightSpeed: new TokenType("c0", "c_0"),

    firstRadiationConst: new TokenType("c1", "c_1"),
    secondRadiationConst: new TokenType("c2", "c_2"),
    stefanBoltzmannConst: new TokenType("sigma", "σ"),
    electricConst: new TokenType("epsilon0", "ε_0"),

    magneticConst: new TokenType("mu0", "μ_0"),
    magneticFluxQuantum: new TokenType("phi0", "phi_0"),
    gravitationalAccel: new TokenType("g"),
    conductanceQuantum: new TokenType("G0", "G_0"),

    characteristicVacuumImpedance: new TokenType("Z0", "Z_0"),
    celsiusTemperature: new TokenType("t"),
    gravitationalConst: new TokenType("G"),
    atmosphere: new TokenType("atm"),
};

const suffixFuncTokenTypes = {
    reciprocal: new TokenType("^-1", "⁻¹"),
    fact: new TokenType("!"),

    cube: new TokenType("^3", "³"),

    square: new TokenType("^2", "²"),

    percentage: new TokenType("%"),

    asD: new TokenType("asD", "°"),
    asR: new TokenType("asR", "ʳ"),
    asG: new TokenType("asG", "ᵍ"),
};

const relationTokenTypes = {
    eq: new TokenType("="),
    neq: new TokenType("<>", "≠"),
    greater: new TokenType(">"),
    less: new TokenType("<"),
    geq: new TokenType(">=", "≥"),
    leq: new TokenType("<=", "≤"),
};

const infixFuncTokenTypes = {
    ...relationTokenTypes,

    multiply: new TokenType("*"),
    divide: new TokenType("div", "÷"),

    permutation: new TokenType("Per", "𝐏"),
    combination: new TokenType("Com", "𝐂"),
};

const infixParenTokenTypes = {
    power: new TokenType("^("),
    root: new TokenType("rt(", "x√("),
};

const parenFuncTokenTypes = {
    cbrt: new TokenType("cbrt(", "³√("),
    sqrt: new TokenType("sqrt(", "√("),
    log: new TokenType("log("),
    tenExp: new TokenType("10^("),
    ln: new TokenType("ln("),
    eExp: new TokenType("e^("),
    sin: new TokenType("sin("),
    asin: new TokenType("asin(", "sin^-1("),
    sinh: new TokenType("sinh("),
    asinh: new TokenType("asinh(", "sinh^-1("),
    cos: new TokenType("cos("),
    acos: new TokenType("acos(", "cos^-1("),
    cosh: new TokenType("cosh("),
    acosh: new TokenType("acosh(", "cosh^-1("),
    tan: new TokenType("tan("),
    atan: new TokenType("atan(", "tan^-1("),
    tanh: new TokenType("tanh("),
    atanh: new TokenType("atanh(", "tanh^-1("),
    polar: new TokenType("Pol("),
    rect: new TokenType("Rec("),
    rnd: new TokenType("Rnd("),
    abs: new TokenType("Abs("),
    openBracket: new TokenType("("),
};

const parenTokenTypes = {
    ...parenFuncTokenTypes,
    ...infixParenTokenTypes,
};

const expressionTokenTypes = {
    ...literalTokenTypes,
    ...variableTokenTypes,
    ...constantTokenTypes,
    ...suffixFuncTokenTypes,
    ...infixFuncTokenTypes,
    ...parenFuncTokenTypes,
    ...infixParenTokenTypes,

    ran: new TokenType("Ran#"),

    frac: new TokenType("/", "┘"),

    neg: new TokenType("neg", "-"),

    deg: new TokenType("deg", "°"),

    closeBracket: new TokenType(")"),

    comma: new TokenType(","),

    mPlus: new TokenType("M+"),
    mMinus: new TokenType("M-"),

    plus: new TokenType("+"),
    minus: new TokenType("-"),

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
