import {Token, SourcePosition} from "./token";
import {TokenType, allTokenTypes} from "./token-types";

export type LexicalizationResult = {
    tokens: Token[];
    errorPosition: SourcePosition[];
};
export function lexicalize(source: string, tokenSet: TokenType[]=Object.values(allTokenTypes)): LexicalizationResult {
    const tokens = [];
    const errorPosition = [];
    let curLine = 0;
    let curColumn = 0;
    for (let i = 0; i < source.length;) {
        if (source[i] === " ") {
            i++;
            curColumn++;
            continue;
        } else if (source[i] === "\n") {
            curColumn = 0;
            curLine++;
            i++;
            continue;
        }

        let matched = null;
        for (const type of tokenSet) {
            const n = type.source.length;
            if (source.substr(i, n) === type.source && (matched == null || n > matched.source.length)) {
                matched = type;
            }
        }
        if (!matched) {
            errorPosition.push(new SourcePosition(i, curLine, curColumn));
            i++;
            curColumn++;
            continue;
        }
        tokens.push(new Token(
            matched,
            new SourcePosition(i, curLine, curColumn),
            new SourcePosition(i+matched.source.length, curLine, curColumn+matched.source.length)
        ));
        i += matched.source.length;
        curColumn += matched.source.length;
    }

    return {
        tokens,
        errorPosition,
    };
}
