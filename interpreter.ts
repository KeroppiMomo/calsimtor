type ExecContext = {
    iter: TokenIterator;
    context: Context;
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
async function meetPromptToken({ context, iter }: ExecContext): Promise<number> {
    iter.next();
    const varName = acceptAssignment({ context, iter });
    return await promptAssign(context, varName);
}
async function meetExpressionToken({ context, iter }: ExecContext): Promise<number> {
    const value = evaluateExpression(iter, context, false);
    context.variables.Ans = value;
    if (iter.isInBound() && iter.cur()!.type === programTokenTypes.assign) {
        const varName = acceptAssignment({ context, iter });
        context.variables[varName] = value;
    }
    return value;
}

async function interpret(tokens: Token[]) {
    try {
        const context = new Context();
        if (tokens.length == 0) {
            throw new RuntimeSyntaxError(new SourcePosition(0, 0, 0), 0, "Empty program");
        }
        while (true) {
            const iter = new TokenIterator(tokens);

            const execContext = { iter, context };

            while (iter.isInBound()) {
                const oriI = iter.i;
                let value: number;
                if (iter.cur()!.type === programTokenTypes.prompt) {
                    value = await meetPromptToken(execContext);
                } else if (Object.values(expressionTokenTypes).includes(iter.cur()!.type)) {
                    value = await meetExpressionToken(execContext);
                } else {
                    throwRuntime(RuntimeStackError, iter, "Unexpected token");
                }

                if (!iter.isInBound()) {
                    await display(tokens.slice(oriI, iter.i), value, false);
                } else if (iter.cur()!.type === programTokenTypes.separator) {
                    iter.next();
                    if (!iter.isInBound()) {
                        await display(tokens.slice(oriI, iter.i-1), value, false);
                    }
                } else if (iter.cur()!.type === programTokenTypes.disp) {
                    await display(tokens.slice(oriI, iter.i), value, true);
                    iter.next();
                    if (!iter.isInBound()) {
                        await display([], value, false);
                    }
                } else {
                    throwRuntime(RuntimeSyntaxError, iter, "Ending expected");
                }
            
            }
        }
    } catch (e: unknown) {
        if (e instanceof RuntimeError) {
            displayRuntimeError(e);
        } else {
            throw e;
        }
    }
}

