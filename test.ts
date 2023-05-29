type TestCase = () => boolean;
type TestCases = TestCase | TestCases[] | { [name: string]: TestCases };

function testInput(input: string) {
    return () => {
        const { tokens, errorPosition } = lexicalize(input, expressionTokenTypes);
        if (errorPosition.length !== 0) throw new Error("Lexicalization fails");
        return evaluateExpression(tokens);
    };
}
function expectNumber(test: () => number, answer: number): () => boolean {
    return () => {
        try {
            const output = test();
            if (output !== answer) {
                console.log(`Expects ${answer} but instead outputs:`, output);
                return false;
            }
            return true;
        } catch (err) {
            console.log(`Expects ${answer} but instead throws error:`, err);
            return false;
        }
    };
}
function expectError(test: () => number, errorType: typeof RuntimeError, tokenI: number): () => boolean {
    return () => {
        try {
            const output = test();
            console.log(`Expects ${errorType.name} but instead outputs:`, output);
            return false;
        } catch (err: any) {
            if (err instanceof errorType) {
                if (err.tokenI === tokenI) return true;
                else {
                    console.log(`Expect ${errorType.name} error at token index ${tokenI} but instead it is thrown at ${err.tokenI}`);
                    return false
                }
            } else {
                console.log(`Expects ${errorType.name} error but instead throws ${err.constructor.name} error:`, err);
                return false;
            }
        }
    };
}

const allTestCases: TestCases = {
    literal: {
        digits: [
            ...Array(10).fill(0).map((_, i) => expectNumber(testInput(i.toString()), i)),
            expectNumber(testInput("123"), 123),
        ],
        decimal: [
            expectNumber(testInput("."), 0),
            expectNumber(testInput(".12"), 0.12), // fix later
            expectNumber(testInput("56."), 56),
            expectNumber(testInput("123.4567"), 123.4567),
        ],
        exponent: {
            range: [
                expectError(testInput("E"), RuntimeSyntaxError, 1),
                expectNumber(testInput("E6"), 1e6),
                expectNumber(testInput("E98"), 1e98),
                expectNumber(testInput("E99"), 1e99),
                expectError(testInput("E100"), RuntimeSyntaxError, 3),
                expectError(testInput(".5E100"), RuntimeSyntaxError, 5),
                expectError(testInput("6E12345"), RuntimeSyntaxError, 4),
            ],
            withSignificand: [
                expectNumber(testInput("34E2"), 3400),
                expectNumber(testInput("34.E2"), 3400),
                expectNumber(testInput("3.4E9"), 34e8),
                expectNumber(testInput(".34E9"), 34e7),
                expectNumber(testInput("56E98"), 56e98),
            ],
            sign: [
                expectNumber(testInput("123E+45"), 123e45),
                expectNumber(testInput("123E-45"), 123e-45),
                expectNumber(testInput("123E-+45"), 123e-45),
                expectNumber(testInput("123E+++45"), 123e45),
                expectNumber(testInput("123E--45"), 123e45),
                expectNumber(testInput("123E---45"), 123e-45),
                expectNumber(testInput("123E+-+++--+45"), 123e-45),
                expectNumber(testInput("123E+++++++++++++++++++++++++++++++++++++++++++++++45"), 123e45),
                expectNumber(testInput("123E-----------------------------------------------45"), 123e-45), // does not overflow command stack
            ],
        },
    },
    valued: {
        constants: [
            expectNumber(testInput("pi"), 3.1415926535898),
            expectNumber(testInput("e"), 2.71828182845904),
            expectNumber(testInput("muB"), 9.274_009_68e-24),
        ],
        omittedMultiplication: [
            expectNumber(testInput("5pi"), 15.707963267949),
            expectNumber(testInput("3E4 pi^2"), 296_088.132_032_682),
        ],
    },
    plusMinus: {
        prefix: [
            expectNumber(testInput("2*+3"), 6),
            expectNumber(testInput("2*+++++3"), 6),
            expectNumber(testInput("2+-3"), -1),
            expectNumber(testInput("-2--8"), 6),
            expectNumber(testInput("-3*-5"), 15),
        ],
    },
};

function test(cases: TestCases) {
    if (cases instanceof Array) { // []
        for (let i=0; i < cases.length; ++i) {
            console.group(`Test ${i}`);
            test(cases[i]!);
            console.groupEnd();
        }
    } else if (typeof cases === "object") { // {}
        for (const name in cases) {
            console.group(name);
            test(cases[name]!);
            console.groupEnd();
        }
    } else if (typeof cases === "function") { // TestCase
        if (cases()) {
            console.log("%cPassed", "color:green");
        } else {
            console.log("%c      Failed!      ", "color:white;background-color:red;font-weight:bold");
        }
    } else {
        throw new Error("???");
    }
}

function testAll() {
    test(allTestCases);
}

testAll();
