Path
  = "/"? path: PathComponent+ "/"? {
    return path;
  }

PathComponent
  = component: (AllWildcard/Literal/CollectionExpression/DocumentExpression) "/"? {
      return component;
    }

Literal
  = value:Identifier {
      return {
          type: 'literal',
          value: value,
        };
    }

DocumentExpression
  = '{' _ components:(DocumentExpressionComponent+) _ '}' {
        return {
            type: 'documentExpression',
            components: components,
          };
      }

DocumentExpressionComponent
  = component:(Identifier) _ ","? _ {
      return component;
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
  = $[^\/\{\}\[\]\<\>\= ,\^_.]+

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
  =  "has" / "==" / "<=" / ">=" / "<" / ">"

WhereClause
  = _ field:Identifier _ operator:WhereOperator _ value:WhereValue _ {
      return {
        type: 'where',
        field: field,
        value: value,
        operator: operator === 'has' ? 'array-contains' : operator,
      };
    }

WhereValue
  = True / False / Null / Number / String

String
   = SingleQuotedString / DoubleQuotedString / Literal

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

LimitClause
  = "#" _ limit:Number {
      return {
          type: 'limit',
          limit: limit,
        };
    }


OrderClause
  = orderSymbol:("^" / "_") field:Identifier {
      return {
          type: 'order',
          direction: orderSymbol === "^" ? 1 : -1,
          field: field,
        };
    }

CollectionExpression
  = '[' _ components:(PathExpressionComponent+) _ ']' {
      return {
          type: 'collectionExpression',
          components: components,
        };
    }

PathExpressionComponent
  = component:(OrderClause / LimitClause / WhereClause) _ ","? _ {
      return component;
    }


