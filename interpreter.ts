type InterpreterIO = {
    display: (context: Context, tokens: Token[], value: number, isDisp: boolean) => Promise<void>;
    prompt: (context: Context, varName: VariableName) => Promise<number>;
};

type ExecContext = {
    iter: TokenIterator;
    context: Context;
    io: InterpreterIO;
    tokenDisplayFrom: TokenIterator;
};

function expectNext(iter: TokenIterator, type: TokenType, failedMessage: string) {
    if (iter.isInBound() && iter.cur()!.type === type) {
        iter.next();
        return;
    }
    throwRuntime(RuntimeSyntaxError, iter, failedMessage);
}
function expectEnd(iter: TokenIterator, failedMessage: string) {
    if (!iter.isInBound() || iter.cur()!.type === programTokenTypes.separator || iter.cur()!.type === programTokenTypes.disp) {
        return;
    }
    throwRuntime(RuntimeSyntaxError, iter, failedMessage);
}

function acceptAssignment({ iter }: ExecContext): VariableName {
    expectNext(iter, programTokenTypes.assign, "Expects assignment");

    if (!iter.isInBound()) {
        throwRuntime(RuntimeSyntaxError, iter, "Assignment expects variable");
    }
    const varToken = iter.cur()!;
    if (!(varToken.type instanceof VariableTokenType)) {
        throwRuntime(RuntimeSyntaxError, iter, "Assignment expects variable");
    }
    if (varToken.type === variableTokenTypes.ans) {
        throwRuntime(RuntimeSyntaxError, iter, "Cannot perform assignment to Ans");
    }
    iter.next();
    expectEnd(iter, "Assignment expects ending after variable");
    return varToken.type.varName;
}
async function meetPromptToken(execContext: ExecContext): Promise<number> {
    const { context, iter, io, tokenDisplayFrom } = execContext;
    tokenDisplayFrom.i = iter.i;
    iter.next();
    const varName = acceptAssignment(execContext);
    const value = await io.prompt(context, varName);
    context.variables[varName] = value;
    return value;
}

async function meetExpressionToken(execContext: ExecContext): Promise<number> {
    const { context, iter } = execContext;
    const value = evaluateExpression(iter, context, false);
    context.variables.Ans = value;
    if (!iter.isInBound()) {
        return value;
    }

    const token = iter.cur()!;
    if (token.type === programTokenTypes.assign) {
        const varName = acceptAssignment(execContext);
        context.variables[varName] = value;
        return value;
    } else if (token.type === programTokenTypes.fatArrow) {
        return await meetFatArrowToken(execContext);
    } else return value;
}

async function meetFatArrowToken(execContext: ExecContext): Promise<number> {
    const { context, iter, tokenDisplayFrom } = execContext;
    iter.next();
    if (!iter.isInBound()) {
        throwRuntime(RuntimeSyntaxError, iter, "Fat arrow expects statement");
    }
    const token = iter.cur()!;
    if (context.variables.Ans === 0) {
        const ALLOWED_TOKEN_TYPES: TokenType[] = [
            ...Object.values(expressionTokenTypes),
            ...Object.values(setupTokenTypes),
            programTokenTypes.prompt,
            programTokenTypes.goto,
            programTokenTypes.lbl,
            programTokenTypes.break,
            programTokenTypes.to, // lmao
            programTokenTypes.step, // also this lol
        ];
        if (!Object.values(ALLOWED_TOKEN_TYPES).includes(token.type)) {
            throwRuntime(RuntimeSyntaxError, iter, "Unexpected token after fat arrow (a false result only accepts expression, setup, prompt, goto, lbl, break, to, step)");
        }

        while (iter.isInBound() && iter.cur()!.type !== programTokenTypes.separator && iter.cur()!.type !== programTokenTypes.disp) {
            iter.next();
        }

        if (!iter.isInBound()) return 0;
        if (iter.cur()!.type === programTokenTypes.separator) return 0;
        if (iter.cur()!.type === programTokenTypes.disp) {
            iter.next();
            tokenDisplayFrom.i = iter.i;
            if (iter.isInBound()) return await interpretCommand(execContext);
            else return 0;
        }
        throw new Error("Unreachable");

    } else {

        if (Object.values(expressionTokenTypes).includes(token.type)) {
            return await meetExpressionToken(execContext);
        } else if (Object.values(setupTokenTypes).includes(token.type)) {
            return await meetSetupToken(execContext);
        } else if (token.type === programTokenTypes.prompt) {
            return await meetPromptToken(execContext);
        } else if (token.type === programTokenTypes.goto) {
            return await meetGotoToken(execContext);
        } else if (token.type === programTokenTypes.lbl) {
            return await meetLblToken(execContext);
        } else if (token.type === programTokenTypes.break) {
            return await meetBreakToken(execContext);
        } else {
            throwRuntime(RuntimeSyntaxError, iter, "Unexpected token after fat arrow (a true result only accepts expression, setup, prompt, goto, lbl, break)");
        }
    }
}

async function meetSetupToken(_: ExecContext): Promise<number> {
    throw new Error("Unimplemented");
}
async function meetGotoToken(_: ExecContext): Promise<number> {
    throw new Error("Unimplemented");
}
async function meetLblToken(_: ExecContext): Promise<number> {
    throw new Error("Unimplemented");
}
async function meetBreakToken(_: ExecContext): Promise<number> {
    throw new Error("Unimplemented");
}

async function interpretCommand(execContext: ExecContext): Promise<number> {
    const { iter } = execContext;
    if (iter.cur()!.type === programTokenTypes.prompt) {
        return await meetPromptToken(execContext);
    } else if (Object.values(expressionTokenTypes).includes(iter.cur()!.type)) {
        return meetExpressionToken(execContext);
    } else {
        throwRuntime(RuntimeStackError, iter, "Unexpected token");
    }
}

async function interpret(tokens: Token[], context: Context, io: InterpreterIO) {
    if (tokens.length == 0) {
        throw new RuntimeSyntaxError(new SourcePosition(0, 0, 0), 0, "Empty program");
    }
    while (true) {
        const iter = new TokenIterator(tokens);

        const execContext: ExecContext = {
            iter,
            context,
            io,
            tokenDisplayFrom: new TokenIterator(tokens, 0),
        };

        while (iter.isInBound()) {
            execContext.tokenDisplayFrom.i = iter.i;

            const value = await interpretCommand(execContext);

            const tokensToBeDisplayed = tokens.slice(execContext.tokenDisplayFrom.i, iter.i);
            if (!iter.isInBound()) {
                await io.display(context, tokensToBeDisplayed, value, false);
            } else if (iter.cur()!.type === programTokenTypes.separator) {
                iter.next();
                if (!iter.isInBound()) {
                    await io.display(context, tokensToBeDisplayed, value, false);
                }
            } else if (iter.cur()!.type === programTokenTypes.disp) {
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

