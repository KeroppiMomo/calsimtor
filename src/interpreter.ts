import {Context, VariableName} from "./context";
import {evaluateExpression, throwRuntime} from "./expression";
import {RuntimeError, RuntimeSyntaxError, RuntimeArgumentError, RuntimeGotoError, RuntimeStackError} from "./runtime-error";
import {Token, SourcePosition, TokenIterator} from "./token";
import {TokenType, allTokenTypes, VariableTokenType, expressionTokenTypes, setupTokenTypes, digitTokenTypes} from "./token-types";

export type InterpreterIO = {
    display: (context: Context, tokens: Token[], value: number, isDisp: boolean) => Promise<void>;
    prompt: (context: Context, varName: VariableName) => Promise<number>;
};

export type ExecContext = {
    iter: TokenIterator;
    context: Context;
    io: InterpreterIO;
    value: number;
    tokenDisplayFrom: TokenIterator;
};

function expectNext(iter: TokenIterator, type: TokenType, failedMessage: string, ErrorClass?: typeof RuntimeError): TokenType;
function expectNext(iter: TokenIterator, types: TokenType[], failedMessage: string, ErrorClass?: typeof RuntimeError): TokenType;
function expectNext(iter: TokenIterator, types: Record<string, TokenType>, failedMessage: string, ErrorClass?: typeof RuntimeError): TokenType;
function expectNext(iter: TokenIterator, arg: TokenType | TokenType[] | Record<string, TokenType>, failedMessage: string, ErrorClass: typeof RuntimeError = RuntimeSyntaxError): TokenType {
    const types: TokenType[] = (() => {
        if (Array.isArray(arg)) return arg;
        if (arg instanceof TokenType) return [arg];
        return Object.values(arg);
    })();
    if (iter.isInBound()) {
        const curType = iter.cur()!.type;
        if (iter.isInBound() && types.includes(curType)) {
            iter.next();
            return curType;
        }
    }
    throwRuntime(ErrorClass, iter, failedMessage);
}
function expectEnd(iter: TokenIterator, failedMessage: string, ErrorClass: typeof RuntimeError = RuntimeSyntaxError) {
    if (!iter.isInBound() || iter.cur()!.type === allTokenTypes.separator || iter.cur()!.type === allTokenTypes.disp) {
        return;
    }
    throwRuntime(ErrorClass, iter, failedMessage);
}

function acceptAssignment({ iter }: ExecContext): VariableName {
    expectNext(iter, allTokenTypes.assign, "Expects assignment");

    if (!iter.isInBound()) {
        throwRuntime(RuntimeSyntaxError, iter, "Assignment expects variable");
    }
    const varToken = iter.cur()!;
    if (!(varToken.type instanceof VariableTokenType)) {
        throwRuntime(RuntimeSyntaxError, iter, "Assignment expects variable");
    }
    if (varToken.type === allTokenTypes.ans) {
        throwRuntime(RuntimeSyntaxError, iter, "Cannot perform assignment to Ans");
    }
    iter.next();
    expectEnd(iter, "Assignment expects ending after variable");
    return varToken.type.varName;
}
async function meetPromptToken(execContext: ExecContext): Promise<void> {
    const { context, iter, io, tokenDisplayFrom } = execContext;
    tokenDisplayFrom.i = iter.i;
    iter.next();
    const varName = acceptAssignment(execContext);
    const value = await io.prompt(context, varName);
    context.variables[varName] = value;
    execContext.value = value;
}

async function meetExpressionToken(execContext: ExecContext): Promise<void> {
    const { context, iter } = execContext;
    const value = evaluateExpression(iter, context, false);
    context.variables.Ans = value;
    execContext.value = value;
    if (!iter.isInBound()) return;

    const token = iter.cur()!;
    if (token.type === allTokenTypes.assign) {
        const varName = acceptAssignment(execContext);
        context.variables[varName] = value;
    } else if (token.type === allTokenTypes.fatArrow) {
        await meetFatArrowToken(execContext);
    } else return;
}

async function meetFatArrowToken(execContext: ExecContext): Promise<void> {
    const { context, iter, tokenDisplayFrom } = execContext;
    iter.next();
    if (!iter.isInBound()) {
        throwRuntime(RuntimeSyntaxError, iter, "Fat arrow expects statement");
    }
    const token = iter.cur()!;
    if (context.variables.Ans === 0) {
        const ALLOWED_TOKEN_TYPES: TokenType[] = [
            ...expressionTokenTypes,
            ...setupTokenTypes,
            allTokenTypes.prompt,
            allTokenTypes.goto,
            allTokenTypes.lbl,
            allTokenTypes.break,
            allTokenTypes.to, // lmao
            allTokenTypes.step, // also this lol
        ];
        if (!ALLOWED_TOKEN_TYPES.includes(token.type)) {
            throwRuntime(RuntimeSyntaxError, iter, "Unexpected token after fat arrow (a false result only accepts expression, setup, prompt, goto, lbl, break, to, step)");
        }

        while (iter.isInBound() && iter.cur()!.type !== allTokenTypes.separator && iter.cur()!.type !== allTokenTypes.disp) {
            iter.next();
        }

        if (!iter.isInBound()) return;
        if (iter.cur()!.type === allTokenTypes.separator) return;
        if (iter.cur()!.type === allTokenTypes.disp) {
            iter.next();
            tokenDisplayFrom.i = iter.i;
            if (iter.isInBound()) await interpretCommand(execContext);
            return;
        }
        throw new Error("Unreachable");

    } else {

        if (expressionTokenTypes.includes(token.type)) {
            await meetExpressionToken(execContext);
        } else if (setupTokenTypes.includes(token.type)) {
            await meetSetupToken(execContext);
        } else if (token.type === allTokenTypes.prompt) {
            await meetPromptToken(execContext);
        } else if (token.type === allTokenTypes.goto) {
            await meetGotoToken(execContext);
        } else if (token.type === allTokenTypes.lbl) {
            await meetLblToken(execContext);
        } else if (token.type === allTokenTypes.break) {
            await meetBreakToken(execContext);
        } else {
            throwRuntime(RuntimeSyntaxError, iter, "Unexpected token after fat arrow (a true result only accepts expression, setup, prompt, goto, lbl, break)");
        }
    }
}

async function meetLblToken(execContext: ExecContext): Promise<void> {
    const { iter } = execContext;
    iter.next();
    expectNext(iter, digitTokenTypes, "Expects 0-9 after Lbl", RuntimeArgumentError);
    expectEnd(iter, "Lbl expects ending after 0-9", RuntimeArgumentError);
}
async function meetGotoToken(execContext: ExecContext): Promise<void> {
    const { context, iter, io, tokenDisplayFrom } = execContext;
    const tokens = iter.tokens;
    iter.next();
    const labelTokenType = expectNext(iter, digitTokenTypes, "Expects 0-9 after Goto", RuntimeArgumentError);
    expectEnd(iter, "Goto expects ending after 0-9", RuntimeArgumentError);
    if (iter.isInBound() && iter.cur()!.type === allTokenTypes.disp) {
        await io.display(context, tokens.slice(tokenDisplayFrom.i, iter.i), execContext.value, true);
    }

    const jumpI = tokens.findIndex((token, i) => i < tokens.length-1 && token.type === allTokenTypes.lbl && tokens[i+1]!.type === labelTokenType);
    if (jumpI === -1) {
        iter.prev();
        throwRuntime(RuntimeGotoError, iter, "Label not found");
    }

    iter.i = jumpI;
    tokenDisplayFrom.i = jumpI;
    await interpretCommand(execContext);
}

async function meetSetupToken(_: ExecContext): Promise<void> {
    throw new Error("Unimplemented");
}
async function meetBreakToken(_: ExecContext): Promise<void> {
    throw new Error("Unimplemented");
}

async function interpretCommand(execContext: ExecContext): Promise<void> {
    const { iter } = execContext;
    if (iter.cur()!.type === allTokenTypes.prompt) {
        await meetPromptToken(execContext);
    } else if (expressionTokenTypes.includes(iter.cur()!.type)) {
        await meetExpressionToken(execContext);
    } else if (iter.cur()!.type === allTokenTypes.fatArrow) {
        throwRuntime(RuntimeSyntaxError, iter, "Fat arrow can only be used after expression");
    } else if (iter.cur()!.type === allTokenTypes.lbl) {
        await meetLblToken(execContext);
    } else if (iter.cur()!.type === allTokenTypes.goto) {
        await meetGotoToken(execContext);
    } else {
        throwRuntime(RuntimeStackError, iter, "Unexpected token");
    }
}

export async function interpret(tokens: Token[], context: Context, io: InterpreterIO) {
    if (tokens.length == 0) {
        throw new RuntimeSyntaxError(new SourcePosition(0, 0, 0), 0, "Empty program");
    }
    while (true) {
        const iter = new TokenIterator(tokens);

        const execContext: ExecContext = {
            iter,
            context,
            io,
            value: 0,
            tokenDisplayFrom: new TokenIterator(tokens, 0),
        };

        while (iter.isInBound()) {
            execContext.tokenDisplayFrom.i = iter.i;

            await interpretCommand(execContext);

            const tokensToBeDisplayed = tokens.slice(execContext.tokenDisplayFrom.i, iter.i);
            const value = execContext.value;
            if (!iter.isInBound()) {
                await io.display(context, tokensToBeDisplayed, value, false);
            } else if (iter.cur()!.type === allTokenTypes.separator) {
                iter.next();
                if (!iter.isInBound()) {
                    await io.display(context, tokensToBeDisplayed, value, false);
                }
            } else if (iter.cur()!.type === allTokenTypes.disp) {
                await io.display(context, tokensToBeDisplayed, value, true);
                iter.next();
                if (!iter.isInBound()) {
                    await io.display(context, [], value, false);
                }
            } else {
                throwRuntime(RuntimeSyntaxError, iter, "Ending expected");
            }

        }
    }
}

