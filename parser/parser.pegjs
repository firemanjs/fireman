Path
  = PathComponent+

PathComponent
  = component:(AllWildcard/Literal/PathExpression) "/"? {
      return component;
    }

Literal
  = value:Identifier {
      return {
          type: 'literal',
          value: value,
        };
    }

AllWildcard
  = "*" {
      return {
          type: 'all'
      };
    }

_ "whitespace"
  = [ \t\n\r]*

UnQuotedIdentifier
  = $[^\/\{\} ,\^_]+

QuotedIdentifier
  = DoubleQuotedIdentifier / SingleQuotedIdentifier

DoubleQuotedIdentifier
  = DoubleQuote chars:(((Escape s:('"') {return s;})/[^\/"])+) DoubleQuote {
      return chars.join('');
    }

SingleQuotedIdentifier
  = SingleQuote chars:(((Escape s:("'") {return s;})/[^\/'])+) SingleQuote {
      return chars.join('');
    }

DoubleQuote = '"'

SingleQuote = "'"

Escape = "\\"

Identifier
  = QuotedIdentifier / UnQuotedIdentifier

WhereOperator
  = "==" / "<" / ">" / "<=" / ">=" / "has"

WhereClause
  = _ field:Identifier _ operator:WhereOperator _ value:WhereValue _ {
      return {
        type: 'where',
        field: field,
        value: value,
        operator: operator,
      };
    }

WhereValue
  = True / False / Null / String / Number

String
   = SingleQuotedString / DoubleQuotedString

SingleQuotedString
  = SingleQuote content:((Escape s:("'") {return s;})/[^']+) SingleQuote {
      return content.join('');
    }

DoubleQuotedString
  = DoubleQuote content:((Escape s:('"') {return s;})/[^"]+) DoubleQuote {
      return content.join('');
    }

False = "false" { return false; }
Null  = "null"  { return null;  }
True  = "true"  { return true;  }

Number
  = Minus? Int Frac? Exp? { return parseFloat(text()); }

Exp
  = [eE] (Minus / Plus)? Digit+

Frac
  = "." Digit+

Int
  = "0" / ([1-9] Digit*)

Minus
  = "-"

Plus
  = "+"

Digit
  = [0-9]

OrderClause
  = orderSymbol:("^" / "_") field:Identifier {
      return {
          type: 'order',
          direction: orderSymbol === "^" ? 1 : -1,
          field: field,
        };
    }

PathExpression
  = '{' _ components:(PathExpressionComponent+) _ '}' {
      return {
          type: 'expression',
          components: components,
        };
    }

PathExpressionComponent
  = component:(WhereClause / OrderClause) _ ","? _ {
      return component;
    }


