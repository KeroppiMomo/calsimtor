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

const allTokenTypes = {
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

    exp: new TokenType("E"),
    dot: new TokenType("."),

    varA: new VariableTokenType("A"),
    varB: new VariableTokenType("B"),
    varC: new VariableTokenType("C"),
    varD: new VariableTokenType("D"),
    varX: new VariableTokenType("X"),
    varY: new VariableTokenType("Y"),
    varM: new VariableTokenType("M"),
    ans: new VariableTokenType("Ans"),

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

    reciprocal: new TokenType("^-1", "⁻¹"),
    fact: new TokenType("!"),

    cube: new TokenType("^3", "³"),

    square: new TokenType("^2", "²"),

    percentage: new TokenType("%"),

    asD: new TokenType("asD", "°"),
    asR: new TokenType("asR", "ʳ"),
    asG: new TokenType("asG", "ᵍ"),

    eq: new TokenType("="),
    neq: new TokenType("<>", "≠"),
    greater: new TokenType(">"),
    less: new TokenType("<"),
    geq: new TokenType(">=", "≥"),
    leq: new TokenType("<=", "≤"),

    multiply: new TokenType("*"),
    divide: new TokenType("div", "÷"),

    permutation: new TokenType("Per", "𝐏"),
    combination: new TokenType("Com", "𝐂"),

    power: new TokenType("^("),
    root: new TokenType("rt(", "x√("),

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

    degMode: new TokenType("Deg"),
    radMode: new TokenType("Rad"),
    graMode: new TokenType("Gra"),
    fixMode: new TokenType("Fix", "Fix "),
    sciMode: new TokenType("Sci", "Sci "),
    normMode: new TokenType("Norm", "Norm "),
    freqOn: new TokenType("FreqOn"),
    freqOff: new TokenType("FreqOff"),

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

const digitTokenTypes = [
    allTokenTypes.num0,
    allTokenTypes.num1,
    allTokenTypes.num2,
    allTokenTypes.num3,
    allTokenTypes.num4,
    allTokenTypes.num5,
    allTokenTypes.num6,
    allTokenTypes.num7,
    allTokenTypes.num8,
    allTokenTypes.num9,
];
const literalTokenTypes = [
    ...digitTokenTypes,

    allTokenTypes.exp,
    allTokenTypes.dot,
];

const variableTokenTypes = [
    allTokenTypes.varA,
    allTokenTypes.varB,
    allTokenTypes.varC,
    allTokenTypes.varD,
    allTokenTypes.varX,
    allTokenTypes.varY,
    allTokenTypes.varM,
    allTokenTypes.ans,
];

const constantTokenTypes = [
    allTokenTypes.pi,
    allTokenTypes.e,

    allTokenTypes.massProton,
    allTokenTypes.massNeutron,
    allTokenTypes.massElectron,
    allTokenTypes.massMuon,

    allTokenTypes.bohrRadius,
    allTokenTypes.planckConst,
    allTokenTypes.nuclearMagneton,
    allTokenTypes.bohrMagneton,

    allTokenTypes.reducedPlankConst,
    allTokenTypes.fineStructureConst,
    allTokenTypes.classicalElectronRadius,
    allTokenTypes.comptonWavelength,

    allTokenTypes.protonGyromagnticRatio,
    allTokenTypes.protonComptonWavelength,
    allTokenTypes.neutronComptonWavelength,
    allTokenTypes.RydbergConst,

    allTokenTypes.atomicUnitConst,
    allTokenTypes.protonMagneticMoment,
    allTokenTypes.electronMagneticMoment,
    allTokenTypes.neutronMagneticMoment,

    allTokenTypes.muonMagneticMoment,
    allTokenTypes.faradayConst,
    allTokenTypes.elementaryCharge,
    allTokenTypes.avogadroConst,

    allTokenTypes.boltzmannConst,
    allTokenTypes.idealGasMolarVolume,
    allTokenTypes.molarGasConst,
    allTokenTypes.vacuumLightSpeed,

    allTokenTypes.firstRadiationConst,
    allTokenTypes.secondRadiationConst,
    allTokenTypes.stefanBoltzmannConst,
    allTokenTypes.electricConst,

    allTokenTypes.magneticConst,
    allTokenTypes.magneticFluxQuantum,
    allTokenTypes.gravitationalAccel,
    allTokenTypes.conductanceQuantum,

    allTokenTypes.characteristicVacuumImpedance,
    allTokenTypes.celsiusTemperature,
    allTokenTypes.gravitationalConst,
    allTokenTypes.atmosphere,
];

const suffixFuncTokenTypes = [
    allTokenTypes.reciprocal,
    allTokenTypes.fact,

    allTokenTypes.cube,

    allTokenTypes.square,

    allTokenTypes.percentage,

    allTokenTypes.asD,
    allTokenTypes.asR,
    allTokenTypes.asG,
];

const relationTokenTypes = [
    allTokenTypes.eq,
    allTokenTypes.neq,
    allTokenTypes.greater,
    allTokenTypes.less,
    allTokenTypes.geq,
    allTokenTypes.leq,
];

const infixFuncTokenTypes = [
    ...relationTokenTypes,

    allTokenTypes.multiply,
    allTokenTypes.divide,

    allTokenTypes.permutation,
    allTokenTypes.combination,
];

const infixParenTokenTypes = [
    allTokenTypes.power,
    allTokenTypes.root,
];

const parenFuncTokenTypes = [
    allTokenTypes.cbrt,
    allTokenTypes.sqrt,
    allTokenTypes.log,
    allTokenTypes.tenExp,
    allTokenTypes.ln,
    allTokenTypes.eExp,
    allTokenTypes.sin,
    allTokenTypes.asin,
    allTokenTypes.sinh,
    allTokenTypes.asinh,
    allTokenTypes.cos,
    allTokenTypes.acos,
    allTokenTypes.cosh,
    allTokenTypes.acosh,
    allTokenTypes.tan,
    allTokenTypes.atan,
    allTokenTypes.tanh,
    allTokenTypes.atanh,
    allTokenTypes.polar,
    allTokenTypes.rect,
    allTokenTypes.rnd,
    allTokenTypes.abs,
    allTokenTypes.openBracket,
];

const parenTokenTypes = [
    ...parenFuncTokenTypes,
    ...infixParenTokenTypes,
];

const expressionTokenTypes = [
    ...literalTokenTypes,
    ...variableTokenTypes,
    ...constantTokenTypes,
    ...suffixFuncTokenTypes,
    ...infixFuncTokenTypes,
    ...parenFuncTokenTypes,
    ...infixParenTokenTypes,

    allTokenTypes.ran,

    allTokenTypes.frac,

    allTokenTypes.neg,

    allTokenTypes.deg,

    allTokenTypes.closeBracket,

    allTokenTypes.comma,

    allTokenTypes.mPlus,
    allTokenTypes.mMinus,

    allTokenTypes.plus,
    allTokenTypes.minus,

    allTokenTypes.clrMemory,
];

const setupTokenTypes = [
    allTokenTypes.degMode,
    allTokenTypes.radMode,
    allTokenTypes.graMode,
    allTokenTypes.fixMode,
    allTokenTypes.sciMode,
    allTokenTypes.normMode,
    allTokenTypes.freqOn,
    allTokenTypes.freqOff,
];

const programTokenTypes = [
    ...setupTokenTypes,

    allTokenTypes.prompt,
    allTokenTypes.assign,
    allTokenTypes.separator,
    allTokenTypes.disp,
    allTokenTypes.fatArrow,
    allTokenTypes.goto,
    allTokenTypes.lbl,
    allTokenTypes.while,
    allTokenTypes.whileEnd,
    allTokenTypes.next,
    allTokenTypes.break,
    allTokenTypes.for,
    allTokenTypes.to,
    allTokenTypes.step,
    allTokenTypes.else,
    allTokenTypes.ifEnd,
    allTokenTypes.if,
    allTokenTypes.then,
];
